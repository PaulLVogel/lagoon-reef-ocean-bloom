import { DEFAULT_SEGMENT_COUNT, WAVE_DURATION_MS } from "./constants";

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
  waveMs: number;
  wave: number;
};

type Bucket = {
  snap: HudSnap;
  started: boolean;
  restartRequested: boolean;
  injected: Set<string> | null;
  stickX: number;
  stickY: number;
  keys: Set<string>;
  listeners: Set<(s: HudSnap) => void>;
};

const fallback: Bucket = {
  snap: {
    playing: false,
    dead: false,
    waveClear: false,
    speed: 0,
    segments: DEFAULT_SEGMENT_COUNT,
    hp: 100,
    maxHp: 100,
    kills: 0,
    swarm: 0,
    waveMs: WAVE_DURATION_MS,
    wave: 1,
  },
  started: false,
  restartRequested: false,
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
      snap: { ...fallback.snap },
      started: false,
      restartRequested: false,
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
  b.started = true;
  patchHud({
    playing: true,
    dead: false,
    waveClear: false,
    hp: 100,
    swarm: 0,
    kills: 0,
    waveMs: WAVE_DURATION_MS,
    wave: 1,
  });
}
