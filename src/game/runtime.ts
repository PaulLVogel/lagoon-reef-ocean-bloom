import { DEFAULT_SEGMENT_COUNT, WAVE_DURATION_MS, xpForLevel } from "./constants";
import { allowsOverdraft, SHOP_REROLL_COST, type ShopKind, type ShopOffer } from "./shop";
import type { GlobalStatId, LevelOffer } from "./stats";
import type { WeaponType } from "./Weapon";

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
  shopOffers: ShopOffer[];
  shopPicked: string | null;
  purchaseHistory: ShopKind[];
  shopFrozen: boolean;
  frozenKinds: (ShopKind | null)[];
  slotLocked: boolean[];
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

const emptyLocks = () => [false, false, false];

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
    shopOffers: [],
    shopPicked: null,
    purchaseHistory: [],
    shopFrozen: false,
    frozenKinds: [null, null, null],
    slotLocked: emptyLocks(),
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
  if (!b.frozenKinds) b.frozenKinds = [null, null, null];
  if (!b.slotLocked) b.slotLocked = emptyLocks();
  if (typeof b.shopFrozen !== "boolean") b.shopFrozen = false;
  if (typeof b.nextWaveBank !== "number") b.nextWaveBank = 0;
  if (typeof b.totalGoldEarned !== "number") b.totalGoldEarned = 0;
  if (b.goldTallyFrom === undefined) b.goldTallyFrom = null;
  if (b.pendingWeaponType === undefined) b.pendingWeaponType = null;
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
  b.frozenKinds = [null, null, null];
  b.slotLocked = emptyLocks();
}

export function requestRestart() {
  const b = runtime();
  b.restartRequested = true;
  b.nextWaveRequested = false;
  b.rerollRequested = false;
  b.pendingUpgrade = null;
  b.pendingWeaponType = null;
  b.shopOffers = [];
  b.shopPicked = null;
  b.purchaseHistory = [];
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
  if (b.shopPicked) return;
  const offer = b.shopOffers.find((o) => o.id === id);
  if (!offer) return;
  if (!allowsOverdraft(offer.kind) && b.snap.gold < offer.cost) return;
  b.shopPicked = id;
  b.pendingUpgrade = offer.kind;
  b.pendingWeaponType = offer.weaponType ?? null;
  b.purchaseHistory = [...b.purchaseHistory, offer.kind];
  const idx = b.shopOffers.findIndex((o) => o.id === id);
  if (idx >= 0) {
    b.slotLocked[idx] = false;
    b.frozenKinds[idx] = null;
  }
  b.shopFrozen = b.slotLocked.some(Boolean);
  b.goldTallyFrom = b.snap.gold;
  patchHud({
    shopPicked: id,
    gold: b.snap.gold - offer.cost,
    shopFrozen: b.shopFrozen,
    slotLocked: [...b.slotLocked],
  });
}

export function requestReroll() {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  if (b.shopPicked) return;
  if (b.slotLocked.every(Boolean) && b.shopOffers.length >= 3) return;
  if (b.snap.gold < SHOP_REROLL_COST) return;
  b.goldTallyFrom = b.snap.gold;
  patchHud({ gold: b.snap.gold - SHOP_REROLL_COST });
  b.rerollRequested = true;
}

export function requestToggleSlotLock(index: number) {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  if (b.shopPicked) return;
  const offer = b.shopOffers[index];
  if (!offer) return;
  const next = !b.slotLocked[index];
  b.slotLocked[index] = next;
  b.frozenKinds[index] = next ? offer.kind : null;
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
  patchHud({ leveling: true, levelOffers: offers });
}

export function pickLevelOffer(id: string) {
  const b = runtime();
  if (!b.leveling) return;
  const offer = b.levelOffers.find((o) => o.id === id);
  if (!offer) return;
  b.pendingLevelStat = offer.stat;
  b.leveling = false;
  b.levelOffers = [];
  patchHud({ leveling: false, levelOffers: [] });
}
