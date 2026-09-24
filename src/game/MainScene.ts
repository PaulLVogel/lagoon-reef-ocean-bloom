import * as Phaser from "phaser";
import {
  BOSS_WAVE, COLOR, COMBO_TRIGGER, COMBO_WINDOW_MS, DESKTOP_ZOOM, ENEMY_RADIUS,
  ERA_BOSS_DMG_MUL, ERA_BOSS_HP_MUL, ERA_HORDE_MUL, ERA_SPAWN_MUL,
  GOLD_TALLY_MS, HUD_TICK_MS, MAX_ENEMIES, MOBILE_WIDTH, MOBILE_ZOOM, PICKUP_FLOAT_MS,
  PLAYER_IFRAME_MS, PLAYER_MAX_HP, SEGMENT_RADIUS, SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MS,
  TILE, BARD_FRAME_SIZE, BARD_SHEET, COIN_FRAME_SIZE, COIN_SHEET,
  MORTAR_FX_ANIM, MORTAR_FX_FPS, MORTAR_FX_FRAME_H, MORTAR_FX_FRAME_W, MORTAR_FX_FRAMES, MORTAR_FX_SHEET,
  POTION_KEY, WAVE_DURATION_MS, WORLD_SIZE, xpForLevel,
} from "./constants";
import { ENEMY_BASE, ENEMY_HP_BASE, Enemy, type HordeKind, type EnemySpec } from "./Enemy";
import { Gems } from "./Gems";
import { installControlsTest } from "./controlsTest";
import { isGameStarted, installKeyboard, sampleMove } from "./input";
import { Projectiles } from "./Projectiles";
import { patchHud, runtime, setLevelOffers } from "./runtime";
import { rollLevelOffers, type GlobalStatId } from "./stats";
import { bankInterest, canAffordAny, rollShopOffers, SHOP_PITY_GOLD, SHOP_PITY_HP, SHOP_SLOTS, type ShopKind, type ShopOffer } from "./shop";
import { SnakePlayer } from "./SnakePlayer";
import { randomSegmentWeaponType, type FireEvent, type WeaponSlot, type WeaponType } from "./Weapon";
import { MORTAR_EXPLOSION_URL } from "./mortarExplosionAsset";
