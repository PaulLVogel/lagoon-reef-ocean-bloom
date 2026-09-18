import { GLOBAL_STAT_CATALOG } from "./stats";
import {
  HEAD_WEAPONS,
  randomHeadWeaponType,
  randomSegmentWeaponType,
  SEGMENT_WEAPONS,
  WEAPON_LABEL,
  WEAPON_TIER_CAP,
  type WeaponSlot,
  type WeaponType,
} from "./Weapon";

export type ShopKind =
  | "add_blaster"
  | "add_head_weapon"
  | "add_2_blasters"
  | "turret_rate"
  | "snake_speed"
  | "blaster_rate"
  | "turret_dmg"
  | "heal"
  | "pickup_radius"
  | "segment_vacuum"
  | "credit_card"
  | "stat_max_hp"
  | "stat_move_speed"
  | "stat_cooldown"
  | "stat_damage"
  | "stat_pickup"
  | "stat_armor";

export type ShopRarity = "common" | "rare" | "legendary";

export type ShopOffer = {
  id: string;
  kind: ShopKind;
  title: string;
  blurb: string;
  cost: number;
  rarity: ShopRarity;
  weaponType?: WeaponType;
  weaponSlot?: WeaponSlot;
  merge?: boolean;
  mergeToTier?: number;
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
    kind: "add_head_weapon",
    title: "Head Upgrade",
    blurb: "Attach a head-pool weapon to the bard. Does not grow a segment.",
    cost: 32,
    rarity: "rare",
  },
  {
    kind: "add_blaster",
    title: "New Segment",
    blurb: "Grow the tail with one rolled segment weapon, or merge a duplicate up a tier.",
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
    title: "Add 2 weapon segments",
    blurb: "Legendary: two rolled segment weapons, each merging if you already own the type.",
    cost: 88,
    rarity: "legendary",
  },
  {
    kind: "credit_card",
    title: "Credit card",
    blurb: "Overdraft: +2 rolled segment weapons and +18% speed now. Gold may go negative.",
    cost: 48,
    rarity: "rare",
  },
  ...GLOBAL_STAT_CATALOG.map((s) => ({
    kind: (`stat_${s.stat === "pickup_radius" ? "pickup" : s.stat}`) as ShopKind,
    title: s.shopTitle,
    blurb: s.shopBlurb,
    cost: s.cost,
    rarity: s.rarity,
  })),
];

export const MAX_SEGMENTS = 14;
export const SHOP_SLOTS = 6;
export const SHOP_REROLL_COST = 5;
export const SHOP_INTEREST_RATE = 0.1;
export const SHOP_COST_GROWTH = 1.5;
export const SHOP_PITY_HP = 10;
export const SHOP_PITY_GOLD = 2;

const WEIGHT_LEGENDARY = 5;
const WEIGHT_RARE = 25;

export type ShopOwned = {
  segmentVacuum?: boolean;
  canMerge?: (type: WeaponType, slot?: WeaponSlot) => boolean;
  mergeToTier?: (type: WeaponType, slot?: WeaponSlot) => number;
  segmentCount?: number;
  mineTier?: number;
};

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

function rollHeadType(): WeaponType {
  return randomHeadWeaponType();
}

function rollSegmentType(owned: ShopOwned): WeaponType {
  const mineCap = (owned.mineTier ?? 0) >= WEAPON_TIER_CAP;
  return randomSegmentWeaponType(mineCap);
}

function decorateWeaponOffer(item: CatalogItem, owned: ShopOwned): CatalogItem {
  if (item.kind === "add_head_weapon") {
    const weaponType = rollHeadType();
    const merge = owned.canMerge?.(weaponType, "head") ?? false;
    const mergeToTier = owned.mergeToTier?.(weaponType, "head") ?? 2;
    const label = WEAPON_LABEL[weaponType];
    if (merge) {
      return {
        ...item,
        weaponType,
        weaponSlot: "head",
        merge: true,
        mergeToTier,
        title: `Head Upgrade: Merge ${label} → T${mergeToTier}`,
        blurb: `Combine with the ${label} already on the head. Caps at Tier 3.`,
      };
    }
    return {
      ...item,
      weaponType,
      weaponSlot: "head",
      merge: false,
      title: `Head Upgrade: ${label}`,
      blurb: `Attach ${label.toLowerCase()} to the head attack loop. Does not grow a segment.`,
    };
  }
  if (item.kind !== "add_blaster") return item;
  const weaponType = rollSegmentType(owned);
  const merge = owned.canMerge?.(weaponType, "segment") ?? false;
  const mergeToTier = owned.mergeToTier?.(weaponType, "segment") ?? 2;
  const label = WEAPON_LABEL[weaponType];
  if (merge) {
    return {
      ...item,
      weaponType,
      weaponSlot: "segment",
      merge: true,
      mergeToTier,
      title: `Merge ${label} → T${mergeToTier}`,
      blurb:
        weaponType === "mine_layer"
          ? `Upgrade the only Mine layer segment. Caps at Tier 3, then it leaves the pool.`
          : `Combine with your ${label} instead of growing a new segment. Caps at Tier 3.`,
    };
  }
  return {
    ...item,
    weaponType,
    weaponSlot: "segment",
    merge: false,
    title: `New Segment: ${label}`,
    blurb: `Grow the tail. This segment fires only ${label.toLowerCase()}.`,
  };
}

export function rollShopOffers(
  wave: number,
  segments: number,
  owned: ShopOwned = {},
  history: ShopKind[] = [],
  held: (ShopOffer | null)[] = Array.from({ length: SHOP_SLOTS }, () => null),
): ShopOffer[] {
  const pool = CATALOG.filter((c) => {
    if (c.kind === "add_blaster" && segments >= MAX_SEGMENTS && !owned.canMerge) return false;
    if (c.kind === "add_2_blasters" && segments + 2 > MAX_SEGMENTS && !owned.canMerge) return false;
    if (c.kind === "segment_vacuum" && owned.segmentVacuum) return false;
    if (c.kind === "credit_card" && purchasesOf(history, "credit_card") > 0) return false;
    return true;
  });

  const taken = new Set<ShopKind>();
  for (const slot of held) {
    if (slot) taken.add(slot.kind);
  }

  const offers: ShopOffer[] = [];
  for (let i = 0; i < SHOP_SLOTS; i++) {
    const kept = held[i];
    if (kept) {
      offers.push({ ...kept });
      continue;
    }
    const rarity = rollRarity();
    const unused = pool.filter((c) => !taken.has(c.kind));
    const preferred = unused.filter((c) => c.rarity === rarity);
    const raw = pickOne(preferred.length ? preferred : unused);
    if (!raw) break;
    taken.add(raw.kind);
    const item = decorateWeaponOffer(raw, owned);
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
  kinds: (ShopKind | null)[],
  wave: number,
  history: ShopKind[] = [],
  prior: ShopOffer[] = [],
): ShopOffer[] {
  return kinds
    .map((kind, i) => {
      if (!kind) return null;
      const item = CATALOG.find((c) => c.kind === kind);
      if (!item) return null;
      const prev = prior[i];
      return {
        ...item,
        weaponType: prev?.weaponType,
        weaponSlot: prev?.weaponSlot,
        merge: prev?.merge,
        mergeToTier: prev?.mergeToTier,
        title: prev?.title ?? item.title,
        blurb: prev?.blurb ?? item.blurb,
        cost: scaledOfferCost(item.cost, wave, purchasesOf(history, kind)),
        id: `${item.kind}-w${wave}-held-${i}`,
      } as ShopOffer;
    })
    .filter((o): o is ShopOffer => o !== null);
}

export { HEAD_WEAPONS, SEGMENT_WEAPONS };
