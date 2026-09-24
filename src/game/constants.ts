export const WORLD_SIZE = 4800;
export const TILE = 96;

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const DESKTOP_ZOOM = 1;
/** Mobile zoom-out: ~2/3 of desktop zoom so more of the arena is visible. */
export const MOBILE_ZOOM = 2 / 3;
export const MOBILE_WIDTH = 820;

export const HEAD_RADIUS = 16;
export const SEGMENT_RADIUS = 13;
export const HISTORY_STRIDE = 7;
export const DEFAULT_SEGMENT_COUNT = 0;
export const BASE_SPEED = 240;
export const PLAYER_MAX_HP = 100;
export const SEGMENT_MAX_HP = 100;

/** Phaser spritesheet key for the halfling bard head (16×16 × 4 walk frames). */
export const BARD_SHEET = "vs-bard";
export const BARD_FRAME_SIZE = 16;
/** Integer nearest-neighbor scale (16×4 = 64px). Hitbox stays HEAD_RADIUS. */
export const BARD_SCALE = 4;

/** Gold coin XP drop: 8-frame 16×16 spin from Coin Sheet.png (top row). */
export const COIN_SHEET = "vs-coin";
export const COIN_FRAME_SIZE = 16;
export const COIN_FRAMES = 8;
export const COIN_ANIM = "vs-coin-spin";
export const COIN_ANIM_FPS = 12;
export const COIN_SCALE_T1 = 1.7;
export const COIN_SCALE_T2 = 2.15;
export const COIN_SCALE_T3 = 2.55;

/** Red flask HP drop from Potions.png (top-left 16×16). */
export const POTION_KEY = "vs-potion";
export const POTION_SCALE = 2.2;

/** Swarmer (easiest horde): 4-frame 16×16 Death Slime walk. */
export const SLIME_SHEET = "vs-slime";
export const SLIME_ANIM = "vs-slime-walk";
export const SLIME_FRAME = 16;
export const SLIME_FRAMES = 4;
export const SLIME_FPS = 8;
export const SLIME_SCALE = 2;

/** Mortar impact: 8-frame 64×64 fireball sheet (user-provided). */
export const MORTAR_FX_SHEET = "vs-mortar-fx";
export const MORTAR_FX_ANIM = "vs-mortar-boom";
export const MORTAR_FX_FRAME_W = 64;
export const MORTAR_FX_FRAME_H = 64;
export const MORTAR_FX_FRAMES = 8;
export const MORTAR_FX_FPS = 12;

/** Single-shot impact: 5-frame 32×32 diamond burst (user-provided). */
export const SHOT_HIT_SHEET = "vs-shot-hit";
export const SHOT_HIT_ANIM = "vs-shot-hit";
export const SHOT_HIT_FRAME = 32;
export const SHOT_HIT_FRAMES = 5;
export const SHOT_HIT_FPS = 20;
export const SHOT_HIT_SCALE = 2.4;

export const DUMMY_HP = 100;
export const DUMMY_RADIUS = 28;
export const BULLET_POOL = 96;

export const ENEMY_RADIUS = 12;
export const ENEMY_HP = 24;
export const ENEMY_SPEED = 95;
export const ENEMY_CONTACT_DAMAGE = 8;
export const MAX_ENEMIES = 28;
export const SPAWN_INTERVAL_MS = 850;
export const SPAWN_INTERVAL_MIN_MS = 280;
export const PLAYER_IFRAME_MS = 450;

export const WAVE_DURATION_MS = 30_000;
/** Boss every N waves (10, 20, 30…). Kept as the period, not a single-wave id. */
export const BOSS_WAVE = 10;
/** Era = floor((wave-1)/BOSS_WAVE). Each new era multiplies horde HP/dmg and tightens spawn. */
export const ERA_HORDE_MUL = 1.75;
export const ERA_SPAWN_MUL = 1.35;
/** Extra boss HP/contact per era on top of the linear wave curve. */
export const ERA_BOSS_HP_MUL = 2.1;
export const ERA_BOSS_DMG_MUL = 1.65;

export const GEM_POOL = 80;
export const GEM_RADIUS = 7;
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
export const GOLD_TALLY_MS = 300;

export const XP_BASE = 18;
export const XP_EXPONENT = 1.5;

export const STAT_HP_STEP = 20;
export const STAT_SPEED_MUL = 1.12;
export const STAT_CDR_MUL = 1.12;
export const STAT_DMG_MUL = 1.15;
export const STAT_ARMOR_STEP = 2;

export const COLOR = {
  arena: 0x0c0e12,
  grid: 0x171b22,
  gridLine: 0x222833,
  bound: 0x2a3140,
  head: 0xf5e6b8,
  headStroke: 0xfff8dc,
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
  swarmer: 0xc084fc,
  grunt: 0x6b2d86,
  brute: 0x9a3412,
  flanker: 0x38bdf8,
  armoredBrute: 0x4b5563,
  charger: 0xf97316,
  siege: 0x7c3aed,
  boss: 0xe11d48,
  blaster: 0xf4ebe3,
  turret: 0xc5d0d8,
  blade: 0xd47872,
  singleShot: 0xf4ebe3,
  coneBurst: 0x7dd3fc,
  meleeSlash: 0xfbbf24,
  mine: 0xf97316,
  rail: 0xef4444,
  chain: 0x22d3ee,
  aura: 0xa3e635,
  mortar: 0x22c55e,
  hp: 0xb85c57,
  gemGreen: 0x22d3ee,
  gemBlue: 0xfacc15,
  gemRed: 0xf472b6,
  gemGold: 0xf4d35e,
  health: 0xef4444,
  magnet: 0xc084fc,
} as const;

export const HUD_TICK_MS = 80;

export function xpForLevel(level: number) {
  return Math.max(8, Math.round(XP_BASE * Math.pow(Math.max(1, level), XP_EXPONENT)));
}
