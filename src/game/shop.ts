export type ShopKind =
  | "add_blaster"
  | "turret_rate"
  | "snake_speed"
  | "blaster_rate"
  | "turret_dmg"
  | "heal"
  | "pickup_radius"
  | "segment_vacuum";

export type ShopOffer = {
  id: string;
  kind: ShopKind;
  title: string;
  blurb: string;
  cost: number;
};

const CATALOG: Omit<ShopOffer, "id">[] = [
  {
    kind: "add_blaster",
    title: "New blaster segment",
    blurb: "Grow the tail. Extra barrel fires along facing.",
    cost: 36,
  },
  {
    kind: "turret_rate",
    title: "Turret cadence",
    blurb: "Aiming mounts cycle 20% faster.",
    cost: 20,
  },
  {
    kind: "snake_speed",
    title: "Coil speed",
    blurb: "Head moves 18% faster. Trail keeps the same stride.",
    cost: 28,
  },
  {
    kind: "blaster_rate",
    title: "Blaster cadence",
    blurb: "Forward guns cycle 20% faster.",
    cost: 20,
  },
  {
    kind: "turret_dmg",
    title: "Turret cores",
    blurb: "Seeking shots deal +3 damage.",
    cost: 24,
  },
  {
    kind: "heal",
    title: "Mend scales",
    blurb: "Restore 30 HP, capped at max.",
    cost: 12,
  },
  {
    kind: "pickup_radius",
    title: "Wide maw",
    blurb: "Head pickup circle grows. Gems vacuum from farther out.",
    cost: 22,
  },
  {
    kind: "segment_vacuum",
    title: "Coil vacuum",
    blurb: "High-tier: segments pull nearby gems toward the head.",
    cost: 52,
  },
];

export const MAX_SEGMENTS = 14;

export function rollShopOffers(
  wave: number,
  segments: number,
  owned: { segmentVacuum?: boolean } = {},
): ShopOffer[] {
  const scale = 1 + (wave - 1) * 0.15;
  const pool = CATALOG.filter((c) => {
    if (c.kind === "add_blaster" && segments >= MAX_SEGMENTS) return false;
    if (c.kind === "segment_vacuum" && owned.segmentVacuum) return false;
    return true;
  }).map((c) => ({
    ...c,
    cost: Math.max(1, Math.round(c.cost * scale)),
  }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, 3).map((c, i) => ({
    ...c,
    id: `${c.kind}-w${wave}-${i}`,
  }));
}

export function canAffordAny(gold: number, offers: ShopOffer[]) {
  return offers.some((o) => gold >= o.cost);
}
