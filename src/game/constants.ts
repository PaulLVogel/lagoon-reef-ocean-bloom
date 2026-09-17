export const WORLD_SIZE = 4800;
export const TILE = 96;

export const HEAD_RADIUS = 16;
export const SEGMENT_RADIUS = 13;
export const HISTORY_STRIDE = 7;
export const DEFAULT_SEGMENT_COUNT = 6;
export const BASE_SPEED = 240;

export const COLOR = {
  arena: 0x0c0e12,
  grid: 0x171b22,
  gridLine: 0x222833,
  bound: 0x2a3140,
  head: 0xf3ebe6,
  snout: 0xfff8f4,
  eye: 0x1a1210,
  segment: 0xb85c57,
  segmentAlt: 0x9a4844,
  segmentCore: 0xd47a74,
} as const;

export const HUD_TICK_MS = 80;
