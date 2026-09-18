import { DEFAULT_SEGMENT_COUNT, WAVE_DURATION_MS, xpForLevel } from "./constants";
import { allowsOverdraft, SHOP_REROLL_COST, SHOP_SLOTS, type ShopKind, type ShopOffer } from "./shop";
import type { GlobalStatId, LevelOffer } from "./stats";
import type { WeaponSlot, WeaponType } from "./Weapon";

export type HudSnap = {
  playing: boolean;
  dead: boolean;
  waveClear: boolean;
  speed: number;
  segments: number;
  hp: number;
  maxHp: number;
  dummyHp?: number;
  dummyMax?: number;
  hits?: number;
  kills: number;
  swarm: number;
  gold: number;
  goldDisplay: number;
  totalGoldEarned: number;
  nextWaveBank: number;
  waveMs: number;
  wave: number;
  shopOffers: ShopOffer[];
  shopPicked: string | null;
  fever: boolean;
  combo: number;
  lastInterest: number;
  shopFrozen: boolean;
  slotLocked: boolean[];
  shopBought: string[];
  lastPityHp: number;
  lastPityGold: number;
  leveling: boolean;
  playerLevel: number;
  xp: number;
  xpNextLevel: number;
  levelOffers: LevelOffer[];
};

type Bucket = {
  snap: HudSnap;
  started: boolean;
  restartRequested: boolean;
  nextWaveRequested: boolean;
  rerollRequested: boolean;
  pendingUpgrade: ShopKind | null;
  pendingWeaponType: WeaponType | null;
  pendingWeaponSlot: WeaponSlot | null;
  pendingBuys: { kind: ShopKind; weaponType: WeaponType | null; weaponSlot: WeaponSlot | null }[];
  shopOffers: ShopOffer[];
  shopPicked: string | null;
  shopBought: string[];
  purchaseHistory: ShopKind[];
  shopFrozen: boolean;
  frozenKinds: (ShopKind | null)[];
  heldOffers: (ShopOffer | null)[];
  slotLocked: boolean[];
  pendingLevelWeapon: WeaponType | null;
  goldTallyFrom: number | null;
  nextWaveBank: number;
  totalGoldEarned: number;
  injected: Set<string> | null;
  stickX: number;
  stickY: number;
  keys: Set<string>;
  listeners: Set<(s: HudSnap) => void>;
  leveling: boolean;
  pendingLevelStat: GlobalStatId | null;
  levelOffers: LevelOffer[];
};

const emptyLocks = () => Array.from({ length: SHOP_SLOTS }, () => false);
const emptyHeld = () => Array.from({ length: SHOP_SLOTS }, () => null as ShopOffer | null);

const emptyHud = (): HudSnap => ({
  playing: false,
  dead: false,
  waveClear: false,
  speed: 0,
  segments: DEFAULT_SEGMENT_COUNT,
  hp: 100,
  maxHp: 100,
  kills: 0,
  swarm: 0,
  gold: 0,
  goldDisplay: 0,
  totalGoldEarned: 0,
  nextWaveBank: 0,
  waveMs: WAVE_DURATION_MS,
  wave: 1,
  shopOffers: [],
  shopPicked: null,
  fever: false,
  combo: 0,
  lastInterest: 0,
  shopFrozen: false,
  slotLocked: emptyLocks(),
  shopBought: [],
  lastPityHp: 0,
  lastPityGold: 0,
  leveling: false,
  playerLevel: 1,
  xp: 0,
  xpNextLevel: xpForLevel(1),
  levelOffers: [],
});

function emptyBucket(): Bucket {
  return {
    snap: emptyHud(),
    started: false,
    restartRequested: false,
    nextWaveRequested: false,
    rerollRequested: false,
    pendingUpgrade: null,
    pendingWeaponType: null,
    pendingWeaponSlot: null,
    pendingBuys: [],
    shopOffers: [],
    shopPicked: null,
    shopBought: [],
    purchaseHistory: [],
    shopFrozen: false,
    frozenKinds: emptyHeld().map(() => null),
    heldOffers: emptyHeld(),
    slotLocked: emptyLocks(),
    pendingLevelWeapon: null,
    goldTallyFrom: null,
    nextWaveBank: 0,
    totalGoldEarned: 0,
    injected: null,
    stickX: 0,
    stickY: 0,
    keys: new Set(),
    listeners: new Set(),
    leveling: false,
    pendingLevelStat: null,
    levelOffers: [],
  };
}

const fallback: Bucket = emptyBucket();

export function runtime(): Bucket {
  if (typeof window === "undefined") return fallback;
  const w = window as Window & { __vsRuntime?: Bucket };
  if (!w.__vsRuntime) w.__vsRuntime = emptyBucket();
  const b = w.__vsRuntime;
  if (!b.purchaseHistory) b.purchaseHistory = [];
  if (!b.frozenKinds || b.frozenKinds.length !== SHOP_SLOTS) b.frozenKinds = emptyHeld().map(() => null);
  if (!b.heldOffers || b.heldOffers.length !== SHOP_SLOTS) b.heldOffers = emptyHeld();
  if (!b.slotLocked || b.slotLocked.length !== SHOP_SLOTS) b.slotLocked = emptyLocks();
  if (!b.shopBought) b.shopBought = [];
  if (!b.pendingBuys) b.pendingBuys = [];
  if (b.pendingLevelWeapon === undefined) b.pendingLevelWeapon = null;
  if (typeof b.shopFrozen !== "boolean") b.shopFrozen = false;
  if (typeof b.nextWaveBank !== "number") b.nextWaveBank = 0;
  if (typeof b.totalGoldEarned !== "number") b.totalGoldEarned = 0;
  if (b.goldTallyFrom === undefined) b.goldTallyFrom = null;
  if (b.pendingWeaponType === undefined) b.pendingWeaponType = null;
  if (b.pendingWeaponSlot === undefined) b.pendingWeaponSlot = null;
  if (typeof b.leveling !== "boolean") b.leveling = false;
  if (b.pendingLevelStat === undefined) b.pendingLevelStat = null;
  if (!b.levelOffers) b.levelOffers = [];
  return b;
}

export function getHud(): HudSnap {
  return runtime().snap;
}

export function patchHud(partial: Partial<HudSnap>) {
  const b = runtime();
  b.snap = { ...b.snap, ...partial };
  b.listeners.forEach((fn) => fn(b.snap));
}

export function subscribeHud(fn: (s: HudSnap) => void) {
  const b = runtime();
  b.listeners.add(fn);
  fn(b.snap);
  return () => {
    b.listeners.delete(fn);
  };
}

function clearLocks(b: Bucket) {
  b.shopFrozen = false;
  b.frozenKinds = emptyHeld().map(() => null);
  b.heldOffers = emptyHeld();
  b.slotLocked = emptyLocks();
}

export function requestRestart() {
  const b = runtime();
  b.restartRequested = true;
  b.nextWaveRequested = false;
  b.rerollRequested = false;
  b.pendingUpgrade = null;
  b.pendingWeaponType = null;
  b.pendingWeaponSlot = null;
  b.pendingBuys = [];
  b.shopOffers = [];
  b.shopPicked = null;
  b.shopBought = [];
  b.purchaseHistory = [];
  b.pendingLevelWeapon = null;
  clearLocks(b);
  b.goldTallyFrom = null;
  b.nextWaveBank = 0;
  b.totalGoldEarned = 0;
  b.leveling = false;
  b.pendingLevelStat = null;
  b.levelOffers = [];
  b.started = true;
  patchHud({
    playing: true,
    dead: false,
    waveClear: false,
    hp: 100,
    maxHp: 100,
    swarm: 0,
    kills: 0,
    gold: 0,
    goldDisplay: 0,
    totalGoldEarned: 0,
    nextWaveBank: 0,
    waveMs: WAVE_DURATION_MS,
    wave: 1,
    shopOffers: [],
    shopPicked: null,
    shopBought: [],
    fever: false,
    combo: 0,
    lastInterest: 0,
    shopFrozen: false,
    slotLocked: emptyLocks(),
    lastPityHp: 0,
    lastPityGold: 0,
    leveling: false,
    playerLevel: 1,
    xp: 0,
    xpNextLevel: xpForLevel(1),
    levelOffers: [],
  });
}

export function setShopOffers(offers: ShopOffer[]) {
  const b = runtime();
  b.shopOffers = offers;
  b.shopPicked = null;
  b.pendingUpgrade = null;
  patchHud({ shopOffers: offers, shopPicked: null });
}

export function pickShopOffer(id: string) {
  const b = runtime();
  if (b.shopBought.includes(id)) return;
  const offer = b.shopOffers.find((o) => o.id === id);
  if (!offer) return;
  if (!allowsOverdraft(offer.kind) && b.snap.gold < offer.cost) return;
  b.shopPicked = id;
  b.shopBought = [...b.shopBought, id];
  b.pendingBuys.push({
    kind: offer.kind,
    weaponType: offer.weaponType ?? null,
    weaponSlot: offer.weaponSlot ?? null,
  });
  b.pendingUpgrade = offer.kind;
  b.pendingWeaponType = offer.weaponType ?? null;
  b.pendingWeaponSlot = offer.weaponSlot ?? null;
  b.purchaseHistory = [...b.purchaseHistory, offer.kind];
  const idx = b.shopOffers.findIndex((o) => o.id === id);
  if (idx >= 0) {
    b.slotLocked[idx] = false;
    b.frozenKinds[idx] = null;
    if (b.heldOffers) b.heldOffers[idx] = null;
  }
  b.shopFrozen = b.slotLocked.some(Boolean);
  b.goldTallyFrom = b.snap.gold;
  patchHud({
    shopPicked: id,
    shopBought: [...b.shopBought],
    gold: b.snap.gold - offer.cost,
    shopFrozen: b.shopFrozen,
    slotLocked: [...b.slotLocked],
  });
}

export function requestReroll() {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  const unlockedOpen = b.shopOffers.some((o, i) => !b.slotLocked[i] && !b.shopBought.includes(o.id));
  if (!unlockedOpen) return;
  if (b.snap.gold < SHOP_REROLL_COST) return;
  b.goldTallyFrom = b.snap.gold;
  patchHud({ gold: b.snap.gold - SHOP_REROLL_COST });
  b.rerollRequested = true;
}

/** Per-card lock. Locked slots survive reroll and the next shop. */
export function requestToggleSlotLock(index: number) {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  const offer = b.shopOffers[index];
  if (!offer) return;
  if (b.shopBought.includes(offer.id)) return;
  const next = !b.slotLocked[index];
  b.slotLocked[index] = next;
  b.frozenKinds[index] = next ? offer.kind : null;
  if (!b.heldOffers || b.heldOffers.length !== SHOP_SLOTS) b.heldOffers = emptyHeld();
  b.heldOffers[index] = next ? { ...offer } : null;
  b.shopFrozen = b.slotLocked.some(Boolean);
  patchHud({ shopFrozen: b.shopFrozen, slotLocked: [...b.slotLocked] });
}

export function requestToggleFreeze() {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  if (b.shopPicked) return;
  if (b.shopFrozen) {
    clearLocks(b);
    patchHud({ shopFrozen: false, slotLocked: emptyLocks() });
    return;
  }
  if (!b.shopOffers.length) return;
  b.shopFrozen = true;
  b.slotLocked = b.shopOffers.map(() => true);
  b.frozenKinds = b.shopOffers.map((o) => o.kind);
  patchHud({ shopFrozen: true, slotLocked: [...b.slotLocked] });
}

export function requestNextWave() {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  b.nextWaveRequested = true;
}

export function setLevelOffers(offers: LevelOffer[]) {
  const b = runtime();
  b.leveling = true;
  b.levelOffers = offers;
  b.pendingLevelStat = null;
  b.pendingLevelWeapon = null;
  patchHud({ leveling: true, levelOffers: offers });
}

export function pickLevelOffer(id: string) {
  const b = runtime();
  if (!b.leveling) return;
  const offer = b.levelOffers.find((o) => o.id === id);
  if (!offer) return;
  b.pendingLevelStat = offer.stat ?? null;
  b.pendingLevelWeapon = offer.weaponType ?? null;
  b.pendingWeaponSlot = offer.weaponSlot ?? null;
  b.leveling = false;
  b.levelOffers = [];
  patchHud({ leveling: false, levelOffers: [] });
}
