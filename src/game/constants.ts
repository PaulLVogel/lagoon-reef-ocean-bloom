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

export const GEM_POOL = 80;
export const GEM_RADIUS = 6;
export const GEM_GREEN_VALUE = 1;
export const GEM_BLUE_VALUE = 5;
export const GEM_RED_VALUE = 10;
export const GEM_POP = 50;
export const GEM_DRAG = 8;
export const HEALTH_DROP_CHANCE = 0.05;
export const MAGNET_DROP_CHANCE = 0.03;
export const HEALTH_HEAL = 10;
export const MAGNET_SPEED = 420;
export const HEALTH_SIZE = 11;
export const MAGNET_SIZE = 12;

/** Collect reach is larger than the physical head hitbox. */
export const PICKUP_RADIUS_BASE = HEAD_RADIUS + GEM_RADIUS + 14;
export const PICKUP_RADIUS_STEP = 16;
export const SEGMENT_VACUUM_RADIUS = 52;
export const SEGMENT_VACUUM_SPEED = 260;
export const COMBO_WINDOW_MS = 2000;
export const COMBO_TRIGGER = 10;
export const PICKUP_FLOAT_MS = 500;

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
  gemGreen: 0x5eead4,
  gemBlue: 0x60a5fa,
  gemRed: 0xf87171,
  gemGold: 0xf4d35e,
  health: 0xef4444,
  magnet: 0xc084fc,
} as const;

export const HUD_TICK_MS = 80;
