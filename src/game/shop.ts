export type ShopKind =
  | "add_blaster"
  | "turret_rate"
  | "snake_speed"
  | "blaster_rate"
  | "turret_dmg"
  | "heal";

export type ShopOffer = {
  id: string;
  kind: ShopKind;
  title: string;
  blurb: string;
};

const CATALOG: Omit<ShopOffer, "id">[] = [
  {
    kind: "add_blaster",
    title: "New blaster segment",
    blurb: "Grow the tail. Extra barrel fires along facing.",
  },
  {
    kind: "turret_rate",
    title: "Turret cadence",
    blurb: "Aiming mounts cycle 20% faster.",
  },
  {
    kind: "snake_speed",
    title: "Coil speed",
    blurb: "Head moves 18% faster. Trail keeps the same stride.",
  },
  {
    kind: "blaster_rate",
    title: "Blaster cadence",
    blurb: "Forward guns cycle 20% faster.",
  },
  {
    kind: "turret_dmg",
    title: "Turret cores",
    blurb: "Seeking shots deal +3 damage.",
  },
  {
    kind: "heal",
    title: "Mend scales",
    blurb: "Restore 30 HP, capped at max.",
  },
];

export const MAX_SEGMENTS = 14;

export function rollShopOffers(wave: number, segments: number): ShopOffer[] {
  const pool = CATALOG.filter((c) => {
    if (c.kind === "add_blaster" && segments >= MAX_SEGMENTS) return false;
    return true;
  });
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
