export type WeaponType =
  | "single_shot"
  | "cone_burst"
  | "melee_slash"
  | "mine_layer"
  | "railgun"
  | "chain_lightning"
  | "aura"
  | "mortar";

export type WeaponStat = "damage" | "range" | "fireRate";

export type WeaponTier = 1 | 2 | 3;

export type WeaponSlot = "head" | "segment";

export const WEAPON_TIER_CAP: WeaponTier = 3;

export interface Weapon {
  type: WeaponType;
  segmentIndex: number;
  lastFired: number;
  baseDamage: number;
  baseRange: number;
  baseFireRate: number;
  damageMultiplier: number;
  rangeMultiplier: number;
  fireRateMultiplier: number;
  tier: WeaponTier;
}

/** Alive-enemy snapshot used for per-segment targeting. Not the head. */
export type EnemyScan = {
  x: number;
  y: number;
  alive: boolean;
};

export type FireEvent = {
  kind: "bullet" | "slash" | "mine" | "chain" | "aura" | "mortar";
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: number;
  radius: number;
  angle?: number;
  range?: number;
  arc?: number;
  pierce?: boolean;
  bounces?: number;
  bounceRadius?: number;
  tx?: number;
  ty?: number;
  aoe?: number;
  /** Play the single-shot hit spritesheet on impact. */
  hitSpark?: boolean;
};

type Proto = {
  baseDamage: number;
  baseRange: number;
  baseFireRate: number;
};

const PROTOS: Record<WeaponType, Proto> = {
  single_shot: { baseDamage: 6, baseRange: 460, baseFireRate: 280 },
  cone_burst: { baseDamage: 4, baseRange: 240, baseFireRate: 460 },
  melee_slash: { baseDamage: 11, baseRange: 92, baseFireRate: 320 },
  mine_layer: { baseDamage: 16, baseRange: 48, baseFireRate: 3000 },
  railgun: { baseDamage: 9, baseRange: 620, baseFireRate: 640 },
  chain_lightning: { baseDamage: 7, baseRange: 340, baseFireRate: 520 },
  aura: { baseDamage: 3, baseRange: 78, baseFireRate: 500 },
  mortar: { baseDamage: 18, baseRange: 540, baseFireRate: 1600 },
};

export const HEAD_WEAPONS: WeaponType[] = [
  "aura",
  "melee_slash",
  "cone_burst",
  "single_shot",
];

export const SEGMENT_WEAPONS: WeaponType[] = [
  "railgun",
  "chain_lightning",
  "mine_layer",
  "single_shot",
  "mortar",
];

/** Historical cycle kept for any leftover callers. */
export const WEAPON_CYCLE: WeaponType[] = [
  "single_shot",
  "cone_burst",
  "melee_slash",
  "mine_layer",
  "railgun",
  "chain_lightning",
  "aura",
  "mortar",
];

export const WEAPON_LABEL: Record<WeaponType, string> = {
  single_shot: "Single shot",
  cone_burst: "Cone burst",
  melee_slash: "Melee slash",
  mine_layer: "Mine layer",
  railgun: "Penetrating railgun",
  chain_lightning: "Chain lightning",
  aura: "Garlic aura",
  mortar: "Mortar",
};

/** Segment body tint by equipped weapon. */
export const WEAPON_SEGMENT_COLOR: Record<WeaponType, number> = {
  railgun: 0xef4444,
  chain_lightning: 0x22d3ee,
  mine_layer: 0x9ca3af,
  mortar: 0x22c55e,
  single_shot: 0xfacc15,
  cone_burst: 0x7dd3fc,
  melee_slash: 0xfbbf24,
  aura: 0xa3e635,
};

export const MINE_ARM_MS = 2000;
export const MINE_BASE_CADENCE_MS = 3000;
export const MINE_TIER_CADENCE_STEP_MS = 350;
export const MORTAR_SPEED = 190;
export const MORTAR_AOE_BASE = 78;

export function isHeadWeapon(type: WeaponType) {
  return HEAD_WEAPONS.includes(type);
}

export function isSegmentWeapon(type: WeaponType) {
  return SEGMENT_WEAPONS.includes(type);
}

export function makeWeapon(type: WeaponType, segmentIndex: number, tier: WeaponTier = 1): Weapon {
  const proto = PROTOS[type];
  return {
    type,
    segmentIndex,
    lastFired: 0,
    baseDamage: proto.baseDamage,
    baseRange: proto.baseRange,
    baseFireRate: proto.baseFireRate,
    damageMultiplier: 1,
    rangeMultiplier: 1,
    fireRateMultiplier: 1,
    tier,
  };
}

/** Head-only start: no trailing loadout. */
export function defaultLoadout(segmentCount: number): Weapon[] {
  return Array.from({ length: segmentCount }, (_, i) =>
    makeWeapon(SEGMENT_WEAPONS[i % SEGMENT_WEAPONS.length]!, i),
  );
}

export function randomWeaponType(): WeaponType {
  return SEGMENT_WEAPONS[Math.floor(Math.random() * SEGMENT_WEAPONS.length)]!;
}

export function randomHeadWeaponType(): WeaponType {
  return HEAD_WEAPONS[Math.floor(Math.random() * HEAD_WEAPONS.length)]!;
}

export function randomSegmentWeaponType(excludeMine = false): WeaponType {
  const pool = excludeMine
    ? SEGMENT_WEAPONS.filter((t) => t !== "mine_layer")
    : SEGMENT_WEAPONS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function weaponDamage(w: Weapon, globalMul = 1) {
  const tierMul = 1 + (w.tier - 1) * 0.55;
  return Math.max(1, Math.round(w.baseDamage * w.damageMultiplier * tierMul * globalMul));
}

export function weaponRange(w: Weapon) {
  const tierMul = 1 + (w.tier - 1) * 0.18;
  return w.baseRange * w.rangeMultiplier * tierMul;
}

/** Cooldown in ms. fireRateMultiplier > 1 fires more often. */
export function weaponCooldown(w: Weapon, globalCdr = 1) {
  if (w.type === "mine_layer") return mineCadenceMs(w);
  return Math.max(80, w.baseFireRate / (w.fireRateMultiplier * globalCdr));
}

/** Mine cadence ignores GlobalStats cooldown reduction. Steady 3s per mine car. */
export function mineCadenceMs(_w: Weapon) {
  return MINE_BASE_CADENCE_MS;
}

export function nextWeaponType(index: number): WeaponType {
  return WEAPON_CYCLE[index % WEAPON_CYCLE.length]!;
}

export function bumpTier(w: Weapon): WeaponTier {
  const next = Math.min(WEAPON_TIER_CAP, (w.tier + 1) as WeaponTier) as WeaponTier;
  w.tier = next;
  return next;
}
