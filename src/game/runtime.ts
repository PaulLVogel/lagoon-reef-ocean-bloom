import { DEFAULT_SEGMENT_COUNT, WAVE_DURATION_MS } from "./constants";
import { SHOP_REROLL_COST, type ShopKind, type ShopOffer } from "./shop";

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
  waveMs: number;
  wave: number;
  shopOffers: ShopOffer[];
  shopPicked: string | null;
  fever: boolean;
  combo: number;
  lastInterest: number;
  shopFrozen: boolean;
  lastPityHp: number;
  lastPityGold: number;
};

type Bucket = {
  snap: HudSnap;
  started: boolean;
  restartRequested: boolean;
  nextWaveRequested: boolean;
  rerollRequested: boolean;
  pendingUpgrade: ShopKind | null;
  shopOffers: ShopOffer[];
  shopPicked: string | null;
  purchaseHistory: ShopKind[];
  shopFrozen: boolean;
  frozenKinds: ShopKind[];
  injected: Set<string> | null;
  stickX: number;
  stickY: number;
  keys: Set<string>;
  listeners: Set<(s: HudSnap) => void>;
};

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
  waveMs: WAVE_DURATION_MS,
  wave: 1,
  shopOffers: [],
  shopPicked: null,
  fever: false,
  combo: 0,
  lastInterest: 0,
  shopFrozen: false,
  lastPityHp: 0,
  lastPityGold: 0,
});

const fallback: Bucket = {
  snap: emptyHud(),
  started: false,
  restartRequested: false,
  nextWaveRequested: false,
  rerollRequested: false,
  pendingUpgrade: null,
  shopOffers: [],
  shopPicked: null,
  purchaseHistory: [],
  shopFrozen: false,
  frozenKinds: [],
  injected: null,
  stickX: 0,
  stickY: 0,
  keys: new Set(),
  listeners: new Set(),
};

export function runtime(): Bucket {
  if (typeof window === "undefined") return fallback;
  const w = window as Window & { __vsRuntime?: Bucket };
  if (!w.__vsRuntime) {
    w.__vsRuntime = {
      snap: emptyHud(),
      started: false,
      restartRequested: false,
      nextWaveRequested: false,
      rerollRequested: false,
      pendingUpgrade: null,
      shopOffers: [],
      shopPicked: null,
      purchaseHistory: [],
      shopFrozen: false,
      frozenKinds: [],
      injected: null,
      stickX: 0,
      stickY: 0,
      keys: new Set(),
      listeners: new Set(),
    };
  }
  if (!w.__vsRuntime.purchaseHistory) w.__vsRuntime.purchaseHistory = [];
  if (!w.__vsRuntime.frozenKinds) w.__vsRuntime.frozenKinds = [];
  if (typeof w.__vsRuntime.shopFrozen !== "boolean") w.__vsRuntime.shopFrozen = false;
  return w.__vsRuntime;
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

export function requestRestart() {
  const b = runtime();
  b.restartRequested = true;
  b.nextWaveRequested = false;
  b.rerollRequested = false;
  b.pendingUpgrade = null;
  b.shopOffers = [];
  b.shopPicked = null;
  b.purchaseHistory = [];
  b.shopFrozen = false;
  b.frozenKinds = [];
  b.started = true;
  patchHud({
    playing: true,
    dead: false,
    waveClear: false,
    hp: 100,
    swarm: 0,
    kills: 0,
    gold: 0,
    waveMs: WAVE_DURATION_MS,
    wave: 1,
    shopOffers: [],
    shopPicked: null,
    fever: false,
    combo: 0,
    lastInterest: 0,
    shopFrozen: false,
    lastPityHp: 0,
    lastPityGold: 0,
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
  if (b.snap.gold < offer.cost) return;
  b.shopPicked = id;
  b.pendingUpgrade = offer.kind;
  b.purchaseHistory = [...b.purchaseHistory, offer.kind];
  b.shopFrozen = false;
  b.frozenKinds = [];
  patchHud({ shopPicked: id, gold: b.snap.gold - offer.cost, shopFrozen: false });
}

export function requestReroll() {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  if (b.shopPicked) return;
  if (b.shopFrozen) return;
  if (b.snap.gold < SHOP_REROLL_COST) return;
  patchHud({ gold: b.snap.gold - SHOP_REROLL_COST });
  b.rerollRequested = true;
}

export function requestToggleFreeze() {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  if (b.shopPicked) return;
  if (b.shopFrozen) {
    b.shopFrozen = false;
    b.frozenKinds = [];
    patchHud({ shopFrozen: false });
    return;
  }
  if (!b.shopOffers.length) return;
  b.shopFrozen = true;
  b.frozenKinds = b.shopOffers.map((o) => o.kind);
  patchHud({ shopFrozen: true });
}

export function requestNextWave() {
  const b = runtime();
  if (!b.snap.waveClear || b.snap.dead) return;
  b.nextWaveRequested = true;
}
