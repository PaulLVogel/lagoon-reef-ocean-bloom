export type WeaponType =
  | "single_shot"
  | "cone_burst"
  | "melee_slash"
  | "mine_layer"
  | "railgun"
  | "chain_lightning"
  | "aura";

export type WeaponStat = "damage" | "range" | "fireRate";

export type WeaponTier = 1 | 2 | 3;

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

export type EnemyScan = {
  x: number;
  y: number;
  alive: boolean;
};

export type FireEvent = {
  kind: "bullet" | "slash" | "mine" | "chain" | "aura";
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
  mine_layer: { baseDamage: 16, baseRange: 48, baseFireRate: 900 },
  railgun: { baseDamage: 9, baseRange: 620, baseFireRate: 640 },
  chain_lightning: { baseDamage: 7, baseRange: 340, baseFireRate: 520 },
  aura: { baseDamage: 3, baseRange: 78, baseFireRate: 500 },
};

export const WEAPON_CYCLE: WeaponType[] = [
  "single_shot",
  "cone_burst",
  "melee_slash",
  "mine_layer",
  "railgun",
  "chain_lightning",
  "aura",
];

export const WEAPON_LABEL: Record<WeaponType, string> = {
  single_shot: "Single shot",
  cone_burst: "Cone burst",
  melee_slash: "Melee slash",
  mine_layer: "Mine layer",
  railgun: "Railgun",
  chain_lightning: "Chain lightning",
  aura: "Garlic aura",
};

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

export function defaultLoadout(segmentCount: number): Weapon[] {
  return Array.from({ length: segmentCount }, (_, i) => makeWeapon(WEAPON_CYCLE[i % WEAPON_CYCLE.length]!, i));
}

export function randomWeaponType(): WeaponType {
  return WEAPON_CYCLE[Math.floor(Math.random() * WEAPON_CYCLE.length)]!;
}

export function weaponDamage(w: Weapon, globalMul = 1) {
  const tierMul = 1 + (w.tier - 1) * 0.55;
  return Math.max(1, Math.round(w.baseDamage * w.damageMultiplier * tierMul * globalMul));
}

export function weaponRange(w: Weapon) {
  const tierMul = 1 + (w.tier - 1) * 0.18;
  return w.baseRange * w.rangeMultiplier * tierMul;
}

export function weaponCooldown(w: Weapon, globalCdr = 1) {
  return Math.max(80, w.baseFireRate / (w.fireRateMultiplier * globalCdr));
}

export function nextWeaponType(index: number): WeaponType {
  return WEAPON_CYCLE[index % WEAPON_CYCLE.length]!;
}

export function bumpTier(w: Weapon): WeaponTier {
  const next = Math.min(WEAPON_TIER_CAP, (w.tier + 1) as WeaponTier) as WeaponTier;
  w.tier = next;
  return next;
}
