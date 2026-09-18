import { DEFAULT_SEGMENT_COUNT, WAVE_DURATION_MS } from "./constants";
import { canAffordAny, type ShopKind, type ShopOffer } from "./shop";

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
};

type Bucket = {
  snap: HudSnap;
  started: boolean;
  restartRequested: boolean;
  nextWaveRequested: boolean;
  pendingUpgrade: ShopKind | null;
  shopOffers: ShopOffer[];
  shopPicked: string | null;
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
});

const fallback: Bucket = {
  snap: emptyHud(),
  started: false,
  restartRequested: false,
  nextWaveRequested: false,
  pendingUpgrade: null,
  shopOffers: [],
  shopPicked: null,
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
      pendingUpgrade: null,
      shopOffers: [],
      shopPicked: null,
      injected: null,
      stickX: 0,
      stickY: 0,
      keys: new Set(),
      listeners: new Set(),
    };
  }
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
  b.pendingUpgrade = null;
  b.shopOffers = [];
  b.shopPicked = null;
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
  patchHud({ shopPicked: id, gold: b.snap.gold - offer.cost });
}

export function requestNextWave() {
  const b = runtime();
  if (!b.shopPicked && canAffordAny(b.snap.gold, b.shopOffers)) return;
  b.nextWaveRequested = true;
}
