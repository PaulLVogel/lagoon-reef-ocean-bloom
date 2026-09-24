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

type HostileShot = { gfx: Phaser.GameObjects.Arc; vx: number; vy: number; damage: number; live: boolean };
type Mine = {
  gfx: Phaser.GameObjects.Arc;
  x: number; y: number; r: number; damage: number; live: boolean; armedAt: number;
};
type MortarShell = {
  gfx: Phaser.GameObjects.Arc;
  x: number; y: number; tx: number; ty: number; speed: number; damage: number; aoe: number; live: boolean;
};

export class MainScene extends Phaser.Scene {
  private player!: SnakePlayer;
  private shots!: Projectiles;
  private gems!: Gems;
  private enemies: Enemy[] = [];
  private hostiles: HostileShot[] = [];
  private spawnAcc = 0;
  private playerHp = PLAYER_MAX_HP;
  private iFrameUntil = 0;
  private kills = 0;
  private gold = 0;
  private goldDisplay = 0;
  private nextWaveBank = 0;
  private totalGoldEarned = 0;
  private dead = false;
  private waveClear = false;
  private wave = 1;
  private waveMs = WAVE_DURATION_MS;
  private hudAcc = 0;
  private gemTimes: number[] = [];
  private feverUntil = 0;
  private unbindKeys: (() => void) | null = null;
  private floor!: Phaser.GameObjects.TileSprite;
  private audioCtx: AudioContext | null = null;
  private bossSpawned = false;
  private playerLevel = 1;
  private xp = 0;
  private xpNextLevel = xpForLevel(1);
  private leveling = false;
  private mines: Mine[] = [];
  private mortars: MortarShell[] = [];
  private pierceMarks = new WeakMap<Enemy, Set<number>>();

  constructor() { super("main"); }

  preload() {
    this.load.spritesheet(BARD_SHEET, "/sprites/halfling-bard.png", {
      frameWidth: BARD_FRAME_SIZE, frameHeight: BARD_FRAME_SIZE,
    });
    this.load.spritesheet(COIN_SHEET, "/sprites/coin-gold.png", {
      frameWidth: COIN_FRAME_SIZE, frameHeight: COIN_FRAME_SIZE,
    });
    this.load.image(POTION_KEY, "/sprites/potion-red.png");
    this.load.spritesheet(MORTAR_FX_SHEET, MORTAR_EXPLOSION_URL, {
      frameWidth: MORTAR_FX_FRAME_W, frameHeight: MORTAR_FX_FRAME_H,
    });
  }

  init() {
    this.hudAcc = 0; this.spawnAcc = 0; this.playerHp = PLAYER_MAX_HP; this.iFrameUntil = 0;
    this.kills = 0; this.gold = 0; this.goldDisplay = 0; this.nextWaveBank = 0; this.totalGoldEarned = 0;
    this.dead = false; this.waveClear = false; this.wave = 1; this.waveMs = WAVE_DURATION_MS;
    this.enemies = []; this.gemTimes = []; this.feverUntil = 0; this.bossSpawned = false;
    this.playerLevel = 1; this.xp = 0; this.xpNextLevel = xpForLevel(1); this.leveling = false; this.mines = []; this.mortars = [];
  }

  create() {
    this.buildArena();
    this.ensureMortarFx();
    const cx = WORLD_SIZE / 2, cy = WORLD_SIZE / 2;
    this.shots = new Projectiles(this);
    this.gems = new Gems(this);
    this.player = new SnakePlayer(this, cx, cy, (ev) => this.onFire(ev));
    this.cameras.main.setBounds(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.cameras.main.startFollow(this.player.head, true, 0.14, 0.14);
    this.cameras.main.setDeadzone(70, 70);
    this.cameras.main.setBackgroundColor(COLOR.arena);
    this.fitZoom();
    this.unbindKeys = installKeyboard(window);
    installControlsTest(this.player);
    this.scale.on("resize", this.onResize, this);
    this.events.once("shutdown", this.cleanup, this);
    patchHud({
      segments: this.player.segments.length, speed: 0, hp: this.playerHp, maxHp: PLAYER_MAX_HP,
      playerLevel: 1, xp: 0, xpNextLevel: xpForLevel(1), leveling: false, levelOffers: [],
      kills: 0, gold: 0, goldDisplay: 0, totalGoldEarned: 0, nextWaveBank: 0, swarm: 0,
      dead: false, waveClear: false, waveMs: WAVE_DURATION_MS, wave: 1, shopOffers: [], shopPicked: null,
    });
  }
