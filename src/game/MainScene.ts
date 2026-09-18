import * as Phaser from "phaser";
import {
  BOSS_WAVE, COLOR, COMBO_TRIGGER, COMBO_WINDOW_MS, DESKTOP_ZOOM, ENEMY_RADIUS,
  ERA_BOSS_DMG_MUL, ERA_BOSS_HP_MUL, ERA_HORDE_MUL, ERA_SPAWN_MUL,
  GOLD_TALLY_MS, HUD_TICK_MS, MAX_ENEMIES, MOBILE_WIDTH, MOBILE_ZOOM, PICKUP_FLOAT_MS,
  PLAYER_IFRAME_MS, PLAYER_MAX_HP, SEGMENT_RADIUS, SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MS,
  TILE, BARD_FRAME_SIZE, BARD_SHEET, WAVE_DURATION_MS, WORLD_SIZE, xpForLevel,
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

type HostileShot = { gfx: Phaser.GameObjects.Arc; vx: number; vy: number; damage: number; live: boolean };
type Mine = {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  r: number;
  damage: number;
  live: boolean;
  armedAt: number;
};
type MortarShell = {
  gfx: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  damage: number;
  aoe: number;
  live: boolean;
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
      frameWidth: BARD_FRAME_SIZE,
      frameHeight: BARD_FRAME_SIZE,
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

  update(time: number, delta: number) {
    const bucketTop = runtime();
    if (bucketTop.pendingLevelStat || bucketTop.pendingLevelWeapon) {
      const stat = bucketTop.pendingLevelStat;
      const weapon = bucketTop.pendingLevelWeapon;
      const slot = bucketTop.pendingWeaponSlot;
      bucketTop.pendingLevelStat = null;
      bucketTop.pendingLevelWeapon = null;
      bucketTop.pendingWeaponSlot = null;
      this.resolveLevelUp(stat, weapon, slot);
    }
    if (this.leveling) {
      if (bucketTop.restartRequested) { bucketTop.restartRequested = false; this.scene.restart(); return; }
      return;
    }
    if (this.dead || this.waveClear) {
      const bucket = runtime();
      if (bucket.restartRequested) { bucket.restartRequested = false; this.scene.restart(); return; }
      if (this.waveClear && !this.dead) {
        const queue = bucket.pendingBuys?.length
          ? bucket.pendingBuys.splice(0, bucket.pendingBuys.length)
          : bucket.pendingUpgrade
            ? [{ kind: bucket.pendingUpgrade, weaponType: bucket.pendingWeaponType, weaponSlot: bucket.pendingWeaponSlot }]
            : [];
        if (queue.length) {
          bucket.pendingUpgrade = null; bucket.pendingWeaponType = null; bucket.pendingWeaponSlot = null;
          const from = bucket.goldTallyFrom ?? this.gold;
          this.gold = bucket.snap.gold; bucket.goldTallyFrom = null;
          this.tallyGoldDisplay(from, this.gold);
          for (const buy of queue) this.applyUpgrade(buy.kind, buy.weaponType, buy.weaponSlot ?? null);
        }
        if (bucket.rerollRequested) {
          bucket.rerollRequested = false;
          const from = bucket.goldTallyFrom ?? this.gold;
          this.gold = bucket.snap.gold; bucket.goldTallyFrom = null;
          this.tallyGoldDisplay(from, this.gold); this.rollShop();
        }
        if (bucket.nextWaveRequested) { bucket.nextWaveRequested = false; this.startNextWave(); }
      }
      if (this.dead) return;
      if (this.waveClear) this.collectLoot(Math.min(delta, 50) / 1000, time);
    }
    const dt = Math.min(delta, 50) / 1000;
    const move = sampleMove();
    const combatOn = isGameStarted() && !this.waveClear && !this.dead && !this.leveling;
    this.player.update(dt, move.x, move.y, time, this.enemies, combatOn);
    if (combatOn) {
      this.waveMs = Math.max(0, this.waveMs - delta);
      if (this.waveMs <= 0) this.endWave();
      else {
        this.tickSpawns(delta, time);
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const t = this.player.nearestChasePoint(e.x, e.y);
          e.chase(t.x, t.y, dt, time);
          if (e.kind === "boss") for (const s of e.tickBoss(time, this.player.x, this.player.y)) this.spawnHostile(s.x, s.y, s.vx, s.vy, s.damage);
          if (e.kind === "siege") {
            const tail = this.player.segments[this.player.segments.length - 1];
            const tx = tail ? tail.x : this.player.x;
            const ty = tail ? tail.y : this.player.y;
            for (const s of e.tickSiege(time, tx, ty)) this.spawnHostile(s.x, s.y, s.vx, s.vy, s.damage);
          }
        }
        this.shots.update(dt, (x, y, dmg, r, mark, pierce) => this.hitEnemiesAt(x, y, dmg, r, mark, pierce));
        this.tickMines(time); this.tickMortars(dt); this.tickHostiles(dt, time); this.checkPlayerContact(time); this.collectLoot(dt, time); this.pruneDead();
      }
    }
    this.hudAcc += delta;
    if (this.hudAcc >= HUD_TICK_MS) {
      this.hudAcc = 0;
      if (isGameStarted()) {
        const hud: Parameters<typeof patchHud>[0] = {
          speed: Math.round(Math.hypot(this.player.vx, this.player.vy)),
          segments: this.player.segments.length, hp: this.playerHp, maxHp: this.player.headMaxHp,
          playerLevel: this.playerLevel, xp: this.xp, xpNextLevel: this.xpNextLevel, leveling: this.leveling,
          kills: this.kills, swarm: this.livingCount(), waveMs: this.waveMs, waveClear: this.waveClear, wave: this.wave,
        };
        if (!this.waveClear) { hud.gold = this.gold; hud.goldDisplay = this.goldDisplay; }
        hud.totalGoldEarned = this.totalGoldEarned; hud.nextWaveBank = this.nextWaveBank;
        hud.fever = time < this.feverUntil; hud.combo = this.gemTimes.length;
        patchHud(hud);
      }
    }
  }

  private isBossWave(wave = this.wave) {
    return wave > 0 && wave % BOSS_WAVE === 0;
  }
  private eraIndex(wave = this.wave) {
    return Math.max(0, Math.floor((wave - 1) / BOSS_WAVE));
  }
  private eraHordeMul(wave = this.wave) {
    return Math.pow(ERA_HORDE_MUL, this.eraIndex(wave));
  }
  private tickSpawns(delta: number, _time: number) {
    if (this.isBossWave()) {
      const hasBoss = this.enemies.some((e) => e.alive && e.kind === "boss");
      if (!hasBoss) {
        this.bossSpawned = false;
        this.spawnBoss();
        this.bossSpawned = true;
      }
      return;
    }
    this.bossSpawned = false;
    this.spawnAcc += delta;
    const cap = Math.min(64, MAX_ENEMIES + (this.wave - 1) * 2 + this.eraIndex() * 6);
    if (this.spawnAcc >= this.spawnInterval() && this.livingCount() < cap) { this.spawnAcc = 0; this.spawnEnemyOutsideView(); }
  }
  private spawnInterval() {
    const t = 1 - this.waveMs / WAVE_DURATION_MS;
    const waveTighten = 1 + (this.wave - 1) * 0.09;
    const eraTighten = Math.pow(ERA_SPAWN_MUL, this.eraIndex());
    return Math.max(90, Phaser.Math.Linear(SPAWN_INTERVAL_MS, SPAWN_INTERVAL_MIN_MS, t) / (waveTighten * eraTighten));
  }
  private waveHpMul() { return (1 + (this.wave - 1) * 0.18) * this.eraHordeMul(); }
  private waveDmgMul() { return (1 + (this.wave - 1) * 0.1) * this.eraHordeMul(); }
  private allowedEnemyTypes(wave = this.wave): HordeKind[] {
    const pool: HordeKind[] = ["swarmer", "grunt", "flanker"];
    if (wave >= 5) pool.push("armored_brute");
    if (wave >= 11) pool.push("charger");
    if (wave >= 15) pool.push("siege");
    return pool;
  }
  private rollTier(): HordeKind {
    const pool = this.allowedEnemyTypes();
    const weight: Record<HordeKind, number> = {
      swarmer: 1.15,
      grunt: 1,
      brute: 0.4,
      flanker: 0.85,
      armored_brute: this.wave >= 5 ? 0.55 + this.eraIndex() * 0.08 : 0,
      charger: this.wave >= 11 ? 0.5 + this.eraIndex() * 0.06 : 0,
      siege: this.wave >= 15 ? 0.28 + this.eraIndex() * 0.05 : 0,
    };
    let total = 0;
    for (const k of pool) total += weight[k] ?? 0.4;
    let n = Math.random() * total;
    for (const k of pool) {
      n -= weight[k] ?? 0.4;
      if (n <= 0) return k;
    }
    return pool[pool.length - 1] ?? "swarmer";
  }
  private specFor(kind: HordeKind): EnemySpec {
    const base = ENEMY_BASE[kind];
    return {
      ...base,
      hp: Math.round(ENEMY_HP_BASE[kind] * this.waveHpMul() + Phaser.Math.Between(0, 6)),
      speed: base.speed,
      contact: Math.round(base.contact * this.waveDmgMul()),
    };
  }
