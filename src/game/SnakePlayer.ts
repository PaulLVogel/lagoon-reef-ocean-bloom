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
  PLAYER_MAX_HP,
  SEGMENT_MAX_HP,
  SEGMENT_RADIUS,
  STAT_ARMOR_STEP,
  STAT_CDR_MUL,
  STAT_DMG_MUL,
  STAT_HP_STEP,
  STAT_SPEED_MUL,
  WORLD_SIZE,
} from "./constants";
import type { GlobalStatId } from "./stats";
import {
  bumpTier,
  isHeadWeapon,
  makeWeapon,
  mineCadenceMs,
  MORTAR_AOE_BASE,
  randomSegmentWeaponType,
  weaponCooldown,
  weaponDamage,
  weaponRange,
  WEAPON_SEGMENT_COLOR,
  WEAPON_TIER_CAP,
  type EnemyScan,
  type FireEvent,
  type Weapon,
  type WeaponSlot,
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
  auraRing?: Phaser.GameObjects.Arc;
  weaponType?: WeaponType;
};

const SHOT_SPEED = 520;
const CONE_SPEED = 400;
const CONE_SPREAD = 0.22;
const SLASH_ARC = 1.15;
const DEAD_TINT = 0x555555;
const HEAD_WEAPON_INDEX = -1;
const RAIL_SPEED = 980;
const CHAIN_BOUNCES = 3;
const CHAIN_RADIUS = 170;

export class SnakePlayer {
  readonly head: Phaser.GameObjects.Container;
  readonly segments: Phaser.GameObjects.Container[] = [];
  readonly body: BodySegment[] = [];
  readonly positionHistory: HistoryPoint[] = [];
  /** Head stack (negative segmentIndex) plus exactly one weapon per trailing segment. */
  readonly weapons: Weapon[] = [];
  /** Multiplier for mortar / future AoE radii. */
  areaOfEffect = 1;

  speed = BASE_SPEED;
  facing = 0;
  vx = 0;
  vy = 0;
  pickupBonus = 0;
  segmentVacuum = false;
  headMaxHp = PLAYER_MAX_HP;
  segmentMaxHp = SEGMENT_MAX_HP;
  armor = 0;
  damageMul = 1;
  cooldownMul = 1;

  private readonly scene: Phaser.Scene;
  private readonly historyStride: number;
  private readonly headGlow: Phaser.GameObjects.Arc;
  private readonly pickupRing: Phaser.GameObjects.Arc;
  private readonly snout: Phaser.GameObjects.Triangle;
  private readonly fire: (ev: FireEvent) => void;
  private headWeaponSeq = HEAD_WEAPON_INDEX;
  private headAuraRing: Phaser.GameObjects.Arc | null = null;

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

    this.headGlow = scene.add.circle(0, 0, HEAD_RADIUS + 10, COLOR.head, 0.16);
    this.pickupRing = scene.add.circle(0, 0, PICKUP_RADIUS_BASE, COLOR.gemGreen, 0.07);
    this.pickupRing.setStrokeStyle(1, COLOR.gemGreen, 0.28);
    const diamond = scene.add.polygon(
      0,
      0,
      [0, -(HEAD_RADIUS + 4), HEAD_RADIUS + 3, 0, 0, HEAD_RADIUS + 4, -(HEAD_RADIUS + 3), 0],
      COLOR.head,
    );
    diamond.setStrokeStyle(2.4, COLOR.headStroke, 0.95);
    diamond.setName("head-diamond");
    this.snout = scene.add.triangle(
      HEAD_RADIUS * 0.45,
      0,
      0,
      -6,
      12,
      0,
      0,
      6,
      COLOR.snout,
    );
    const eyeY = scene.add.circle(3, -5, 2.2, COLOR.eye);
    const eyeX = scene.add.circle(3, 5, 2.2, COLOR.eye);
    const barrel = scene.add.rectangle(HEAD_RADIUS + 2, 0, 11, 3.5, COLOR.singleShot);
    this.head.add([this.pickupRing, this.headGlow, diamond, this.snout, eyeY, eyeX, barrel]);

    const maxHistory = (Math.max(segmentCount, 4) + 4) * this.historyStride + 48;
    for (let i = maxHistory - 1; i >= 0; i--) {
      this.positionHistory.push({
        x: x - i * 3.2,
        y,
      });
    }

    this.weapons.push(makeWeapon("single_shot", this.headWeaponSeq, 1));
    for (let i = 0; i < segmentCount; i++) {
      this.addArmedSegment(randomSegmentWeaponType());
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

  mitigate(amount: number) {
    return Math.max(1, Math.round(amount - this.armor));
  }

  boostPickupRadius() {
    this.pickupBonus += 1;
    this.pickupRing.setRadius(this.pickupRadius);
  }

  enableSegmentVacuum() {
    this.segmentVacuum = true;
    this.pickupRing.setStrokeStyle(1.5, COLOR.magnet, 0.45);
  }

  applyGlobalStat(stat: GlobalStatId): number {
    if (stat === "max_hp") {
      this.headMaxHp += STAT_HP_STEP;
      this.segmentMaxHp += STAT_HP_STEP;
      for (const s of this.body) {
        s.maxHp = this.segmentMaxHp;
        s.hp = Math.min(s.maxHp, s.hp + STAT_HP_STEP);
        if (s.hp > 0) {
          s.isActive = true;
          s.segmentSprite.clearTint();
          s.segmentSprite.setTint(s.baseTint);
        }
      }
      return STAT_HP_STEP;
    }
    if (stat === "move_speed") {
      this.boostSpeed(STAT_SPEED_MUL);
      return 0;
    }
    if (stat === "cooldown") {
      this.cooldownMul *= STAT_CDR_MUL;
      return 0;
    }
    if (stat === "damage") {
      this.damageMul *= STAT_DMG_MUL;
      return 0;
    }
    if (stat === "pickup_radius") {
      this.boostPickupRadius();
      return 0;
    }
    this.armor += STAT_ARMOR_STEP;
    return 0;
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

  ownedWeaponTypes(): WeaponType[] {
    return this.weapons.map((w) => w.type);
  }

  mineTier(): number {
    const mine = this.weapons.find((w) => w.type === "mine_layer" && w.segmentIndex >= 0);
    return mine?.tier ?? 0;
  }

  mineAtCap() {
    return this.mineTier() >= WEAPON_TIER_CAP;
  }

  canMerge(type: WeaponType, slot?: WeaponSlot) {
    return this.mergeTargets(type, slot).length > 0;
  }

  mergePreviewTier(type: WeaponType, slot?: WeaponSlot) {
    const match = this.mergeTargets(type, slot)[0];
    return match ? Math.min(WEAPON_TIER_CAP, match.tier + 1) : 1;
  }

  addSegment() {
    this.spawnSegment();
    this.ensureHistoryCapacity();
    this.layoutSegments();
  }

  addArmedSegment(type?: WeaponType) {
    this.addSegment();
    const index = this.segments.length - 1;
    this.armSegment(index, type ?? randomSegmentWeaponType());
    const w = this.weapons.find((weapon) => weapon.segmentIndex === index);
    if (w) w.lastFired = this.scene.time.now;
  }

  grantWeapon(type: WeaponType, slot?: WeaponSlot): "merged" | "added" {
    if (slot === "head") return this.grantHeadWeapon(type);
    if (slot === "segment") return this.grantSegmentWeapon(type);
    if (isHeadWeapon(type) && type !== "single_shot") return this.grantHeadWeapon(type);
    return this.grantSegmentWeapon(type);
  }

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
      this.headGlow.setFillStyle(COLOR.head, 0.16);
      this.head.setScale(1);
    });
    return amount;
  }

  /** Restore head (caller) and every attached segment to current max HP. */
  fullHeal() {
    this.heal(0);
    for (const s of this.body) {
      s.hp = s.maxHp;
      s.isActive = true;
      s.lastHit = 0;
      s.segmentSprite.clearTint();
      s.segmentSprite.setTint(s.baseTint);
    }
  }

  damageSegment(index: number, amount: number, now: number): boolean {
    const s = this.body[index];
    if (!s || !s.isActive || s.hp <= 0) return false;
    if (now < s.lastHit) return false;
    s.lastHit = now + PLAYER_IFRAME_MS;
    s.hp = Math.max(0, s.hp - this.mitigate(amount));
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
    this.syncAuras();
    if (combatOn) this.tickWeapons(now, enemies);
  }

  destroy() {
    this.head.destroy(true);
    this.headAuraRing?.destroy();
    for (const s of this.body) {
      s.healthBar.destroy();
      s.auraRing?.destroy();
      s.sprite.destroy(true);
    }
    this.segments.length = 0;
    this.body.length = 0;
    this.positionHistory.length = 0;
    this.weapons.length = 0;
  }

  private mergeTargets(type: WeaponType, slot?: WeaponSlot) {
    return this.weapons
      .filter((w) => {
        if (w.type !== type || w.tier >= WEAPON_TIER_CAP) return false;
        if (slot === "head") return w.segmentIndex < 0;
        if (slot === "segment") return w.segmentIndex >= 0;
        return true;
      })
      .sort((a, b) => a.tier - b.tier);
  }

  private grantHeadWeapon(type: WeaponType): "merged" | "added" {
    const existing = this.mergeTargets(type, "head")[0];
    if (existing) {
      bumpTier(existing);
      this.paintTier(existing);
      return "merged";
    }
    this.headWeaponSeq -= 1;
    const w = makeWeapon(type, this.headWeaponSeq);
    w.lastFired = this.scene.time.now;
    this.weapons.push(w);
    this.attachHeadMount(type);
    return "added";
  }

  private grantSegmentWeapon(type: WeaponType): "merged" | "added" {
    if (type === "mine_layer") {
      const mine = this.weapons.find((w) => w.type === "mine_layer" && w.segmentIndex >= 0);
      if (mine) {
        if (mine.tier < WEAPON_TIER_CAP) {
          bumpTier(mine);
          this.paintTier(mine);
        }
        return "merged";
      }
    }
    const existing = this.mergeTargets(type, "segment")[0];
    if (existing) {
      bumpTier(existing);
      this.paintTier(existing);
      return "merged";
    }
    this.addArmedSegment(type);
    return "added";
  }

  private spawnSegment() {
    this.ensureSegTexture();
    const i = this.segments.length;
    const color = i % 2 === 0 ? COLOR.segment : COLOR.segmentAlt;
    const container = this.scene.add.container(this.head.x, this.head.y);
    container.setDepth(18 - Math.min(i, 10));
    const halo = this.scene.add.circle(0, 0, SEGMENT_RADIUS + 5, color, 0.16);
    halo.setName("seg-halo");
    const ring = this.scene.add.circle(0, 0, SEGMENT_RADIUS, color, 0);
    ring.setStrokeStyle(1.5, COLOR.segmentCore, 0.55);
    ring.setName("seg-ring");
    const segmentSprite = this.scene.add.image(0, 0, "vs-seg");
    segmentSprite.setDisplaySize(SEGMENT_RADIUS * 2, SEGMENT_RADIUS * 2);
    segmentSprite.setTint(color);
    const core = this.scene.add.circle(-2, 0, 4, COLOR.segmentCore, 0.85);
    container.add([halo, ring, segmentSprite, core]);
    const healthBar = this.scene.add.graphics();
    healthBar.setVisible(false);
    healthBar.setActive(false);
    const state: BodySegment = {
      sprite: container,
      segmentSprite,
      hp: this.segmentMaxHp,
      maxHp: this.segmentMaxHp,
      isActive: true,
      healthBar,
      lastHit: 0,
      baseTint: color,
    };
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
    if (s.auraRing) s.auraRing.setVisible(false);
  }

  private armSegment(index: number, type: WeaponType) {
    if (this.weapons.some((w) => w.segmentIndex === index)) return;
    this.weapons.push(makeWeapon(type, index));
    this.attachMount(index, type);
    this.paintSegmentWeapon(index, type);
  }

  private paintSegmentWeapon(index: number, type: WeaponType) {
    const state = this.body[index];
    const seg = this.segments[index];
    if (!state || !seg) return;
    const color = WEAPON_SEGMENT_COLOR[type];
    state.baseTint = color;
    state.weaponType = type;
    state.segmentSprite.setTint(color);
    const halo = seg.getByName("seg-halo") as Phaser.GameObjects.Arc | null;
    const ring = seg.getByName("seg-ring") as Phaser.GameObjects.Arc | null;
    halo?.setFillStyle(color, 0.22);
    ring?.setStrokeStyle(1.5, color, 0.8);
  }

  private attachMount(index: number, type: WeaponType) {
    const seg = this.segments[index];
    const state = this.body[index];
    if (!seg) return;
    if (seg.getData("armed")) return;
    seg.setData("armed", type);
    if (type === "single_shot") {
      seg.add(this.scene.add.rectangle(11, 0, 14, 5, COLOR.singleShot));
    } else if (type === "cone_burst") {
      seg.add(this.scene.add.rectangle(10, -4, 12, 4, COLOR.coneBurst));
      seg.add(this.scene.add.rectangle(10, 4, 12, 4, COLOR.coneBurst));
    } else if (type === "melee_slash") {
      seg.add(this.scene.add.triangle(12, 0, 0, -6, 16, 0, 0, 6, COLOR.meleeSlash));
    } else if (type === "mine_layer") {
      seg.add(this.scene.add.circle(10, 0, 5, COLOR.mine));
    } else if (type === "railgun") {
      seg.add(this.scene.add.rectangle(14, 0, 18, 3, COLOR.rail));
    } else if (type === "chain_lightning") {
      seg.add(this.scene.add.star(10, 0, 4, 6, 3, COLOR.chain));
    } else if (type === "mortar") {
      seg.add(this.scene.add.ellipse(10, 0, 10, 7, COLOR.mortar));
    } else if (type === "aura" && state) {
      const ring = this.scene.add.circle(seg.x, seg.y, 78, COLOR.aura, 0.12);
      ring.setStrokeStyle(2, COLOR.aura, 0.55);
      ring.setDepth(8);
      state.auraRing = ring;
    }
  }

  private attachHeadMount(type: WeaponType) {
    if (type === "aura" && !this.headAuraRing) {
      const ring = this.scene.add.circle(this.head.x, this.head.y, 78, COLOR.aura, 0.12);
      ring.setStrokeStyle(2, COLOR.aura, 0.55);
      ring.setDepth(8);
      this.headAuraRing = ring;
    } else if (type === "cone_burst") {
      this.head.add(this.scene.add.rectangle(HEAD_RADIUS + 2, -5, 10, 3, COLOR.coneBurst));
      this.head.add(this.scene.add.rectangle(HEAD_RADIUS + 2, 5, 10, 3, COLOR.coneBurst));
    } else if (type === "melee_slash") {
      this.head.add(this.scene.add.triangle(HEAD_RADIUS + 4, 0, 0, -5, 12, 0, 0, 5, COLOR.meleeSlash));
    }
  }

  private syncAuras() {
    for (let i = 0; i < this.body.length; i++) {
      const s = this.body[i]!;
      if (!s.auraRing) continue;
      s.auraRing.setPosition(s.sprite.x, s.sprite.y);
      s.auraRing.setVisible(s.isActive);
    }
    if (this.headAuraRing) {
      this.headAuraRing.setPosition(this.head.x, this.head.y);
      const aura = this.weapons.find((w) => w.type === "aura" && w.segmentIndex < 0);
      if (aura) this.headAuraRing.setRadius(weaponRange(aura));
    }
  }

  private paintTier(w: Weapon) {
    if (w.segmentIndex < 0) {
      this.head.setScale(1 + Math.max(0, this.headWeaponCount() - 1) * 0.04 + (w.tier - 1) * 0.04);
      if (w.type === "aura" && this.headAuraRing) this.headAuraRing.setRadius(weaponRange(w));
      return;
    }
    const seg = this.segments[w.segmentIndex];
    if (!seg) return;
    seg.setScale(1 + (w.tier - 1) * 0.12);
    const state = this.body[w.segmentIndex];
    if (state?.auraRing) {
      const r = weaponRange(w);
      state.auraRing.setRadius(r);
    }
  }

  private headWeaponCount() {
    return this.weapons.filter((w) => w.segmentIndex < 0).length;
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

  private originFor(w: Weapon): { x: number; y: number } | null {
    if (w.segmentIndex < 0) return { x: this.head.x, y: this.head.y };
    const state = this.body[w.segmentIndex];
    const seg = this.segments[w.segmentIndex];
    if (!seg || !state || !state.isActive) return null;
    return { x: seg.x, y: seg.y };
  }

  private tickWeapons(now: number, enemies: EnemyScan[]) {
    const seen = new Set<number>();
    for (const w of this.weapons) {
      if (seen.has(w.segmentIndex)) continue;
      seen.add(w.segmentIndex);
      const cd = w.type === "mine_layer" ? mineCadenceMs(w) : weaponCooldown(w, this.cooldownMul);
      if (now - w.lastFired < cd) continue;
      const origin = this.originFor(w);
      if (!origin) continue;

      const dmg = weaponDamage(w, this.damageMul);
      const range = weaponRange(w);

      if (w.type === "aura") {
        this.fire({
          kind: "aura",
          x: origin.x,
          y: origin.y,
          vx: 0,
          vy: 0,
          damage: dmg,
          color: COLOR.aura,
          radius: range,
        });
        w.lastFired = now;
        continue;
      }

      if (w.type === "mine_layer") {
        this.fire({
          kind: "mine",
          x: origin.x,
          y: origin.y,
          vx: 0,
          vy: 0,
          damage: dmg,
          color: COLOR.mine,
          radius: 22 + w.tier * 6,
        });
        w.lastFired = now;
        continue;
      }

      const target = this.nearestEnemyTo(origin.x, origin.y, enemies);
      if (!target) continue;

      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const mag = Math.hypot(dx, dy) || 1;
      if (mag > range) continue;

      const angle = Math.atan2(dy, dx);
      const ux = dx / mag;
      const uy = dy / mag;

      if (w.type === "mortar") {
        const aoe = MORTAR_AOE_BASE * this.areaOfEffect * (1 + (w.tier - 1) * 0.2);
        this.fire({
          kind: "mortar",
          x: origin.x,
          y: origin.y,
          vx: 0,
          vy: 0,
          damage: dmg,
          color: COLOR.mortar,
          radius: 7,
          tx: target.x,
          ty: target.y,
          aoe,
        });
        w.lastFired = now;
        continue;
      }

      if (w.type === "single_shot") {
        this.fire({
          kind: "bullet",
          x: origin.x + ux * 16,
          y: origin.y + uy * 16,
          vx: ux * SHOT_SPEED,
          vy: uy * SHOT_SPEED,
          damage: dmg,
          color: COLOR.singleShot,
          radius: 4,
        });
      } else if (w.type === "cone_burst") {
        const pellets = 3 + Math.max(0, w.tier) ;
        const mid = (pellets - 1) / 2;
        for (let i = 0; i < pellets; i++) {
          const a = angle + (i - mid) * CONE_SPREAD;
          this.fire({
            kind: "bullet",
            x: origin.x + Math.cos(a) * 14,
            y: origin.y + Math.sin(a) * 14,
            vx: Math.cos(a) * CONE_SPEED,
            vy: Math.sin(a) * CONE_SPEED,
            damage: dmg,
            color: COLOR.coneBurst,
            radius: 3.5,
          });
        }
      } else if (w.type === "railgun") {
        this.fire({
          kind: "bullet",
          x: origin.x + ux * 18,
          y: origin.y + uy * 18,
          vx: ux * RAIL_SPEED,
          vy: uy * RAIL_SPEED,
          damage: dmg,
          color: COLOR.rail,
          radius: 3,
          pierce: true,
        });
      } else if (w.type === "chain_lightning") {
        this.fire({
          kind: "chain",
          x: origin.x,
          y: origin.y,
          vx: ux * 640,
          vy: uy * 640,
          damage: dmg,
          color: COLOR.chain,
          radius: 6,
          bounces: CHAIN_BOUNCES,
          bounceRadius: CHAIN_RADIUS,
        });
      } else {
        this.playSlash(origin.x, origin.y, angle, range, SLASH_ARC);
        this.fire({
          kind: "slash",
          x: origin.x,
          y: origin.y,
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
