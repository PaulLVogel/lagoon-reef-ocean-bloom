export const WORLD_SIZE = 4800;
export const TILE = 96;

export const HEAD_RADIUS = 16;
export const SEGMENT_RADIUS = 13;
export const HISTORY_STRIDE = 7;
export const DEFAULT_SEGMENT_COUNT = 6;
export const BASE_SPEED = 240;

export const DUMMY_HP = 100;
export const DUMMY_RADIUS = 28;
export const BULLET_POOL = 72;

export const ENEMY_RADIUS = 12;
export const ENEMY_HP = 24;
export const ENEMY_SPEED = 95;
export const ENEMY_CONTACT_DAMAGE = 8;
export const MAX_ENEMIES = 28;
export const SPAWN_INTERVAL_MS = 850;
export const SPAWN_INTERVAL_MIN_MS = 280;
export const PLAYER_IFRAME_MS = 450;

export const WAVE_DURATION_MS = 30_000;

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
  dummy: 0x6b7380,
  dummyHurt: 0xe8ddd6,
  enemy: 0x6b2d86,
  enemyCore: 0xe0aaff,
  enemyHurt: 0xff77aa,
  blaster: 0xf4ebe3,
  turret: 0xc5d0d8,
  blade: 0xd47872,
  hp: 0xb85c57,
} as const;

export const HUD_TICK_MS = 80;
