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
  nextWeaponType,
  weaponCooldown,
  weaponDamage,
  weaponRange,
  type EnemyScan,
  type FireEvent,
  type Weapon,
  type WeaponStat,
  type WeaponType,
} from "./Weapon";

type HistoryPoint = { x: number; y: number };

export type BodySegment = {
  sprite: Phaser.GameObjects.Container;
  segmentSprite: Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  isActive: boolean;
  healthBar: Phaser.GameObjects.Graphics;
  lastHit: number;
  baseTint: number;
};

const SHOT_SPEED = 520;
const CONE_SPEED = 400;
const CONE_SPREAD = 0.22;
const SLASH_ARC = 1.15;
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

  addArmedSegment(type?: WeaponType) {
    this.addSegment();
    const index = this.segments.length - 1;
    this.armSegment(index, type ?? nextWeaponType(index));
  }

  /** Shop / item hook. Multiplies a single segment weapon's damage, range, or fire rate. */
  applyItemModifier(segmentIndex: number, statToBuff: WeaponStat, multiplierValue: number) {
    const w = this.weapons.find((weapon) => weapon.segmentIndex === segmentIndex);
    if (!w || !Number.isFinite(multiplierValue) || multiplierValue <= 0) return;
    if (statToBuff === "damage") w.damageMultiplier *= multiplierValue;
    else if (statToBuff === "range") w.rangeMultiplier *= multiplierValue;
    else w.fireRateMultiplier *= multiplierValue;
  }

  buffWeaponType(type: WeaponType, statToBuff: WeaponStat, multiplierValue: number) {
    for (const w of this.weapons) {
      if (w.type !== type) continue;
      this.applyItemModifier(w.segmentIndex, statToBuff, multiplierValue);
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
      s.segmentSprite.setTint(s.baseTint);
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
    if (combatOn) this.tickWeapons(now, enemies);
  }

  destroy() {
    this.head.destroy(true);
    for (const s of this.body) {
      s.healthBar.destroy();
      s.sprite.destroy(true);
    }
    this.segments.length = 0;
    this.body.length = 0;
    this.positionHistory.length = 0;
    this.weapons.length = 0;
  }

  private spawnSegment() {
    this.ensureSegTexture();
    const i = this.segments.length;
    const color = i % 2 === 0 ? COLOR.segment : COLOR.segmentAlt;
    const container = this.scene.add.container(this.head.x, this.head.y);
    container.setDepth(18 - Math.min(i, 10));
    const halo = this.scene.add.circle(0, 0, SEGMENT_RADIUS + 5, color, 0.16);
    const ring = this.scene.add.circle(0, 0, SEGMENT_RADIUS, color, 0);
    ring.setStrokeStyle(1.5, COLOR.segmentCore, 0.55);
    const segmentSprite = this.scene.add.image(0, 0, "vs-seg");
    segmentSprite.setDisplaySize(SEGMENT_RADIUS * 2, SEGMENT_RADIUS * 2);
    segmentSprite.setTint(color);
    const core = this.scene.add.circle(-2, 0, 4, COLOR.segmentCore, 0.85);
    container.add([halo, ring, segmentSprite, core]);
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
      baseTint: color,
    };
    this.paintHealthBar(state);
    this.body.push(state);
    this.segments.push(container);
  }

  private ensureSegTexture() {
    if (this.scene.textures.exists("vs-seg")) return;
    const g = this.scene.add.graphics();
    g.setVisible(false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(SEGMENT_RADIUS, SEGMENT_RADIUS, SEGMENT_RADIUS);
    g.generateTexture("vs-seg", SEGMENT_RADIUS * 2, SEGMENT_RADIUS * 2);
    g.destroy();
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

  /** Exactly one weapon per segment. Second arm is ignored. */
  private armSegment(index: number, type: WeaponType) {
    if (this.weapons.some((w) => w.segmentIndex === index)) return;
    this.weapons.push(makeWeapon(type, index));
    this.attachMount(index, type);
  }

  private attachMount(index: number, type: WeaponType) {
    const seg = this.segments[index];
    if (!seg) return;
    if (type === "single_shot") {
      const barrel = this.scene.add.rectangle(11, 0, 14, 5, COLOR.singleShot);
      seg.add(barrel);
    } else if (type === "cone_burst") {
      const left = this.scene.add.rectangle(10, -4, 12, 4, COLOR.coneBurst);
      const right = this.scene.add.rectangle(10, 4, 12, 4, COLOR.coneBurst);
      seg.add(left);
      seg.add(right);
    } else {
      const fang = this.scene.add.triangle(12, 0, 0, -6, 16, 0, 0, 6, COLOR.meleeSlash);
      seg.add(fang);
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
      const state = this.body[w.segmentIndex];
      const seg = this.segments[w.segmentIndex];
      if (!seg || !state || !state.isActive) continue;
      if (now - w.lastFired < weaponCooldown(w)) continue;

      const target = this.nearestEnemyTo(seg.x, seg.y, enemies);
      if (!target) continue;

      const dx = target.x - seg.x;
      const dy = target.y - seg.y;
      const mag = Math.hypot(dx, dy) || 1;
      const range = weaponRange(w);
      if (mag > range) continue;

      const angle = Math.atan2(dy, dx);
      const ux = dx / mag;
      const uy = dy / mag;
      const dmg = weaponDamage(w);

      if (w.type === "single_shot") {
        this.fire({
          kind: "bullet",
          x: seg.x + ux * 16,
          y: seg.y + uy * 16,
          vx: ux * SHOT_SPEED,
          vy: uy * SHOT_SPEED,
          damage: dmg,
          color: COLOR.singleShot,
          radius: 4,
        });
      } else if (w.type === "cone_burst") {
        const pellets = 3 + (w.segmentIndex % 3);
        const mid = (pellets - 1) / 2;
        for (let i = 0; i < pellets; i++) {
          const a = angle + (i - mid) * CONE_SPREAD;
          this.fire({
            kind: "bullet",
            x: seg.x + Math.cos(a) * 14,
            y: seg.y + Math.sin(a) * 14,
            vx: Math.cos(a) * CONE_SPEED,
            vy: Math.sin(a) * CONE_SPEED,
            damage: dmg,
            color: COLOR.coneBurst,
            radius: 3.5,
          });
        }
      } else {
        this.playSlash(seg.x, seg.y, angle, range, SLASH_ARC);
        this.fire({
          kind: "slash",
          x: seg.x,
          y: seg.y,
          vx: 0,
          vy: 0,
          damage: dmg,
          color: COLOR.meleeSlash,
          radius: range,
          angle,
          range,
          arc: SLASH_ARC,
        });
      }
      w.lastFired = now;
    }
  }

  private playSlash(x: number, y: number, angle: number, range: number, arc: number) {
    const g = this.scene.add.graphics();
    g.setDepth(19);
    g.setPosition(x, y);
    g.fillStyle(COLOR.meleeSlash, 0.42);
    g.slice(0, 0, range, angle - arc / 2, angle + arc / 2, false);
    g.fillPath();
    g.lineStyle(2.4, 0xfff4c8, 0.95);
    g.beginPath();
    g.arc(0, 0, range * 0.92, angle - arc / 2, angle + arc / 2, false);
    g.strokePath();
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 170,
      ease: "Cubic.easeOut",
      onComplete: () => g.destroy(),
    });
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
