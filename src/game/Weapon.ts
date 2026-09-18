export type WeaponType = "single_shot" | "cone_burst" | "melee_slash";

export type WeaponStat = "damage" | "range" | "fireRate";

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
}

/** Alive-enemy snapshot used for per-segment targeting. Not the head. */
export type EnemyScan = {
  x: number;
  y: number;
  alive: boolean;
};

export type FireEvent = {
  kind: "bullet" | "slash";
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
};

const CYCLE: WeaponType[] = ["single_shot", "cone_burst", "melee_slash"];

export function makeWeapon(type: WeaponType, segmentIndex: number): Weapon {
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
  };
}

/** Exactly one distinct weapon per trailing segment. Cycles the three types. */
export function defaultLoadout(segmentCount: number): Weapon[] {
  return Array.from({ length: segmentCount }, (_, i) => makeWeapon(CYCLE[i % CYCLE.length]!, i));
}

export function weaponDamage(w: Weapon) {
  return Math.max(1, Math.round(w.baseDamage * w.damageMultiplier));
}

export function weaponRange(w: Weapon) {
  return w.baseRange * w.rangeMultiplier;
}

/** Cooldown in ms. fireRateMultiplier > 1 fires more often. */
export function weaponCooldown(w: Weapon) {
  return Math.max(80, w.baseFireRate / w.fireRateMultiplier);
}

export function nextWeaponType(index: number): WeaponType {
  return CYCLE[index % CYCLE.length]!;
}
