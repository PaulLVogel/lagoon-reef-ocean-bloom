import * as Phaser from "phaser";
import {
  BASE_SPEED,
  COLOR,
  DEFAULT_SEGMENT_COUNT,
  HEAD_RADIUS,
  HISTORY_STRIDE,
  PICKUP_RADIUS_BASE,
  PICKUP_RADIUS_STEP,
  PLAYER_IFRAME_MS,
  SEGMENT_RADIUS,
  WORLD_SIZE,
} from "./constants";
import {
  defaultLoadout,
  makeWeapon,
  type EnemyScan,
  type FireEvent,
  type Weapon,
} from "./Weapon";

type HistoryPoint = { x: number; y: number };

type BladePair = {
  segmentIndex: number;
  blades: Phaser.GameObjects.Rectangle[];
};

export type BodySegment = {
  sprite: Phaser.GameObjects.Container;
  segmentSprite: Phaser.GameObjects.Arc;
  hp: number;
  maxHp: number;
  isActive: boolean;
  healthBar: Phaser.GameObjects.Graphics;
  lastHit: number;
};

const BLADE_ORBIT = 34;
const BLADE_RADIUS = 11;
const BLASTER_SPEED = 520;
const TURRET_SPEED = 460;
const SEGMENT_MAX_HP = 100;
const DEAD_TINT = 0x555555;
const BAR_W = 22;
const BAR_H = 3;

export class SnakePlayer {
  readonly head: Phaser.GameObjects.Container;
  readonly segments: Phaser.GameObjects.Container[] = [];
  readonly body: BodySegment[] = [];
  readonly positionHistory: HistoryPoint[] = [];
  readonly weapons: Weapon[] = [];

  speed = BASE_SPEED;
  facing = 0;
  vx = 0;
  vy = 0;
  pickupBonus = 0;
  segmentVacuum = false;

  private readonly scene: Phaser.Scene;
  private readonly historyStride: number;
  private readonly headGlow: Phaser.GameObjects.Arc;
  private readonly pickupRing: Phaser.GameObjects.Arc;
  private readonly snout: Phaser.GameObjects.Triangle;
  private readonly bladePairs: BladePair[] = [];
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

    this.head = scene.add.container(x, y);
    this.head.setDepth(20);

    this.headGlow = scene.add.circle(0, 0, HEAD_RADIUS + 7, COLOR.head, 0.12);
    this.pickupRing = scene.add.circle(0, 0, PICKUP_RADIUS_BASE, COLOR.gemGreen, 0.07);
    this.pickupRing.setStrokeStyle(1, COLOR.gemGreen, 0.28);
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
    this.head.add([this.pickupRing, this.headGlow, headBody, this.snout, eyeY, eyeX]);

    const maxHistory = (segmentCount + 4) * this.historyStride + 48;
    for (let i = maxHistory - 1; i >= 0; i--) {
      this.positionHistory.push({
        x: x - i * 3.2,
        y,
      });
    }

    const loadout = defaultLoadout(segmentCount);
    for (let i = 0; i < segmentCount; i++) {
      this.spawnSegment();
      this.armSegment(i, loadout[i]!.type);
    }
    this.layoutSegments();
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

  get pickupRadius() {
    return PICKUP_RADIUS_BASE + this.pickupBonus * PICKUP_RADIUS_STEP;
  }

  boostPickupRadius() {
    this.pickupBonus += 1;
    this.pickupRing.setRadius(this.pickupRadius);
  }

  enableSegmentVacuum() {
    this.segmentVacuum = true;
    this.pickupRing.setStrokeStyle(1.5, COLOR.magnet, 0.45);
  }

  getParts(): { x: number; y: number; r: number }[] {
    const parts = [{ x: this.head.x, y: this.head.y, r: HEAD_RADIUS }];
    for (const seg of this.segments) {
      parts.push({ x: seg.x, y: seg.y, r: SEGMENT_RADIUS });
    }
    return parts;
  }

  /** Closest point on the snake (head or any segment, including greyed-out). */
  nearestChasePoint(x: number, y: number): { x: number; y: number } {
    let bx = this.head.x;
    let by = this.head.y;
    let best = (bx - x) * (bx - x) + (by - y) * (by - y);
    for (const seg of this.segments) {
      const dx = seg.x - x;
      const dy = seg.y - y;
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        bx = seg.x;
        by = seg.y;
      }
    }
    return { x: bx, y: by };
  }

  addSegment() {
    this.spawnSegment();
    this.ensureHistoryCapacity();
    this.layoutSegments();
  }

  addArmedSegment(type: Weapon["type"]) {
    this.addSegment();
    this.armSegment(this.segments.length - 1, type);
  }

  boostFireRate(type: Weapon["type"], mul: number, floor = 140) {
    for (const w of this.weapons) {
      if (w.type !== type) continue;
      w.fireRate = Math.max(floor, Math.round(w.fireRate * mul));
    }
  }

  boostDamage(type: Weapon["type"], add: number) {
    for (const w of this.weapons) {
      if (w.type !== type) continue;
      w.damage += add;
    }
  }

  boostSpeed(mul: number, cap = 420) {
    this.speed = Math.min(cap, this.speed * mul);
  }

  heal(amount: number) {
    this.headGlow.setFillStyle(0x86efac, 0.62);
    this.head.setScale(1.08);
    this.scene.time.delayedCall(160, () => {
      if (!this.head.active) return;
      this.headGlow.setFillStyle(COLOR.head, 0.12);
      this.head.setScale(1);
    });
    return amount;
  }

  damageSegment(index: number, amount: number, now: number): boolean {
    const s = this.body[index];
    if (!s || !s.isActive || s.hp <= 0) return false;
    if (now < s.lastHit) return false;
    s.lastHit = now + PLAYER_IFRAME_MS;
    s.hp = Math.max(0, s.hp - amount);
    this.paintHealthBar(s);
    if (s.hp <= 0) this.greyOut(s);
    return true;
  }

  reviveAll() {
    for (const s of this.body) {
      s.hp = s.maxHp;
      s.isActive = true;
      s.lastHit = 0;
      s.segmentSprite.clearTint();
      s.healthBar.setVisible(true);
      this.paintHealthBar(s);
    }
  }

  update(dt: number, ax: number, ay: number, now: number, enemies: EnemyScan[], combatOn: boolean) {
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
    if (combatOn) this.tickWeapons(now, enemies);
  }

  bladeHits(dummyX: number, dummyY: number, dummyR: number, now: number): number {
    let dealt = 0;
    for (const w of this.weapons) {
      if (w.type !== "blade") continue;
      const host = this.body[w.segmentIndex];
      if (!host || !host.isActive) continue;
      if (now - w.lastFired < w.fireRate) continue;
      const pair = this.bladePairs.find((p) => p.segmentIndex === w.segmentIndex);
      if (!pair) continue;
      for (const blade of pair.blades) {
        const dx = blade.x - dummyX;
        const dy = blade.y - dummyY;
        const need = BLADE_RADIUS + dummyR;
        if (dx * dx + dy * dy <= need * need) {
          w.lastFired = now;
          dealt += w.damage;
          break;
        }
      }
    }
    return dealt;
  }

  destroy() {
    this.head.destroy(true);
    for (const s of this.body) {
      s.healthBar.destroy();
      s.sprite.destroy(true);
    }
    for (const pair of this.bladePairs) {
      for (const b of pair.blades) b.destroy();
    }
    this.segments.length = 0;
    this.body.length = 0;
    this.positionHistory.length = 0;
    this.bladePairs.length = 0;
    this.weapons.length = 0;
  }

  private spawnSegment() {
    const i = this.segments.length;
    const color = i % 2 === 0 ? COLOR.segment : COLOR.segmentAlt;
    const container = this.scene.add.container(this.head.x, this.head.y);
    container.setDepth(18 - Math.min(i, 10));
    const halo = this.scene.add.circle(0, 0, SEGMENT_RADIUS + 5, color, 0.16);
    const segmentSprite = this.scene.add.circle(0, 0, SEGMENT_RADIUS, color);
    segmentSprite.setStrokeStyle(1.5, COLOR.segmentCore, 0.55);
    const core = this.scene.add.circle(-2, 0, 4, COLOR.segmentCore, 0.85);
    container.add([halo, segmentSprite, core]);
    const healthBar = this.scene.add.graphics();
    healthBar.setDepth(22);
    const state: BodySegment = {
      sprite: container,
      segmentSprite,
      hp: SEGMENT_MAX_HP,
      maxHp: SEGMENT_MAX_HP,
      isActive: true,
      healthBar,
      lastHit: 0,
    };
    this.paintHealthBar(state);
    this.body.push(state);
    this.segments.push(container);
  }

  private greyOut(s: BodySegment) {
    s.isActive = false;
    s.hp = 0;
    s.segmentSprite.setTint(DEAD_TINT);
    s.healthBar.clear();
    s.healthBar.setVisible(false);
  }

  private paintHealthBar(s: BodySegment) {
    const g = s.healthBar;
    g.clear();
    if (!s.isActive || s.hp <= 0) {
      g.setVisible(false);
      return;
    }
    g.setVisible(true);
    const ox = -BAR_W / 2;
    const oy = -SEGMENT_RADIUS - 11;
    g.fillStyle(0x111318, 0.85);
    g.fillRect(ox, oy, BAR_W, BAR_H);
    const t = s.hp / s.maxHp;
    const color = t > 0.5 ? 0x4ade80 : t > 0.25 ? 0xfbbf24 : 0xf87171;
    g.fillStyle(color, 1);
    g.fillRect(ox, oy, BAR_W * t, BAR_H);
  }

  private armSegment(index: number, type: Weapon["type"]) {
    const existing = this.weapons.find((w) => w.segmentIndex === index);
    if (existing) return;
    this.weapons.push(makeWeapon(type, index));
    this.attachMount(index, type);
  }

  private attachMount(index: number, type: Weapon["type"]) {
    const seg = this.segments[index];
    if (!seg) return;
    if (type === "blaster") {
      const barrel = this.scene.add.rectangle(10, 0, 14, 5, COLOR.blaster);
      seg.add(barrel);
    } else if (type === "turret") {
      const cup = this.scene.add.circle(0, 0, 6, COLOR.turret);
      seg.add(cup);
    } else if (type === "blade") {
      const a = this.scene.add.rectangle(0, 0, 18, 6, COLOR.blade);
      const b = this.scene.add.rectangle(0, 0, 18, 6, COLOR.blade);
      a.setDepth(19);
      b.setDepth(19);
      this.bladePairs.push({ segmentIndex: index, blades: [a, b] });
    }
  }

  private updateBlades(dt: number) {
    this.bladeAngle += dt * 4.2;
    for (const pair of this.bladePairs) {
      const host = this.segments[pair.segmentIndex];
      if (!host) continue;
      pair.blades.forEach((blade, i) => {
        const ang = this.bladeAngle + i * Math.PI;
        blade.setPosition(host.x + Math.cos(ang) * BLADE_ORBIT, host.y + Math.sin(ang) * BLADE_ORBIT);
        blade.setRotation(ang + Math.PI / 2);
        const live = this.body[pair.segmentIndex]?.isActive !== false;
        blade.setAlpha(live ? 1 : 0.28);
      });
    }
  }

  private nearestEnemyTo(x: number, y: number, enemies: EnemyScan[]): EnemyScan | null {
    let best: EnemyScan | null = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private tickWeapons(now: number, enemies: EnemyScan[]) {
    for (const w of this.weapons) {
      if (w.type === "blade") continue;
      const state = this.body[w.segmentIndex];
      const seg = this.segments[w.segmentIndex];
      if (!seg || !state || !state.isActive) continue;
      if (now - w.lastFired < w.fireRate) continue;

      const target = this.nearestEnemyTo(seg.x, seg.y, enemies);
      if (!target) continue;

      const dx = target.x - seg.x;
      const dy = target.y - seg.y;
      const mag = Math.hypot(dx, dy) || 1;
      const ux = dx / mag;
      const uy = dy / mag;
      const speed = w.type === "turret" ? TURRET_SPEED : BLASTER_SPEED;

      this.fire({
        x: seg.x + ux * 16,
        y: seg.y + uy * 16,
        vx: ux * speed,
        vy: uy * speed,
        damage: w.damage,
        color: w.type === "turret" ? COLOR.turret : COLOR.blaster,
        radius: w.type === "turret" ? 5 : 4,
      });
      w.lastFired = now;
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
      const state = this.body[i];
      if (state) {
        state.healthBar.setPosition(pos.x, pos.y);
      }
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
