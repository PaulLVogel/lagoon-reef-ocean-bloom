import * as Phaser from "phaser";
import {
  BASE_SPEED,
  BARD_SCALE,
  BARD_SHEET,
  COLOR,
  COIL_CLOSE_DIST,
  COIL_MIN_AREA,
  COIL_MIN_SEGMENT_INDEX,
  DEFAULT_SEGMENT_COUNT,
  HEAD_RADIUS,
  HISTORY_MIN_STEP,
  PICKUP_RADIUS_BASE,
  PICKUP_RADIUS_STEP,
  PLAYER_IFRAME_MS,
  PLAYER_MAX_HP,
  SEGMENT_MAX_HP,
  SEGMENT_RADIUS,
  SEGMENT_SPACING,
  SELF_HIT_COOLDOWN_MS,
  SELF_HIT_IGNORE_SEGMENTS,
  SELF_HIT_KNOCKBACK,
  SELF_HIT_RADIUS_MUL,
  SELF_HIT_STUN_MS,
  SHED_SLIDE_MS,
  SHED_TURRET_MS,
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

/** A shed car left behind: keeps firing its weapon from a fixed spot until `until`. */
export type ShedTurret = { weapon: Weapon; x: number; y: number; until: number; sprite: Phaser.GameObjects.Container; ring: Phaser.GameObjects.Arc };
/** What `shed()` detached, for the scene's FX / damage. */
export type ShedResult = { x: number; y: number; kind: "explode" | "turret"; weaponType?: WeaponType };

const SHOT_SPEED = 520;
const CONE_SPEED = 400;
const CONE_SPREAD = 0.22;
const SLASH_ARC = 1.15;
const DEAD_TINT = 0x555555;
const HEAD_WEAPON_INDEX = -1;
const RAIL_SPEED = 980;
const CHAIN_BOUNCES = 3;
const CHAIN_RADIUS = 170;
const BARD_WALK = "bard-walk";
const BARD_IDLE_FRAME = 1;

export class SnakePlayer {
  readonly head: Phaser.GameObjects.Container;
  readonly segments: Phaser.GameObjects.Container[] = [];
  readonly segmentGroup: Phaser.Physics.Arcade.Group;
  readonly body: BodySegment[] = [];
  readonly positionHistory: HistoryPoint[] = [];
  readonly weapons: Weapon[] = [];
  /** Shed tail cars still firing from where they were dropped. */
  readonly turrets: ShedTurret[] = [];
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
  /** Self-collision knockback: input is ignored until this time and the head slides on kbVx/kbVy. */
  private stunUntil = 0;
  private kbVx = 0;
  private kbVy = 0;
  private selfHitReadyAt = 0;
  private readonly headGlow: Phaser.GameObjects.Arc;
  private readonly pickupRing: Phaser.GameObjects.Arc;
  private readonly mounts: Phaser.GameObjects.Container;
  private readonly bard: Phaser.GameObjects.Sprite | null;
  private readonly fire: (ev: FireEvent) => void;
  private headWeaponSeq = HEAD_WEAPON_INDEX;
  private headAuraRing: Phaser.GameObjects.Arc | null = null;
  /** After a shed, surviving cars ease from these positions to their trail spots (layoutSegments). */
  private slideFrom = new Map<Phaser.GameObjects.Container, { x: number; y: number }>();
  private slideStart = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, fire: (ev: FireEvent) => void, segmentCount = DEFAULT_SEGMENT_COUNT) {
    this.scene = scene;
    this.fire = fire;
    this.segmentGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.head = scene.add.container(x, y);
    this.head.setDepth(20);
    this.headGlow = scene.add.circle(0, 0, HEAD_RADIUS + 10, COLOR.head, 0.16);
    this.pickupRing = scene.add.circle(0, 0, PICKUP_RADIUS_BASE, COLOR.gemGreen, 0.07);
    this.pickupRing.setStrokeStyle(1, COLOR.gemGreen, 0.28);
    this.mounts = scene.add.container(0, 0);
    const hasBard = scene.textures.exists(BARD_SHEET);
    if (hasBard) {
      scene.textures.get(BARD_SHEET).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (!scene.anims.exists(BARD_WALK)) {
        scene.anims.create({ key: BARD_WALK, frames: scene.anims.generateFrameNumbers(BARD_SHEET, { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
      }
      this.bard = scene.add.sprite(0, 0, BARD_SHEET, BARD_IDLE_FRAME);
      this.bard.setOrigin(0.5, 0.72);
      this.bard.setScale(BARD_SCALE);
      this.bard.setFlipX(false);
      this.head.add([this.pickupRing, this.headGlow, this.bard, this.mounts]);
    } else {
      this.bard = null;
      const diamond = scene.add.polygon(0, 0, [0, -(HEAD_RADIUS + 4), HEAD_RADIUS + 3, 0, 0, HEAD_RADIUS + 4, -(HEAD_RADIUS + 3), 0], COLOR.head);
      diamond.setStrokeStyle(2.4, COLOR.headStroke, 0.95);
      diamond.setName("head-diamond");
      const snout = scene.add.triangle(HEAD_RADIUS * 0.45, 0, 0, -6, 12, 0, 0, 6, COLOR.snout);
      const eyeY = scene.add.circle(3, -5, 2.2, COLOR.eye);
      const eyeX = scene.add.circle(3, 5, 2.2, COLOR.eye);
      const barrel = scene.add.rectangle(HEAD_RADIUS + 2, 0, 11, 3.5, COLOR.singleShot);
      this.head.add([this.pickupRing, this.headGlow, diamond, snout, eyeY, eyeX, barrel, this.mounts]);
    }
    // Seed a straight trail behind the head (oldest first), long enough for the starting body.
    const seedLength = this.trailLengthFor(Math.max(segmentCount, 4));
    for (let d = seedLength; d > 0; d -= HISTORY_MIN_STEP) this.positionHistory.push({ x: x - d, y });
    this.weapons.push(makeWeapon("single_shot", this.headWeaponSeq, 1));
    for (let i = 0; i < segmentCount; i++) this.addArmedSegment(randomSegmentWeaponType());
    this.layoutSegments();
  }

  get x() { return this.head.x; }
  get y() { return this.head.y; }
  getRadius() { return HEAD_RADIUS; }
  get pickupRadius() { return PICKUP_RADIUS_BASE + this.pickupBonus * PICKUP_RADIUS_STEP; }
  mitigate(amount: number) { return Math.max(1, Math.round(amount - this.armor)); }
  boostPickupRadius() { this.pickupBonus += 1; this.pickupRing.setRadius(this.pickupRadius); }
  enableSegmentVacuum() { this.segmentVacuum = true; this.pickupRing.setStrokeStyle(1.5, COLOR.magnet, 0.45); }

  applyGlobalStat(stat: GlobalStatId): number {
    if (stat === "max_hp") {
      this.headMaxHp += STAT_HP_STEP; this.segmentMaxHp += STAT_HP_STEP;
      for (const s of this.body) {
        s.maxHp = this.segmentMaxHp; s.hp = Math.min(s.maxHp, s.hp + STAT_HP_STEP);
        if (s.hp > 0) { s.isActive = true; s.segmentSprite.clearTint(); s.segmentSprite.setTint(s.baseTint); }
      }
      return STAT_HP_STEP;
    }
    if (stat === "move_speed") { this.boostSpeed(STAT_SPEED_MUL); return 0; }
    if (stat === "cooldown") { this.cooldownMul *= STAT_CDR_MUL; return 0; }
    if (stat === "damage") { this.damageMul *= STAT_DMG_MUL; return 0; }
    if (stat === "pickup_radius") { this.boostPickupRadius(); return 0; }
    this.armor += STAT_ARMOR_STEP; return 0;
  }

  getParts(): { x: number; y: number; r: number }[] {
    const parts = [{ x: this.head.x, y: this.head.y, r: HEAD_RADIUS }];
    for (const seg of this.segments) parts.push({ x: seg.x, y: seg.y, r: SEGMENT_RADIUS });
    return parts;
  }

  nearestChasePoint(x: number, y: number): { x: number; y: number } {
    let bx = this.head.x, by = this.head.y, best = (bx - x) * (bx - x) + (by - y) * (by - y);
    for (const seg of this.segments) {
      const dx = seg.x - x, dy = seg.y - y, d = dx * dx + dy * dy;
      if (d < best) { best = d; bx = seg.x; by = seg.y; }
    }
    return { x: bx, y: by };
  }

  ownedWeaponTypes(): WeaponType[] { return this.weapons.map((w) => w.type); }
  mineTier(): number { return 0; }
  mineAtCap() { return false; }
  canMerge(type: WeaponType, slot?: WeaponSlot) {
    if (slot === "segment") return false;
    return this.mergeTargets(type, "head").length > 0;
  }
  mergePreviewTier(type: WeaponType, slot?: WeaponSlot) {
    const match = this.mergeTargets(type, slot)[0];
    return match ? Math.min(WEAPON_TIER_CAP, match.tier + 1) : 1;
  }
  addSegment() { this.spawnSegment(); this.ensureHistoryCapacity(); this.layoutSegments(); }
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
    for (const w of this.weapons) if (w.type === type) this.applyItemModifier(w.segmentIndex, statToBuff, multiplierValue);
  }
  boostSpeed(mul: number, cap = 420) { this.speed = Math.min(cap, this.speed * mul); }
  heal(amount: number) {
    this.headGlow.setFillStyle(0x86efac, 0.62); this.head.setScale(1.08);
    this.scene.time.delayedCall(160, () => { if (!this.head.active) return; this.headGlow.setFillStyle(COLOR.head, 0.16); this.head.setScale(1); });
    return amount;
  }
  fullHeal() {
    this.heal(0);
    for (const s of this.body) { s.hp = s.maxHp; s.isActive = true; s.lastHit = 0; s.segmentSprite.clearTint(); s.segmentSprite.setTint(s.baseTint); }
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
  indexOfSegment(obj: Phaser.GameObjects.GameObject | null | undefined): number {
    if (!obj) return -1;
    const tagged = obj.getData("segIndex");
    if (typeof tagged === "number" && this.segments[tagged] === obj) return tagged;
    return this.segments.indexOf(obj as Phaser.GameObjects.Container);
  }
  deadWeightMul() {
    let dead = 0;
    for (const s of this.body) if (!s.isActive || s.hp <= 0) dead += 1;
    if (dead <= 0) return 1;
    return Math.max(0.55, 1 - dead * 0.08);
  }
  reviveAll() {
    for (const s of this.body) { s.hp = s.maxHp; s.isActive = true; s.lastHit = 0; s.segmentSprite.clearTint(); s.segmentSprite.setTint(s.baseTint); }
  }
  update(dt: number, ax: number, ay: number, now: number, enemies: EnemyScan[], combatOn: boolean) {
    const stunned = now < this.stunUntil;
    const moving = !stunned && (ax !== 0 || ay !== 0);
    const drag = this.deadWeightMul();
    if (stunned) {
      // Knockback slides the head; it decays linearly to 0 over the stun.
      const k = (this.stunUntil - now) / SELF_HIT_STUN_MS;
      this.vx = this.kbVx * k; this.vy = this.kbVy * k;
    } else if (moving) {
      this.facing = Math.atan2(ay, ax);
      this.vx = ax * this.speed * drag; this.vy = ay * this.speed * drag;
    } else { this.vx = 0; this.vy = 0; }
    if (this.vx !== 0 || this.vy !== 0) {
      const nextX = Phaser.Math.Clamp(this.head.x + this.vx * dt, HEAD_RADIUS + 8, WORLD_SIZE - HEAD_RADIUS - 8);
      const nextY = Phaser.Math.Clamp(this.head.y + this.vy * dt, HEAD_RADIUS + 8, WORLD_SIZE - HEAD_RADIUS - 8);
      this.head.setPosition(nextX, nextY);
      this.recordHead();
    }
    this.syncBard(moving);
    if (!this.bard) this.head.setRotation(this.facing); else this.head.setRotation(0);
    this.mounts.setRotation(this.facing);
    this.headGlow.setScale(1 + Math.sin(this.scene.time.now / 280) * 0.04);
    this.layoutSegments(now); this.syncAuras(); this.expireTurrets(now);
    if (combatOn) this.tickWeapons(now, enemies);
  }
  /**
   * Shedding. If any cars are greyed out, all of them detach and explode (returned as "explode").
   * Otherwise the tail car detaches and becomes a stationary turret that keeps firing its weapon for
   * SHED_TURRET_MS. Shed cars and their weapons are gone for good. Returns [] with no cars.
   */
  shed(now: number): ShedResult[] {
    if (this.segments.length === 0) return [];
    const greyed: number[] = [];
    this.body.forEach((s, i) => { if (!s.isActive || s.hp <= 0) greyed.push(i); });
    const out: ShedResult[] = [];
    if (greyed.length > 0) {
      for (const i of greyed) { const seg = this.segments[i]!; out.push({ x: seg.x, y: seg.y, kind: "explode" }); }
      this.removeSegments(new Set(greyed), now, -1);
      return out;
    }
    const tail = this.segments.length - 1;
    const seg = this.segments[tail]!;
    const w = this.weapons.find((weapon) => weapon.segmentIndex === tail);
    out.push({ x: seg.x, y: seg.y, kind: w ? "turret" : "explode", weaponType: w?.type });
    this.removeSegments(new Set([tail]), now, w ? tail : -1);
    return out;
  }
  /** Remove cars, reindex the rest (weapons, segIndex tags, depth), and start the slide. `keepAsTurret` = index to leave behind as a turret. */
  private removeSegments(remove: Set<number>, now: number, keepAsTurret: number) {
    // Surviving cars remember where they are so they can ease into their new trail slots.
    this.slideFrom.clear();
    this.segments.forEach((seg, i) => { if (!remove.has(i)) this.slideFrom.set(seg, { x: seg.x, y: seg.y }); });
    this.slideStart = now;
    const newIndex: number[] = [];
    let n = 0;
    for (let i = 0; i < this.segments.length; i++) newIndex.push(remove.has(i) ? -1 : n++);
    for (let k = this.weapons.length - 1; k >= 0; k--) {
      const w = this.weapons[k]!;
      if (w.segmentIndex < 0) continue;
      if (!remove.has(w.segmentIndex)) { w.segmentIndex = newIndex[w.segmentIndex]!; continue; }
      this.weapons.splice(k, 1);
      if (w.segmentIndex === keepAsTurret) this.spawnTurret(w, this.body[keepAsTurret]!, now);
    }
    for (const i of [...remove].sort((a, b) => b - a)) {
      const s = this.body[i]!;
      s.healthBar.destroy(); s.auraRing?.destroy();
      if (i !== keepAsTurret) s.sprite.destroy(true);
      this.body.splice(i, 1); this.segments.splice(i, 1);
    }
    this.segments.forEach((seg, i) => { seg.setData("segIndex", i); seg.setDepth(18 - Math.min(i, 10)); });
    this.trimHistory();
    this.layoutSegments(now);
  }
  private spawnTurret(w: Weapon, s: BodySegment, now: number) {
    const sprite = s.sprite;
    this.segmentGroup.remove(sprite);
    const body = sprite.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) body.enable = false;
    sprite.setDepth(9);
    s.segmentSprite.clearTint(); s.segmentSprite.setTint(s.baseTint);
    const ring = this.scene.add.circle(sprite.x, sprite.y, SEGMENT_RADIUS + 8, s.baseTint, 0);
    ring.setStrokeStyle(2, s.baseTint, 0.85); ring.setDepth(9);
    this.scene.tweens.add({ targets: sprite, scale: 1.25, duration: 120, yoyo: true, ease: "Quad.easeOut" });
    this.turrets.push({ weapon: w, x: sprite.x, y: sprite.y, until: now + SHED_TURRET_MS, sprite, ring });
  }
  /** Turret ring shrinks as time runs out; expired turrets fade and are destroyed. */
  private expireTurrets(now: number) {
    for (let k = this.turrets.length - 1; k >= 0; k--) {
      const t = this.turrets[k]!;
      const left = (t.until - now) / SHED_TURRET_MS;
      if (left > 0) {
        t.ring.setScale(0.6 + 0.8 * left);
        t.sprite.setAlpha(left < 0.2 ? 0.55 + 0.45 * Math.abs(Math.sin(now / 60)) : 1);
        continue;
      }
      this.turrets.splice(k, 1);
      t.ring.destroy();
      this.scene.tweens.add({ targets: t.sprite, alpha: 0, scale: 0.4, duration: 180, onComplete: () => t.sprite.destroy(true) });
    }
  }
  get stunned() { return this.scene.time.now < this.stunUntil; }
  canSelfHit(now: number) { return now >= this.selfHitReadyAt; }
  /** First segment (past the ignored neck) the head overlaps, or -1. Greyed cars count: they keep their hitbox. */
  selfHitIndex(): number {
    const r = (HEAD_RADIUS + SEGMENT_RADIUS) * SELF_HIT_RADIUS_MUL, r2 = r * r;
    const hx = this.head.x, hy = this.head.y;
    for (let i = SELF_HIT_IGNORE_SEGMENTS; i < this.segments.length; i++) {
      const seg = this.segments[i]!;
      const dx = seg.x - hx, dy = seg.y - hy;
      if (dx * dx + dy * dy < r2) return i;
    }
    return -1;
  }
  /**
   * Coiling: if the head is within COIL_CLOSE_DIST of a car at index >= COIL_MIN_SEGMENT_INDEX and the
   * path between them (head → positionHistory → that car) encloses at least COIL_MIN_AREA, return that
   * loop polygon. Thin loops (e.g. reversing straight back into yourself) return null so SELF-BITE handles them.
   */
  coilLoop(): { index: number; points: { x: number; y: number }[]; area: number } | null {
    if (this.segments.length <= COIL_MIN_SEGMENT_INDEX) return null;
    const hx = this.head.x, hy = this.head.y, r2 = COIL_CLOSE_DIST * COIL_CLOSE_DIST;
    for (let i = COIL_MIN_SEGMENT_INDEX; i < this.segments.length; i++) {
      const seg = this.segments[i]!;
      const dx = seg.x - hx, dy = seg.y - hy;
      if (dx * dx + dy * dy >= r2) continue;
      const points = this.pathPolygonTo(i);
      const area = polygonArea(points);
      if (area >= COIL_MIN_AREA) return { index: i, points, area };
    }
    return null;
  }
  /** Head, then the trail path back to car `index` (same arc-length walk as layoutSegments). */
  private pathPolygonTo(index: number) {
    const target = (index + 1) * SEGMENT_SPACING;
    const hist = this.positionHistory;
    const pts: { x: number; y: number }[] = [{ x: this.head.x, y: this.head.y }];
    let ax = this.head.x, ay = this.head.y, walked = 0;
    for (let k = hist.length - 1; k >= 0; k--) {
      const b = hist[k]!;
      const len = Math.hypot(b.x - ax, b.y - ay);
      if (walked + len >= target) break;
      walked += len; ax = b.x; ay = b.y;
      pts.push({ x: b.x, y: b.y });
    }
    const seg = this.segments[index]!;
    pts.push({ x: seg.x, y: seg.y });
    return pts;
  }
  /** Suppress SELF-BITE until at least `now + ms` (used right after a coil fires). */
  grantSelfHitGrace(now: number, ms: number) { this.selfHitReadyAt = Math.max(this.selfHitReadyAt, now + ms); }
  /** Start the self-hit knockback/stun/cooldown away from segment `index`, with head + segment flash. */
  knockFromSegment(index: number, now: number) {
    const seg = this.segments[index];
    let dx = seg ? this.head.x - seg.x : 0, dy = seg ? this.head.y - seg.y : 0;
    let mag = Math.hypot(dx, dy);
    if (mag < 0.001) { dx = -Math.cos(this.facing); dy = -Math.sin(this.facing); mag = 1; }
    this.kbVx = (dx / mag) * SELF_HIT_KNOCKBACK; this.kbVy = (dy / mag) * SELF_HIT_KNOCKBACK;
    this.stunUntil = now + SELF_HIT_STUN_MS;
    this.selfHitReadyAt = now + SELF_HIT_COOLDOWN_MS;
    this.headGlow.setFillStyle(0xff7a2f, 0.7); this.head.setScale(1.12);
    this.bard?.setTint(0xffb080);
    this.scene.time.delayedCall(SELF_HIT_STUN_MS, () => {
      if (!this.head.active) return;
      this.headGlow.setFillStyle(COLOR.head, 0.16); this.head.setScale(1); this.bard?.clearTint();
    });
    const state = this.body[index];
    if (state) {
      state.segmentSprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(140, () => {
        if (!state.sprite.active) return;
        state.segmentSprite.clearTint(); state.segmentSprite.setTint(state.isActive ? state.baseTint : DEAD_TINT);
      });
    }
  }
  destroy() {
    this.head.destroy(true); this.headAuraRing?.destroy();
    for (const s of this.body) { s.healthBar.destroy(); s.auraRing?.destroy(); s.sprite.destroy(true); }
    for (const t of this.turrets) { t.ring.destroy(); t.sprite.destroy(true); }
    this.turrets.length = 0; this.slideFrom.clear();
    this.segments.length = 0; this.body.length = 0; this.positionHistory.length = 0; this.weapons.length = 0;
  }
  private syncBard(moving: boolean) {
    if (!this.bard) return;
    this.bard.flipX = Math.cos(this.facing) < 0;
    if (moving) { if (this.bard.anims.currentAnim?.key !== BARD_WALK) this.bard.play(BARD_WALK, true); }
    else if (this.bard.anims.isPlaying) { this.bard.stop(); this.bard.setFrame(BARD_IDLE_FRAME); }
  }
  private mergeTargets(type: WeaponType, slot?: WeaponSlot) {
    if (slot === "segment") return [];
    return this.weapons.filter((w) => {
      if (w.type !== type || w.tier >= WEAPON_TIER_CAP) return false;
      return w.segmentIndex < 0;
    }).sort((a, b) => a.tier - b.tier);
  }
  private grantHeadWeapon(type: WeaponType): "merged" | "added" {
    const existing = this.mergeTargets(type, "head")[0];
    if (existing) { bumpTier(existing); this.paintTier(existing); return "merged"; }
    this.headWeaponSeq -= 1;
    const w = makeWeapon(type, this.headWeaponSeq); w.lastFired = this.scene.time.now;
    this.weapons.push(w); this.attachHeadMount(type); return "added";
  }
  private grantSegmentWeapon(type: WeaponType): "merged" | "added" {
    this.addArmedSegment(type);
    return "added";
  }
  private spawnSegment() {
    this.ensureSegTexture();
    const i = this.segments.length;
    const color = i % 2 === 0 ? COLOR.segment : COLOR.segmentAlt;
    const container = this.scene.add.container(this.head.x, this.head.y);
    container.setDepth(18 - Math.min(i, 10));
    container.setSize(SEGMENT_RADIUS * 2, SEGMENT_RADIUS * 2);
    this.scene.physics.add.existing(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false); body.setImmovable(true); body.moves = false;
    body.setCircle(SEGMENT_RADIUS); body.setOffset(-SEGMENT_RADIUS, -SEGMENT_RADIUS);
    container.setData("segIndex", i);
    this.segmentGroup.add(container);
    const halo = this.scene.add.circle(0, 0, SEGMENT_RADIUS + 5, color, 0.16); halo.setName("seg-halo");
    const ring = this.scene.add.circle(0, 0, SEGMENT_RADIUS, color, 0); ring.setStrokeStyle(1.5, COLOR.segmentCore, 0.55); ring.setName("seg-ring");
    const segmentSprite = this.scene.add.image(0, 0, "vs-seg");
    segmentSprite.setDisplaySize(SEGMENT_RADIUS * 2, SEGMENT_RADIUS * 2); segmentSprite.setTint(color);
    const core = this.scene.add.circle(-2, 0, 4, COLOR.segmentCore, 0.85);
    container.add([halo, ring, segmentSprite, core]);
    const healthBar = this.scene.add.graphics(); healthBar.setVisible(false); healthBar.setActive(false);
    this.body.push({ sprite: container, segmentSprite, hp: this.segmentMaxHp, maxHp: this.segmentMaxHp, isActive: true, healthBar, lastHit: 0, baseTint: color });
    this.segments.push(container);
  }
  private ensureSegTexture() {
    if (this.scene.textures.exists("vs-seg")) return;
    const g = this.scene.add.graphics(); g.setVisible(false); g.fillStyle(0xffffff, 1);
    g.fillCircle(SEGMENT_RADIUS, SEGMENT_RADIUS, SEGMENT_RADIUS);
    g.generateTexture("vs-seg", SEGMENT_RADIUS * 2, SEGMENT_RADIUS * 2); g.destroy();
  }
  private greyOut(s: BodySegment) {
    s.isActive = false; s.hp = 0; s.segmentSprite.setTint(DEAD_TINT);
    s.healthBar.clear(); s.healthBar.setVisible(false); if (s.auraRing) s.auraRing.setVisible(false);
  }
  private armSegment(index: number, type: WeaponType) {
    if (this.weapons.some((w) => w.segmentIndex === index)) return;
    this.weapons.push(makeWeapon(type, index)); this.attachMount(index, type); this.paintSegmentWeapon(index, type);
  }
  private paintSegmentWeapon(index: number, type: WeaponType) {
    const state = this.body[index]; const seg = this.segments[index]; if (!state || !seg) return;
    const color = WEAPON_SEGMENT_COLOR[type]; state.baseTint = color; state.weaponType = type; state.segmentSprite.setTint(color);
    const halo = seg.getByName("seg-halo") as Phaser.GameObjects.Arc | null;
    const ring = seg.getByName("seg-ring") as Phaser.GameObjects.Arc | null;
    halo?.setFillStyle(color, 0.22); ring?.setStrokeStyle(1.5, color, 0.8);
  }
  private attachMount(index: number, type: WeaponType) {
    const seg = this.segments[index]; const state = this.body[index]; if (!seg) return;
    if (seg.getData("armed")) return; seg.setData("armed", type);
    if (type === "single_shot") seg.add(this.scene.add.rectangle(11, 0, 14, 5, COLOR.singleShot));
    else if (type === "cone_burst") { seg.add(this.scene.add.rectangle(10, -4, 12, 4, COLOR.coneBurst)); seg.add(this.scene.add.rectangle(10, 4, 12, 4, COLOR.coneBurst)); }
    else if (type === "melee_slash") seg.add(this.scene.add.triangle(12, 0, 0, -6, 16, 0, 0, 6, COLOR.meleeSlash));
    else if (type === "mine_layer") seg.add(this.scene.add.circle(10, 0, 5, COLOR.mine));
    else if (type === "railgun") seg.add(this.scene.add.rectangle(14, 0, 18, 3, COLOR.rail));
    else if (type === "chain_lightning") seg.add(this.scene.add.star(10, 0, 4, 6, 3, COLOR.chain));
    else if (type === "mortar") seg.add(this.scene.add.ellipse(10, 0, 10, 7, COLOR.mortar));
    else if (type === "aura" && state) {
      const ring = this.scene.add.circle(seg.x, seg.y, 78, COLOR.aura, 0.12);
      ring.setStrokeStyle(2, COLOR.aura, 0.55); ring.setDepth(8); state.auraRing = ring;
    }
  }
  private attachHeadMount(type: WeaponType) {
    if (type === "aura" && !this.headAuraRing) {
      const ring = this.scene.add.circle(this.head.x, this.head.y, 78, COLOR.aura, 0.12);
      ring.setStrokeStyle(2, COLOR.aura, 0.55); ring.setDepth(8); this.headAuraRing = ring;
    } else if (type === "cone_burst") {
      this.mounts.add(this.scene.add.rectangle(HEAD_RADIUS + 2, -5, 10, 3, COLOR.coneBurst));
      this.mounts.add(this.scene.add.rectangle(HEAD_RADIUS + 2, 5, 10, 3, COLOR.coneBurst));
    } else if (type === "melee_slash") {
      this.mounts.add(this.scene.add.triangle(HEAD_RADIUS + 4, 0, 0, -5, 12, 0, 0, 5, COLOR.meleeSlash));
    }
  }
  private syncAuras() {
    for (const s of this.body) { if (!s.auraRing) continue; s.auraRing.setPosition(s.sprite.x, s.sprite.y); s.auraRing.setVisible(s.isActive); }
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
    const seg = this.segments[w.segmentIndex]; if (!seg) return;
    seg.setScale(1 + (w.tier - 1) * 0.12);
    const state = this.body[w.segmentIndex];
    if (state?.auraRing) state.auraRing.setRadius(weaponRange(w));
  }
  private headWeaponCount() { return this.weapons.filter((w) => w.segmentIndex < 0).length; }
  private nearestEnemyTo(x: number, y: number, enemies: EnemyScan[]): EnemyScan | null {
    let best: EnemyScan | null = null, bestD = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  private originFor(w: Weapon): { x: number; y: number } | null {
    if (w.segmentIndex < 0) return { x: this.head.x, y: this.head.y };
    const state = this.body[w.segmentIndex]; const seg = this.segments[w.segmentIndex];
    if (!seg || !state || !state.isActive) return null;
    return { x: seg.x, y: seg.y };
  }
  private tickWeapons(now: number, enemies: EnemyScan[]) {
    const seen = new Set<number>();
    for (const w of this.weapons) {
      if (seen.has(w.segmentIndex)) continue; seen.add(w.segmentIndex);
      const origin = this.originFor(w); if (!origin) continue;
      this.tryFire(w, origin, w.segmentIndex < 0, now, enemies);
    }
    // Shed turrets fire like the segment they were (one shot, no head multi-shot).
    for (const t of this.turrets) this.tryFire(t.weapon, { x: t.x, y: t.y }, false, now, enemies);
  }
  private tryFire(w: Weapon, origin: { x: number; y: number }, isHead: boolean, now: number, enemies: EnemyScan[]) {
      const cd = w.type === "mine_layer" ? mineCadenceMs(w) : weaponCooldown(w, this.cooldownMul);
      if (now - w.lastFired < cd) return;
      const dmg = weaponDamage(w, this.damageMul); const range = weaponRange(w);
      if (w.type === "aura") { this.fire({ kind: "aura", x: origin.x, y: origin.y, vx: 0, vy: 0, damage: dmg, color: COLOR.aura, radius: range }); w.lastFired = now; return; }
      if (w.type === "mine_layer") { this.fire({ kind: "mine", x: origin.x, y: origin.y, vx: 0, vy: 0, damage: dmg, color: COLOR.mine, radius: 22 + w.tier * 6 }); w.lastFired = now; return; }
      const target = this.nearestEnemyTo(origin.x, origin.y, enemies); if (!target) return;
      const dx = target.x - origin.x, dy = target.y - origin.y, mag = Math.hypot(dx, dy) || 1;
      if (mag > range) return;
      const angle = Math.atan2(dy, dx), ux = dx / mag, uy = dy / mag;
      if (w.type === "mortar") {
        const aoe = MORTAR_AOE_BASE * this.areaOfEffect * (1 + (w.tier - 1) * 0.2);
        this.fire({ kind: "mortar", x: origin.x, y: origin.y, vx: 0, vy: 0, damage: dmg, color: COLOR.mortar, radius: 7, tx: target.x, ty: target.y, aoe });
        w.lastFired = now; return;
      }
      if (w.type === "single_shot") {
        const shots = isHead ? Math.max(1, w.tier) : 1;
        const mid = (shots - 1) / 2;
        const spread = shots > 1 ? 0.1 : 0;
        for (let i = 0; i < shots; i++) {
          const a = angle + (i - mid) * spread;
          this.fire({ kind: "bullet", x: origin.x + Math.cos(a) * 16, y: origin.y + Math.sin(a) * 16, vx: Math.cos(a) * SHOT_SPEED, vy: Math.sin(a) * SHOT_SPEED, damage: dmg, color: COLOR.singleShot, radius: 4, hitSpark: true });
        }
      } else if (w.type === "cone_burst") {
        const pellets = isHead ? 3 * Math.max(1, w.tier) : 3;
        const mid = (pellets - 1) / 2;
        const spread = pellets > 5 ? CONE_SPREAD * 0.72 : CONE_SPREAD;
        for (let i = 0; i < pellets; i++) {
          const a = angle + (i - mid) * spread;
          this.fire({ kind: "bullet", x: origin.x + Math.cos(a) * 14, y: origin.y + Math.sin(a) * 14, vx: Math.cos(a) * CONE_SPEED, vy: Math.sin(a) * CONE_SPEED, damage: dmg, color: COLOR.coneBurst, radius: 3.5 });
        }
      } else if (w.type === "railgun") this.fire({ kind: "bullet", x: origin.x + ux * 18, y: origin.y + uy * 18, vx: ux * RAIL_SPEED, vy: uy * RAIL_SPEED, damage: dmg, color: COLOR.rail, radius: 3, pierce: true });
      else if (w.type === "chain_lightning") this.fire({ kind: "chain", x: origin.x, y: origin.y, vx: ux * 640, vy: uy * 640, damage: dmg, color: COLOR.chain, radius: 6, bounces: CHAIN_BOUNCES, bounceRadius: CHAIN_RADIUS });
      else {
        const hits = isHead ? Math.max(1, w.tier) : 1;
        const arc = SLASH_ARC * (1 + (hits - 1) * 0.32);
        const slashRange = range * (1 + (hits - 1) * 0.1);
        for (let i = 0; i < hits; i++) {
          const off = hits > 1 ? (i - (hits - 1) / 2) * 0.38 : 0;
          const slashAngle = angle + off;
          this.playSlash(origin.x, origin.y, slashAngle, slashRange, arc);
          this.fire({ kind: "slash", x: origin.x, y: origin.y, vx: 0, vy: 0, damage: dmg, color: COLOR.meleeSlash, radius: slashRange, angle: slashAngle, range: slashRange, arc });
        }
      }
      w.lastFired = now;
  }
  private playSlash(x: number, y: number, angle: number, range: number, arc: number) {
    const g = this.scene.add.graphics(); g.setDepth(19); g.setPosition(x, y);
    g.fillStyle(COLOR.meleeSlash, 0.42); g.slice(0, 0, range, angle - arc / 2, angle + arc / 2, false); g.fillPath();
    g.lineStyle(2.4, 0xfff4c8, 0.95); g.beginPath(); g.arc(0, 0, range * 0.92, angle - arc / 2, angle + arc / 2, false); g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.12, scaleY: 1.12, duration: 170, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
  }
  /**
   * Distance-based trail: segment i sits (i + 1) × SEGMENT_SPACING px of path behind the head,
   * walking head → newest → oldest positionHistory point and interpolating inside each piece.
   * Spacing no longer depends on frame rate or speed.
   */
  private layoutSegments(now = this.scene.time.now) {
    const hist = this.positionHistory;
    let ax = this.head.x, ay = this.head.y; // start of the current path piece
    let aheadX = ax, aheadY = ay; // previous car (or head), for rotation
    let walked = 0; // path length from head to (ax, ay)
    let idx = hist.length - 1;
    // Post-shed slide: ease (cubic out) from the pre-shed spot to the trail spot over SHED_SLIDE_MS.
    let slideT = 1;
    if (this.slideFrom.size > 0) {
      const t = (now - this.slideStart) / SHED_SLIDE_MS;
      if (t >= 1) this.slideFrom.clear(); else slideT = 1 - Math.pow(1 - Math.max(0, t), 3);
    }
    for (let i = 0; i < this.segments.length; i++) {
      const target = (i + 1) * SEGMENT_SPACING;
      let px = ax, py = ay;
      while (idx >= 0) {
        const b = hist[idx]!;
        const len = Math.hypot(b.x - ax, b.y - ay);
        if (len > 0 && walked + len >= target) {
          const t = (target - walked) / len;
          px = ax + (b.x - ax) * t; py = ay + (b.y - ay) * t;
          break;
        }
        walked += len; ax = b.x; ay = b.y; px = ax; py = ay; idx--;
      }
      const seg = this.segments[i]!;
      if (slideT < 1) {
        const from = this.slideFrom.get(seg);
        if (from) { px = from.x + (px - from.x) * slideT; py = from.y + (py - from.y) * slideT; }
      }
      seg.setPosition(px, py);
      const ang = Math.atan2(aheadY - py, aheadX - px);
      if (Number.isFinite(ang) && (aheadX !== px || aheadY !== py)) seg.setRotation(ang);
      aheadX = px; aheadY = py;
      const body = seg.body as Phaser.Physics.Arcade.Body | undefined;
      if (body) body.updateFromGameObject();
    }
  }
  /** Path length the history must cover for `count` segments (plus slack). */
  private trailLengthFor(count: number) { return (count + 4) * SEGMENT_SPACING + 48; }
  /** Commit the head as a new history point once it has moved HISTORY_MIN_STEP px. */
  private recordHead() {
    const last = this.positionHistory[this.positionHistory.length - 1];
    if (last && Math.hypot(this.head.x - last.x, this.head.y - last.y) < HISTORY_MIN_STEP) return;
    this.positionHistory.push({ x: this.head.x, y: this.head.y });
    this.trimHistory();
  }
  /** Path length from the head back to the oldest history point. */
  private historyLength() {
    const hist = this.positionHistory;
    let len = 0, px = this.head.x, py = this.head.y;
    for (let i = hist.length - 1; i >= 0; i--) { const p = hist[i]!; len += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y; }
    return len;
  }
  /** New cars append at the tail: extend the oldest end of the path straight back if it is too short. */
  private ensureHistoryCapacity() {
    const missing = this.trailLengthFor(this.segments.length) - this.historyLength();
    if (missing <= 0) return;
    const hist = this.positionHistory;
    const oldest = hist[0] ?? { x: this.head.x, y: this.head.y };
    let dx = -Math.cos(this.facing), dy = -Math.sin(this.facing);
    for (let i = 1; i <= hist.length; i++) {
      const p = i < hist.length ? hist[i]! : { x: this.head.x, y: this.head.y };
      const m = Math.hypot(oldest.x - p.x, oldest.y - p.y);
      if (m > 0.001) { dx = (oldest.x - p.x) / m; dy = (oldest.y - p.y) / m; break; }
    }
    hist.unshift({ x: oldest.x + dx * missing, y: oldest.y + dy * missing });
  }
  /** Drop history older than the body needs (keeps one point past the limit for interpolation). */
  private trimHistory() {
    const hist = this.positionHistory;
    const max = this.trailLengthFor(this.segments.length);
    let len = 0, px = this.head.x, py = this.head.y;
    for (let i = hist.length - 1; i >= 0; i--) {
      const p = hist[i]!; len += Math.hypot(p.x - px, p.y - py); px = p.x; py = p.y;
      if (len > max) { if (i > 0) hist.splice(0, i); return; }
    }
  }
}

/** Absolute shoelace area of a closed polygon. */
function polygonArea(pts: { x: number; y: number }[]) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += (pts[j]!.x + pts[i]!.x) * (pts[j]!.y - pts[i]!.y);
  return Math.abs(s) / 2;
}
