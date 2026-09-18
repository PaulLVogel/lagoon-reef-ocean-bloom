import * as Phaser from "phaser";
import {
  COLOR,
  COMBO_TRIGGER,
  COMBO_WINDOW_MS,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_HP,
  ENEMY_RADIUS,
  HUD_TICK_MS,
  MAX_ENEMIES,
  PICKUP_FLOAT_MS,
  PLAYER_IFRAME_MS,
  SPAWN_INTERVAL_MIN_MS,
  SPAWN_INTERVAL_MS,
  TILE,
  WAVE_DURATION_MS,
  WORLD_SIZE,
} from "./constants";
import { Enemy } from "./Enemy";
import { Gems } from "./Gems";
import { installControlsTest } from "./controlsTest";
import { isGameStarted, installKeyboard, sampleMove } from "./input";
import { Projectiles } from "./Projectiles";
import { patchHud, runtime } from "./runtime";
import {
  bankInterest,
  canAffordAny,
  offersFromKinds,
  rollShopOffers,
  SHOP_PITY_GOLD,
  SHOP_PITY_HP,
  type ShopKind,
} from "./shop";
import { SnakePlayer } from "./SnakePlayer";
