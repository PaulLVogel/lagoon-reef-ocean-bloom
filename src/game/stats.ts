export type GlobalStatId =
  | "max_hp"
  | "move_speed"
  | "cooldown"
  | "damage"
  | "pickup_radius"
  | "armor";

export type LevelOffer = {
  id: string;
  stat: GlobalStatId;
  title: string;
  blurb: string;
};

export const GLOBAL_STAT_CATALOG: {
  stat: GlobalStatId;
  title: string;
  blurb: string;
  shopTitle: string;
  shopBlurb: string;
  cost: number;
  rarity: "common" | "rare";
}[] = [
  {
    stat: "max_hp",
    title: "+Max HP",
    blurb: "Head and segments gain +20 max HP and heal that amount.",
    shopTitle: "Iron scales",
    shopBlurb: "+20 max HP on the head and every segment.",
    cost: 24,
    rarity: "common",
  },
  {
    stat: "move_speed",
    title: "+Move speed",
    blurb: "Head speed +12%. Trail stride is unchanged.",
    shopTitle: "Slippery coil",
    shopBlurb: "Global movement speed +12%.",
    cost: 26,
    rarity: "rare",
  },
  {
    stat: "cooldown",
    title: "Cooldown cut",
    blurb: "All weapons fire 12% faster.",
    shopTitle: "Quick fang",
    shopBlurb: "Global cooldown reduction +12%.",
    cost: 28,
    rarity: "rare",
  },
  {
    stat: "damage",
    title: "+Damage",
    blurb: "Every weapon deals 15% more damage.",
    shopTitle: "Venom glands",
    shopBlurb: "Global damage multiplier +15%.",
    cost: 30,
    rarity: "rare",
  },
  {
    stat: "pickup_radius",
    title: "+Pickup radius",
    blurb: "Head gem vacuum range grows by one step.",
    shopTitle: "Wide maw",
    shopBlurb: "Head pickup circle grows. Gems vacuum from farther out.",
    cost: 22,
    rarity: "common",
  },
  {
    stat: "armor",
    title: "+Armor",
    blurb: "Flat −2 damage from enemy hits (min 1).",
    shopTitle: "Keratin plate",
    shopBlurb: "Armor +2. Contact and shots deal less.",
    cost: 24,
    rarity: "common",
  },
];

export function rollLevelOffers(seed = Date.now()): LevelOffer[] {
  const pool = [...GLOBAL_STAT_CATALOG];
  const out: LevelOffer[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const item = pool.splice(idx, 1)[0]!;
    out.push({
      id: `${item.stat}-lv-${seed}-${i}`,
      stat: item.stat,
      title: item.title,
      blurb: item.blurb,
    });
  }
  return out;
}
