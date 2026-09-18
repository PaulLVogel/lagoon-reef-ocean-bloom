export type ShopKind =
  | "add_blaster"
  | "add_2_blasters"
  | "turret_rate"
  | "snake_speed"
  | "blaster_rate"
  | "turret_dmg"
  | "heal"
  | "pickup_radius"
  | "segment_vacuum"
  | "credit_card";

export type ShopRarity = "common" | "rare" | "legendary";

export type ShopOffer = {
  id: string;
  kind: ShopKind;
  title: string;
  blurb: string;
  cost: number;
  rarity: ShopRarity;
};

type CatalogItem = Omit<ShopOffer, "id">;

const CATALOG: CatalogItem[] = [
  {
    kind: "heal",
    title: "Mend scales",
    blurb: "Restore 30 HP, capped at max.",
    cost: 12,
    rarity: "common",
  },
  {
    kind: "turret_rate",
    title: "Turret Rate +1",
    blurb: "Aiming mounts cycle 20% faster.",
    cost: 20,
    rarity: "common",
  },
  {
    kind: "blaster_rate",
    title: "Blaster cadence",
    blurb: "Forward guns cycle 20% faster.",
    cost: 20,
    rarity: "common",
  },
  {
    kind: "pickup_radius",
    title: "Wide maw",
    blurb: "Head pickup circle grows. Gems vacuum from farther out.",
    cost: 22,
    rarity: "common",
  },
  {
    kind: "turret_dmg",
    title: "Turret cores",
    blurb: "Seeking shots deal +3 damage.",
    cost: 24,
    rarity: "rare",
  },
  {
    kind: "snake_speed",
    title: "Coil speed",
    blurb: "Head moves 18% faster. Trail keeps the same stride.",
    cost: 28,
    rarity: "rare",
  },
  {
    kind: "add_blaster",
    title: "New blaster segment",
    blurb: "Grow the tail. Extra barrel fires along facing.",
    cost: 36,
    rarity: "rare",
  },
  {
    kind: "segment_vacuum",
    title: "Coil vacuum",
    blurb: "High-tier: segments pull nearby gems toward the head.",
    cost: 52,
    rarity: "legendary",
  },
  {
    kind: "add_2_blasters",
    title: "Add 2 Blaster Segments",
    blurb: "Legendary: grow two armed barrels at once.",
    cost: 88,
    rarity: "legendary",
  },
  {
    kind: "credit_card",
    title: "Credit card",
    blurb: "Overdraft: +2 blaster segments and +18% speed now. Gold may go negative. No interest while in debt.",
    cost: 48,
    rarity: "rare",
  },
];

export const MAX_SEGMENTS = 14;
export const SHOP_REROLL_COST = 5;
export const SHOP_INTEREST_RATE = 0.1;
export const SHOP_COST_GROWTH = 1.5;
export const SHOP_PITY_HP = 10;
export const SHOP_PITY_GOLD = 2;

const WEIGHT_LEGENDARY = 5;
const WEIGHT_RARE = 25;

export function purchasesOf(history: ShopKind[], kind: ShopKind) {
  return history.filter((k) => k === kind).length;
}

export function scaledOfferCost(base: number, wave: number, bought: number) {
  const waveScale = 1 + (wave - 1) * 0.15;
  return Math.max(1, Math.round(base * SHOP_COST_GROWTH ** bought * waveScale));
}

export function bankInterest(gold: number) {
  return Math.floor(Math.max(0, gold) * SHOP_INTEREST_RATE);
}

function rollRarity(): ShopRarity {
  const n = Math.random() * 100;
  if (n < WEIGHT_LEGENDARY) return "legendary";
  if (n < WEIGHT_LEGENDARY + WEIGHT_RARE) return "rare";
  return "common";
}

function pickOne<T>(list: T[]): T | undefined {
  if (!list.length) return undefined;
  return list[Math.floor(Math.random() * list.length)];
}

export function rollShopOffers(
  wave: number,
  segments: number,
  owned: { segmentVacuum?: boolean } = {},
  history: ShopKind[] = [],
): ShopOffer[] {
  const pool = CATALOG.filter((c) => {
    if (c.kind === "add_blaster" && segments >= MAX_SEGMENTS) return false;
    if (c.kind === "add_2_blasters" && segments + 2 > MAX_SEGMENTS) return false;
    if (c.kind === "segment_vacuum" && owned.segmentVacuum) return false;
    if (c.kind === "credit_card" && purchasesOf(history, "credit_card") > 0) return false;
    return true;
  });

  const taken = new Set<ShopKind>();
  const offers: ShopOffer[] = [];
  for (let i = 0; i < 3; i++) {
    const rarity = rollRarity();
    const unused = pool.filter((c) => !taken.has(c.kind));
    const preferred = unused.filter((c) => c.rarity === rarity);
    const item = pickOne(preferred.length ? preferred : unused);
    if (!item) break;
    taken.add(item.kind);
    offers.push({
      ...item,
      cost: scaledOfferCost(item.cost, wave, purchasesOf(history, item.kind)),
      id: `${item.kind}-w${wave}-${i}-${Date.now().toString(36)}`,
    });
  }
  return offers;
}

export function allowsOverdraft(kind: ShopKind) {
  return kind === "credit_card";
}

export function canAffordOffer(gold: number, offer: ShopOffer) {
  if (allowsOverdraft(offer.kind)) return true;
  return gold >= offer.cost;
}

export function canAffordAny(gold: number, offers: ShopOffer[]) {
  return offers.some((o) => canAffordOffer(gold, o));
}

export function offersFromKinds(
  kinds: ShopKind[],
  wave: number,
  history: ShopKind[] = [],
): ShopOffer[] {
  const offers: ShopOffer[] = [];
  kinds.forEach((kind, i) => {
    const item = CATALOG.find((c) => c.kind === kind);
    if (!item) return;
    offers.push({
      ...item,
      cost: scaledOfferCost(item.cost, wave, purchasesOf(history, kind)),
      id: `${item.kind}-w${wave}-held-${i}`,
    });
  });
  return offers;
}
