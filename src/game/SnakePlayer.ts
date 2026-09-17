import * as Phaser from "phaser";
import {
  BASE_SPEED,
  COLOR,
  DEFAULT_SEGMENT_COUNT,
  HEAD_RADIUS,
  HISTORY_STRIDE,
  SEGMENT_RADIUS,
  WORLD_SIZE,
} from "./constants";
import { defaultLoadout, type AimPoint, type FireEvent, type Weapon } from "./Weapon";

type HistoryPoint = { x: number; y: number };

const BLADE_ORBIT = 34;
const BLADE_RADIUS = 11;
const BLASTER_SPEED = 520;
const TURRET_SPEED = 460;

export class SnakePlayer {
  readonly head: Phaser.GameObjects.Container;
  readonly segments: Phaser.GameObjects.Container[] = [];
  readonly positionHistory: HistoryPoint[] = [];
  readonly weapons: Weapon[];

  speed = BASE_SPEED;
  facing = 0;
  vx = 0;
  vy = 0;

  private readonly scene: Phaser.Scene;
  private readonly historyStride: number;
  private readonly headGlow: Phaser.GameObjects.Arc;
  private readonly snout: Phaser.GameObjects.Triangle;
  private readonly blades: Phaser.GameObjects.Rectangle[] = [];
  private bladeAngle = 0;
  private readonly fire: (ev: FireEvent) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    fire: (ev: FireEvent) => void,
    segmentCount = DEFAULT_SEGMENT_COUNT,
  ) {
    this.scene = scene;
    this.historyStride = HISTORY_STRIDE;
    this.fire = fire;
    this.weapons = defaultLoadout();

    this.head = scene.add.container(x, y);
    this.head.setDepth(20);

    this.headGlow = scene.add.circle(0, 0, HEAD_RADIUS + 7, COLOR.head, 0.12);
    const headBody = scene.add.circle(0, 0, HEAD_RADIUS, COLOR.head);
    headBody.setStrokeStyle(2, 0xffffff, 0.18);
    this.snout = scene.add.triangle(
      HEAD_RADIUS * 0.55,
      0,
      0,
      -7,
      14,
      0,
      0,
      7,
      COLOR.snout,
    );
    const eyeY = scene.add.circle(4, -5, 2.4, COLOR.eye);
    const eyeX = scene.add.circle(4, 5, 2.4, COLOR.eye);
    this.head.add([this.headGlow, headBody, this.snout, eyeY, eyeX]);

    const maxHistory = (segmentCount + 4) * this.historyStride + 48;
    for (let i = maxHistory - 1; i >= 0; i--) {
      this.positionHistory.push({
        x: x - i * 3.2,
        y,
      });
    }

    for (let i = 0; i < segmentCount; i++) {
      this.spawnSegment();
    }
    this.layoutSegments();
    this.attachMounts();
  }

  get x() {
    return this.head.x;
  }

  get y() {
    return this.head.y;
  }

  getRadius() {
    return HEAD_RADIUS;
  }

  getParts(): { x: number; y: number; r: number }[] {
    const parts = [{ x: this.head.x, y: this.head.y, r: HEAD_RADIUS }];
    for (const seg of this.segments) {
      parts.push({ x: seg.x, y: seg.y, r: SEGMENT_RADIUS });
    }
    return parts;
  }

  addSegment() {
    this.spawnSegment();
    this.ensureHistoryCapacity();
    this.layoutSegments();
  }

  update(dt: number, ax: number, ay: number, now: number, aim: AimPoint | null, combatOn: boolean) {
    const moving = ax !== 0 || ay !== 0;
    if (moving) {
      this.facing = Math.atan2(ay, ax);
      this.vx = ax * this.speed;
      this.vy = ay * this.speed;
      const nextX = Phaser.Math.Clamp(
        this.head.x + this.vx * dt,
        HEAD_RADIUS + 8,
        WORLD_SIZE - HEAD_RADIUS - 8,
      );
      const nextY = Phaser.Math.Clamp(
        this.head.y + this.vy * dt,
        HEAD_RADIUS + 8,
        WORLD_SIZE - HEAD_RADIUS - 8,
      );
      this.head.setPosition(nextX, nextY);
      this.positionHistory.push({ x: nextX, y: nextY });
      this.trimHistory();
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    this.head.setRotation(this.facing);
    const pulse = 1 + Math.sin(this.scene.time.now / 280) * 0.04;
    this.headGlow.setScale(pulse);

    this.layoutSegments();
    this.updateBlades(dt);
    if (combatOn) this.tickWeapons(now, aim);
  }

  bladeHits(
    dummyX: number,
    dummyY: number,
    dummyR: number,
    now: number,
  ): number {
    const weapon = this.weapons.find((w) => w.type === "blade");
    if (!weapon || now - weapon.lastFired < weapon.fireRate) return 0;
    for (const blade of this.blades) {
      const dx = blade.x - dummyX;
      const dy = blade.y - dummyY;
      const need = BLADE_RADIUS + dummyR;
      if (dx * dx + dy * dy <= need * need) {
        weapon.lastFired = now;
        return weapon.damage;
      }
    }
    return 0;
  }

  destroy() {
    this.head.destroy(true);
    for (const seg of this.segments) seg.destroy(true);
    for (const b of this.blades) b.destroy();
    this.segments.length = 0;
    this.positionHistory.length = 0;
    this.blades.length = 0;
  }

  private spawnSegment() {
    const i = this.segments.length;
    const color = i % 2 === 0 ? COLOR.segment : COLOR.segmentAlt;
    const container = this.scene.add.container(this.head.x, this.head.y);
    container.setDepth(18 - Math.min(i, 10));
    const halo = this.scene.add.circle(0, 0, SEGMENT_RADIUS + 5, color, 0.16);
    const body = this.scene.add.circle(0, 0, SEGMENT_RADIUS, color);
    body.setStrokeStyle(1.5, COLOR.segmentCore, 0.55);
    const core = this.scene.add.circle(-2, 0, 4, COLOR.segmentCore, 0.85);
    container.add([halo, body, core]);
    this.segments.push(container);
  }

  private attachMounts() {
    const blasterSeg = this.segments[0];
    if (blasterSeg) {
      const barrel = this.scene.add.rectangle(10, 0, 14, 5, COLOR.blaster);
      blasterSeg.add(barrel);
    }
    const turretSeg = this.segments[1];
    if (turretSeg) {
      const cup = this.scene.add.circle(0, 0, 6, COLOR.turret);
      turretSeg.add(cup);
    }
    const bladeSeg = this.segments[2];
    if (bladeSeg) {
      const a = this.scene.add.rectangle(0, 0, 18, 6, COLOR.blade);
      const b = this.scene.add.rectangle(0, 0, 18, 6, COLOR.blade);
      a.setDepth(19);
      b.setDepth(19);
      this.blades.push(a, b);
    }
  }

  private updateBlades(dt: number) {
    const host = this.segments[2];
    if (!host || this.blades.length < 2) return;
    this.bladeAngle += dt * 4.2;
    this.blades.forEach((blade, i) => {
      const ang = this.bladeAngle + i * Math.PI;
      blade.setPosition(host.x + Math.cos(ang) * BLADE_ORBIT, host.y + Math.sin(ang) * BLADE_ORBIT);
      blade.setRotation(ang + Math.PI / 2);
    });
  }

  private tickWeapons(now: number, aim: AimPoint | null) {
    for (const w of this.weapons) {
      if (w.type === "blade") continue;
      const seg = this.segments[w.segmentIndex];
      if (!seg) continue;
      if (now - w.lastFired < w.fireRate) continue;

      if (w.type === "blaster") {
        const ang = seg.rotation;
        this.fire({
          x: seg.x + Math.cos(ang) * 16,
          y: seg.y + Math.sin(ang) * 16,
          vx: Math.cos(ang) * BLASTER_SPEED,
          vy: Math.sin(ang) * BLASTER_SPEED,
          damage: w.damage,
          color: COLOR.blaster,
          radius: 4,
        });
        w.lastFired = now;
      } else if (w.type === "turret" && aim) {
        const dx = aim.x - seg.x;
        const dy = aim.y - seg.y;
        const mag = Math.hypot(dx, dy) || 1;
        this.fire({
          x: seg.x + (dx / mag) * 14,
          y: seg.y + (dy / mag) * 14,
          vx: (dx / mag) * TURRET_SPEED,
          vy: (dy / mag) * TURRET_SPEED,
          damage: w.damage,
          color: COLOR.turret,
          radius: 5,
        });
        w.lastFired = now;
      }
    }
  }

  private layoutSegments() {
    const hist = this.positionHistory;
    if (hist.length === 0) return;
    const last = hist.length - 1;
    for (let i = 0; i < this.segments.length; i++) {
      const framesBehind = (i + 1) * this.historyStride;
      const idx = Math.max(0, last - framesBehind);
      const pos = hist[idx]!;
      const seg = this.segments[i]!;
      seg.setPosition(pos.x, pos.y);
      const aheadIdx = Math.max(0, last - i * this.historyStride);
      const ahead = hist[aheadIdx]!;
      const ang = Math.atan2(ahead.y - pos.y, ahead.x - pos.x);
      if (Number.isFinite(ang)) seg.setRotation(ang);
    }
  }

  private ensureHistoryCapacity() {
    const needed = (this.segments.length + 4) * this.historyStride + 48;
    const oldest = this.positionHistory[0] ?? { x: this.head.x, y: this.head.y };
    while (this.positionHistory.length < needed) {
      this.positionHistory.unshift({ ...oldest });
    }
  }

  private trimHistory() {
    const max = (this.segments.length + 4) * this.historyStride + 48;
    const extra = this.positionHistory.length - max;
    if (extra > 0) this.positionHistory.splice(0, extra);
  }
}
