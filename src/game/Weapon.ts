export type WeaponType = "blaster" | "turret" | "blade";

export interface Weapon {
  type: WeaponType;
  segmentIndex: number;
  fireRate: number;
  lastFired: number;
  damage: number;
}

/** Alive-enemy snapshot used for per-segment targeting. Not the head. */
export type EnemyScan = {
  x: number;
  y: number;
  alive: boolean;
};

export type FireEvent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: number;
  radius: number;
};

const PROTOS: Record<WeaponType, { fireRate: number; damage: number }> = {
  blaster: { fireRate: 280, damage: 6 },
  turret: { fireRate: 420, damage: 8 },
  blade: { fireRate: 160, damage: 5 },
};

const CYCLE: WeaponType[] = ["blaster", "turret", "blade"];

export function makeWeapon(type: WeaponType, segmentIndex: number): Weapon {
  const proto = PROTOS[type];
  return {
    type,
    segmentIndex,
    fireRate: proto.fireRate,
    lastFired: 0,
    damage: proto.damage,
  };
}

/** One independent weapon per trailing segment. Cycles blaster / turret / blade. */
export function defaultLoadout(segmentCount: number): Weapon[] {
  return Array.from({ length: segmentCount }, (_, i) => makeWeapon(CYCLE[i % CYCLE.length]!, i));
}
