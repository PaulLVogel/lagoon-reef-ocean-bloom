export type WeaponType = "blaster" | "turret" | "blade";

export interface Weapon {
  type: WeaponType;
  segmentIndex: number;
  fireRate: number;
  lastFired: number;
  damage: number;
}

export function defaultLoadout(): Weapon[] {
  return [
    { type: "blaster", segmentIndex: 0, fireRate: 280, lastFired: 0, damage: 6 },
    { type: "turret", segmentIndex: 1, fireRate: 420, lastFired: 0, damage: 8 },
    { type: "blade", segmentIndex: 2, fireRate: 160, lastFired: 0, damage: 5 },
  ];
}

export type AimPoint = { x: number; y: number };

export type FireEvent = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: number;
  radius: number;
};
