import * as Phaser from "phaser";
import {
  BOSS_WAVE, COLOR, COMBO_TRIGGER, COMBO_WINDOW_MS, DESKTOP_ZOOM, ENEMY_RADIUS,
  GOLD_TALLY_MS, HUD_TICK_MS, MAX_ENEMIES, MOBILE_WIDTH, MOBILE_ZOOM, PICKUP_FLOAT_MS,
  PLAYER_IFRAME_MS, PLAYER_MAX_HP, SEGMENT_RADIUS, SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MS,
  TILE, BARD_FRAME_SIZE, BARD_SHEET, WAVE_DURATION_MS, WORLD_SIZE, xpForLevel,
} from "./constants";
import { ENEMY_BASE, Enemy, type EnemyKind, type EnemySpec } from "./Enemy";
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

  private tickSpawns(delta: number, _time: number) {
    if (this.wave === BOSS_WAVE) { if (!this.bossSpawned) { this.spawnBoss(); this.bossSpawned = true; } return; }
    this.spawnAcc += delta;
    const cap = Math.min(50, MAX_ENEMIES + (this.wave - 1) * 2);
    if (this.spawnAcc >= this.spawnInterval() && this.livingCount() < cap) { this.spawnAcc = 0; this.spawnEnemyOutsideView(); }
  }
  private spawnInterval() {
    const t = 1 - this.waveMs / WAVE_DURATION_MS;
    return Math.max(140, Phaser.Math.Linear(SPAWN_INTERVAL_MS, SPAWN_INTERVAL_MIN_MS, t) / (1 + (this.wave - 1) * 0.09));
  }
  private waveHpMul() { return 1 + (this.wave - 1) * 0.18; }
  private waveDmgMul() { return 1 + (this.wave - 1) * 0.1; }
  private rollTier(): Exclude<EnemyKind, "boss"> {
    const brute = Math.min(0.28, 0.04 + this.wave * 0.02), grunt = Math.min(0.5, 0.22 + this.wave * 0.03), n = Math.random();
    if (n < brute) return "brute"; if (n < brute + grunt) return "grunt"; return "swarmer";
  }
  private specFor(kind: Exclude<EnemyKind, "boss">): EnemySpec {
    const base = ENEMY_BASE[kind]; const hpTable = { swarmer: 10, grunt: 24, brute: 70 };
    return { ...base, hp: Math.round(hpTable[kind] * this.waveHpMul() + Phaser.Math.Between(0, 6)), speed: base.speed, contact: Math.round(base.contact * this.waveDmgMul()) };
  }

  private endWave() {
    this.waveMs = 0; this.waveClear = true; this.player.reviveAll();
    for (const e of this.enemies) e.destroy(); this.enemies = []; this.shots.clear(); this.clearHostiles(); this.clearMines(); this.clearMortars();
    const vacuumed = this.gems.vacuum();
    if (vacuumed > 0) { this.gold += vacuumed; this.totalGoldEarned += vacuumed; this.grantXp(vacuumed); }
    this.goldDisplay = this.gold; this.gemTimes = []; this.feverUntil = 0; this.bossSpawned = false;
    const bucket = runtime();
    bucket.shopPicked = null; bucket.pendingUpgrade = null; bucket.pendingWeaponType = null; bucket.pendingWeaponSlot = null;
    bucket.pendingBuys = [];
    bucket.nextWaveRequested = false; bucket.rerollRequested = false; this.rollShop();
    patchHud({ waveMs: 0, swarm: 0, waveClear: true, playing: true, wave: this.wave, shopPicked: null, segments: this.player.segments.length, hp: this.playerHp, kills: this.kills, gold: this.gold, goldDisplay: this.goldDisplay, totalGoldEarned: this.totalGoldEarned, nextWaveBank: this.nextWaveBank, fever: false, combo: 0, lastInterest: 0, shopFrozen: bucket.shopFrozen, slotLocked: [...bucket.slotLocked] });
  }

  private heldOffers(): (ShopOffer | null)[] {
    const bucket = runtime();
    const held: (ShopOffer | null)[] = Array.from({ length: SHOP_SLOTS }, () => null);
    for (let i = 0; i < SHOP_SLOTS; i++) {
      if (bucket.heldOffers?.[i]) held[i] = { ...bucket.heldOffers[i]! };
      else if (bucket.slotLocked[i] && bucket.shopOffers[i] && !(bucket.shopBought ?? []).includes(bucket.shopOffers[i]!.id)) {
        held[i] = { ...bucket.shopOffers[i]! };
      }
    }
    return held;
  }

  private rollShop() {
    const bucket = runtime();
    const offers = rollShopOffers(this.wave, this.player.segments.length, {
      segmentVacuum: this.player.segmentVacuum,
      canMerge: (t, slot) => this.player.canMerge(t, slot),
      mergeToTier: (t, slot) => this.player.mergePreviewTier(t, slot),
      segmentCount: this.player.segments.length,
      mineTier: this.player.mineTier(),
    }, bucket.purchaseHistory, this.heldOffers());
    while (bucket.slotLocked.length < offers.length) bucket.slotLocked.push(false);
    if (!bucket.heldOffers) bucket.heldOffers = [];
    while (bucket.heldOffers.length < offers.length) bucket.heldOffers.push(null);
    bucket.shopOffers = offers; bucket.shopPicked = null; bucket.shopBought = bucket.shopBought ?? [];
    bucket.pendingUpgrade = null; bucket.pendingWeaponType = null; bucket.pendingWeaponSlot = null;
    bucket.pendingBuys = bucket.pendingBuys ?? [];
    bucket.frozenKinds = bucket.slotLocked.map((locked, i) => locked && offers[i] ? offers[i]!.kind : null);
    bucket.shopFrozen = bucket.slotLocked.some(Boolean);
    patchHud({ shopOffers: offers, shopPicked: null, shopBought: [...(bucket.shopBought ?? [])], gold: this.gold, segments: this.player.segments.length, shopFrozen: bucket.shopFrozen, slotLocked: [...bucket.slotLocked] });
  }

  private startNextWave() {
    const bucket = runtime();
    const pricedOut = !(bucket.shopBought?.length) && !canAffordAny(bucket.snap.gold, bucket.shopOffers);
    this.wave += 1; this.waveMs = WAVE_DURATION_MS; this.waveClear = false; this.spawnAcc = 0; this.bossSpawned = false;
    this.gold = bucket.snap.gold;
    if (this.nextWaveBank > 0) { this.gold += this.nextWaveBank; this.nextWaveBank = 0; }
    const interest = bankInterest(this.gold); this.gold += interest; if (interest > 0) this.totalGoldEarned += interest;
    let pityHp = 0, pityGold = 0;
    if (pricedOut) {
      pityGold = SHOP_PITY_GOLD; this.gold += pityGold; this.totalGoldEarned += pityGold;
      const nextHp = Math.min(this.player.headMaxHp, this.playerHp + SHOP_PITY_HP);
      pityHp = nextHp - this.playerHp; this.playerHp = nextHp;
    }
    this.gemTimes = []; this.feverUntil = 0; bucket.shopOffers = []; bucket.shopPicked = null; bucket.shopBought = []; bucket.pendingUpgrade = null; bucket.pendingWeaponType = null; bucket.pendingWeaponSlot = null; bucket.pendingBuys = []; bucket.rerollRequested = false;
    patchHud({ waveClear: false, waveMs: WAVE_DURATION_MS, wave: this.wave, swarm: 0, shopOffers: [], shopPicked: null, shopBought: [], playing: true, segments: this.player.segments.length, hp: this.playerHp, kills: this.kills, gold: this.gold, goldDisplay: this.gold, totalGoldEarned: this.totalGoldEarned, nextWaveBank: 0, speed: Math.round(this.player.speed), fever: false, combo: 0, lastInterest: interest, shopFrozen: bucket.shopFrozen, slotLocked: [...bucket.slotLocked], lastPityHp: pityHp, lastPityGold: pityGold });
  }

  private applyUpgrade(kind: ShopKind, weaponType: WeaponType | null, slot: WeaponSlot | null = null) {
    if (kind === "add_blaster") this.player.grantWeapon(weaponType ?? randomSegmentWeaponType(this.player.mineAtCap()), slot ?? "segment");
    else if (kind === "add_head_weapon") this.player.grantWeapon(weaponType ?? "single_shot", slot ?? "head");
    else if (kind === "add_2_blasters") {
      this.player.grantWeapon(randomSegmentWeaponType(this.player.mineAtCap()), "segment");
      this.player.grantWeapon(randomSegmentWeaponType(this.player.mineAtCap()), "segment");
    }
    else if (kind === "turret_rate") this.player.buffWeaponType("cone_burst", "fireRate", 1.25);
    else if (kind === "snake_speed") this.player.boostSpeed(1.18);
    else if (kind === "blaster_rate") this.player.buffWeaponType("single_shot", "fireRate", 1.25);
    else if (kind === "turret_dmg") this.player.buffWeaponType("cone_burst", "damage", 1.4);
    else if (kind === "heal") this.playerHp = Math.min(this.player.headMaxHp, this.playerHp + 30);
    else if (kind === "pickup_radius" || kind === "stat_pickup") this.player.applyGlobalStat("pickup_radius");
    else if (kind === "stat_max_hp") this.playerHp += this.player.applyGlobalStat("max_hp");
    else if (kind === "stat_move_speed") this.player.applyGlobalStat("move_speed");
    else if (kind === "stat_cooldown") this.player.applyGlobalStat("cooldown");
    else if (kind === "stat_damage") this.player.applyGlobalStat("damage");
    else if (kind === "stat_armor") this.player.applyGlobalStat("armor");
    else if (kind === "segment_vacuum") this.player.enableSegmentVacuum();
    else if (kind === "credit_card") {
      this.player.grantWeapon(randomSegmentWeaponType(this.player.mineAtCap()), "segment");
      this.player.grantWeapon(randomSegmentWeaponType(this.player.mineAtCap()), "segment");
      this.player.boostSpeed(1.18);
    }
    patchHud({ segments: this.player.segments.length, hp: this.playerHp, maxHp: this.player.headMaxHp, gold: this.gold, speed: Math.round(this.player.speed) });
  }

  private onFire(ev: FireEvent) {
    if (ev.kind === "slash") this.applySlash(ev);
    else if (ev.kind === "mine") this.plantMine(ev);
    else if (ev.kind === "chain") this.applyChain(ev);
    else if (ev.kind === "aura") this.applyAura(ev);
    else if (ev.kind === "mortar") this.launchMortar(ev);
    else this.shots.spawn(ev);
  }

  private applySlash(ev: FireEvent) {
    const range = ev.range ?? 80, arc = ev.arc ?? 1.15, angle = ev.angle ?? 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - ev.x, dy = e.y - ev.y, dist = Math.hypot(dx, dy);
      if (dist > range + e.radius) continue;
      if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)) <= arc / 2) this.applyEnemyHit(e, ev.damage);
    }
  }

  private livingCount() { return this.enemies.filter((e) => e.alive).length; }

  private spawnEnemyOutsideView(spec?: EnemySpec) {
    const view = this.cameras.main.worldView, pad = 56;
    let x = 0, y = 0, tries = 0;
    do {
      const edge = Phaser.Math.Between(0, 3);
      if (edge === 0) { x = view.x - pad - ENEMY_RADIUS; y = Phaser.Math.Between(view.y, view.bottom); }
      else if (edge === 1) { x = view.right + pad + ENEMY_RADIUS; y = Phaser.Math.Between(view.y, view.bottom); }
      else if (edge === 2) { x = Phaser.Math.Between(view.x, view.right); y = view.y - pad - ENEMY_RADIUS; }
      else { x = Phaser.Math.Between(view.x, view.right); y = view.bottom + pad + ENEMY_RADIUS; }
      x = Phaser.Math.Clamp(x, ENEMY_RADIUS + 8, WORLD_SIZE - ENEMY_RADIUS - 8);
      y = Phaser.Math.Clamp(y, ENEMY_RADIUS + 8, WORLD_SIZE - ENEMY_RADIUS - 8);
      tries += 1;
    } while (view.contains(x, y) && tries < 8);
    this.enemies.push(new Enemy(this, x, y, spec ?? this.specFor(this.rollTier())));
  }

  private spawnBoss() {
    this.spawnEnemyOutsideView({ kind: "boss", radius: 52, hp: Math.round(820 * this.waveHpMul()), speed: 48, contact: Math.round(22 * this.waveDmgMul()), color: COLOR.boss });
  }

  private spawnHostile(x: number, y: number, vx: number, vy: number, damage: number) {
    const gfx = this.add.circle(x, y, 6, 0xf43f5e, 1); gfx.setDepth(15);
    this.hostiles.push({ gfx, vx, vy, damage, live: true });
  }

  private tickHostiles(dt: number, now: number) {
    for (const s of this.hostiles) {
      if (!s.live) continue;
      s.gfx.x += s.vx * dt; s.gfx.y += s.vy * dt;
      if (s.gfx.x < 0 || s.gfx.y < 0 || s.gfx.x > WORLD_SIZE || s.gfx.y > WORLD_SIZE) { s.live = false; s.gfx.destroy(); continue; }
      if (now >= this.iFrameUntil && this.player.head) {
        const dx = s.gfx.x - this.player.x, dy = s.gfx.y - this.player.y;
        if (dx * dx + dy * dy <= 196) { this.hurtPlayer(s.damage, now); s.live = false; s.gfx.destroy(); }
      }
    }
    this.hostiles = this.hostiles.filter((s) => s.live);
  }
  private clearHostiles() { for (const s of this.hostiles) s.gfx.destroy(); this.hostiles = []; }

  private hitEnemiesAt(x: number, y: number, dmg: number, r: number, mark = 0, pierce = false) {
    let hit = false;
    for (const e of this.enemies) {
      if (!e.alive || !e.overlaps(x, y, r)) continue;
      if (pierce && mark) {
        let marks = this.pierceMarks.get(e); if (!marks) { marks = new Set(); this.pierceMarks.set(e, marks); }
        if (marks.has(mark)) continue; marks.add(mark);
      }
      this.applyEnemyHit(e, dmg); hit = true; if (!pierce) return true;
    }
    return hit;
  }

  private applyEnemyHit(e: Enemy, dmg: number) {
    if (!e.alive) return;
    const x = e.x, y = e.y, hpBand = e.maxHp, wasBoss = e.kind === "boss";
    e.hit(dmg); this.floatDmg(x, y, dmg);
    if (!e.alive) {
      this.kills += 1;
      if (wasBoss) for (let i = 0; i < 18; i++) this.gems.spawnFromKill(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-40, 40), 80);
      else this.gems.spawnFromKill(x, y, hpBand);
    }
  }

  private checkPlayerContact(now: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (now >= this.iFrameUntil && e.overlaps(this.player.x, this.player.y, this.player.getRadius())) this.hurtPlayer(e.contact, now);
      for (let i = 0; i < this.player.body.length; i++) {
        const s = this.player.body[i]!;
        if (!e.overlaps(s.sprite.x, s.sprite.y, SEGMENT_RADIUS) || !s.isActive || s.hp <= 0) continue;
        this.player.damageSegment(i, e.contact, now);
      }
    }
  }

  private hurtPlayer(amount: number, now: number) {
    this.playerHp = Math.max(0, this.playerHp - this.player.mitigate(amount));
    this.iFrameUntil = now + PLAYER_IFRAME_MS;
    this.cameras.main.flash(70, 180, 40, 50, false);
    patchHud({ hp: this.playerHp });
    if (this.playerHp <= 0) this.onDead();
  }

  private onDead() {
    this.dead = true; runtime().started = false;
    for (const e of this.enemies) e.destroy(); this.enemies = []; this.shots.clear(); this.clearHostiles(); this.clearMines(); this.clearMortars(); this.gems.clear();
    patchHud({ hp: 0, swarm: 0, playing: false, dead: true, waveClear: false, gold: this.gold, goldDisplay: this.gold, totalGoldEarned: this.totalGoldEarned, nextWaveBank: this.nextWaveBank });
  }

  private tallyGoldDisplay(from: number, to: number) {
    this.goldDisplay = from; patchHud({ goldDisplay: Math.round(from) });
    this.tweens.add({ targets: this, goldDisplay: to, duration: GOLD_TALLY_MS, ease: "Cubic.easeOut", onUpdate: () => patchHud({ goldDisplay: Math.round(this.goldDisplay) }), onComplete: () => { this.goldDisplay = to; patchHud({ goldDisplay: to }); } });
  }

  private pruneDead() { this.enemies = this.enemies.filter((e) => e.alive); }

  private collectLoot(dt: number, now: number) {
    const loot = this.gems.collectHead(this.player.x, this.player.y, dt, { pickupRadius: this.player.pickupRadius, segments: this.player.segments, segmentVacuum: this.player.segmentVacuum });
    if (loot.heal > 0) this.playerHp = Math.min(this.player.headMaxHp, this.playerHp + this.player.heal(loot.heal));
    for (const ev of loot.events) {
      if (ev.kind === "gem") {
        const alreadyFever = now < this.feverUntil;
        this.gemTimes.push(now); this.gemTimes = this.gemTimes.filter((t) => t >= now - COMBO_WINDOW_MS);
        if (this.gemTimes.length > COMBO_TRIGGER) this.feverUntil = now + COMBO_WINDOW_MS;
        const value = alreadyFever ? ev.gold * 2 : ev.gold;
        this.totalGoldEarned += value;
        if (this.waveClear) this.nextWaveBank += value; else { this.gold += value; this.goldDisplay = this.gold; }
        this.grantXp(value); this.floatPickup(ev.x, ev.y, `+${value}`, alreadyFever); this.playBlip(alreadyFever);
      } else if (ev.kind === "health") { this.floatPickup(ev.x, ev.y, "+HP", false); this.playBlip(false); }
      else { this.floatPickup(ev.x, ev.y, "MAG", false); this.playBlip(false); }
    }
  }

  private plantMine(ev: FireEvent) {
    const gfx = this.add.circle(ev.x, ev.y, 8, 0x6b7280, 0.55);
    gfx.setStrokeStyle(2, 0x9ca3af, 0.7);
    gfx.setDepth(14);
    this.mines.push({
      gfx,
      x: ev.x,
      y: ev.y,
      r: ev.radius,
      damage: ev.damage,
      live: true,
      armedAt: this.time.now + 2000,
    });
  }
  private tickMines(now: number) {
    for (const m of this.mines) {
      if (!m.live) continue;
      const armStart = m.armedAt - 2000;
      const t = Phaser.Math.Clamp((now - armStart) / 2000, 0, 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x6b7280),
        Phaser.Display.Color.ValueToColor(0xef4444),
        100,
        Math.round(t * 100),
      );
      m.gfx.setFillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 0.45 + t * 0.55);
      m.gfx.setStrokeStyle(2, t >= 1 ? 0xffe4e6 : 0x9ca3af, 0.7 + t * 0.25);
      if (now < m.armedAt) continue;
      for (const e of this.enemies) {
        if (e.alive && e.overlaps(m.x, m.y, m.r)) {
          this.detonateMine(m);
          break;
        }
      }
    }
    this.mines = this.mines.filter((m) => m.live);
  }
  private detonateMine(m: Mine) {
    m.live = false;
    const flash = this.add.circle(m.x, m.y, m.r, COLOR.mine, 0.35); flash.setDepth(15);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.4, duration: 180, onComplete: () => flash.destroy() });
    for (const e of this.enemies) if (e.alive && e.overlaps(m.x, m.y, m.r)) this.applyEnemyHit(e, m.damage);
    m.gfx.destroy();
  }
  private clearMines() { for (const m of this.mines) m.gfx.destroy(); this.mines = []; }

  private launchMortar(ev: FireEvent) {
    const tx = ev.tx ?? ev.x;
    const ty = ev.ty ?? ev.y;
    const gfx = this.add.circle(ev.x, ev.y, 6, COLOR.mortar, 0.95);
    gfx.setStrokeStyle(2, 0xbbf7d0, 0.9);
    gfx.setDepth(17);
    const mark = this.add.circle(tx, ty, 10, COLOR.mortar, 0);
    mark.setStrokeStyle(1.5, COLOR.mortar, 0.7);
    mark.setDepth(9);
    this.tweens.add({ targets: mark, alpha: 0.25, duration: 900, yoyo: true, repeat: 2, onComplete: () => mark.destroy() });
    this.mortars.push({
      gfx,
      x: ev.x,
      y: ev.y,
      tx,
      ty,
      speed: 190,
      damage: ev.damage,
      aoe: ev.aoe ?? 78,
      live: true,
    });
  }
  private tickMortars(dt: number) {
    for (const s of this.mortars) {
      if (!s.live) continue;
      const dx = s.tx - s.gfx.x;
      const dy = s.ty - s.gfx.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= Math.max(6, s.speed * dt)) {
        this.detonateMortar(s);
        continue;
      }
      s.gfx.x += (dx / dist) * s.speed * dt;
      s.gfx.y += (dy / dist) * s.speed * dt;
    }
    this.mortars = this.mortars.filter((s) => s.live);
  }
  private detonateMortar(s: MortarShell) {
    s.live = false;
    const x = s.tx;
    const y = s.ty;
    s.gfx.destroy();
    const blast = this.add.circle(x, y, 8, COLOR.mortar, 0.45);
    blast.setStrokeStyle(3, 0xbbf7d0, 0.9);
    blast.setDepth(16);
    this.tweens.add({
      targets: blast,
      scale: Math.max(1, s.aoe / 8),
      alpha: 0,
      duration: 280,
      ease: "Cubic.easeOut",
      onComplete: () => blast.destroy(),
    });
    for (const e of this.enemies) {
      if (e.alive && e.overlaps(x, y, s.aoe)) this.applyEnemyHit(e, s.damage);
    }
  }
  private clearMortars() {
    for (const s of this.mortars) s.gfx.destroy();
    this.mortars = [];
  }
  private applyAura(ev: FireEvent) { for (const e of this.enemies) if (e.alive && e.overlaps(ev.x, ev.y, ev.radius)) this.applyEnemyHit(e, ev.damage); }
  private applyChain(ev: FireEvent) {
    const used = new Set<Enemy>(); let cx = ev.x, cy = ev.y; const hops = ev.bounces ?? 3, reach = ev.bounceRadius ?? 170;
    for (let i = 0; i < hops; i++) {
      let best: Enemy | null = null, bestD = reach * reach;
      for (const e of this.enemies) {
        if (!e.alive || used.has(e)) continue;
        const d = (e.x - cx) ** 2 + (e.y - cy) ** 2;
        if (d < bestD) { bestD = d; best = e; }
      }
      if (!best) break; used.add(best); this.drawBolt(cx, cy, best.x, best.y); this.applyEnemyHit(best, ev.damage); cx = best.x; cy = best.y;
    }
  }
  private drawBolt(x1: number, y1: number, x2: number, y2: number) {
    const g = this.add.graphics(); g.setDepth(18); g.lineStyle(2.4, COLOR.chain, 0.95); g.lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() });
  }
  private grantXp(amount: number) {
    if (amount <= 0 || this.leveling || this.dead) return;
    this.xp += amount;
    while (this.xp >= this.xpNextLevel && !this.leveling) { this.xp -= this.xpNextLevel; this.playerLevel += 1; this.xpNextLevel = xpForLevel(this.playerLevel); this.beginLevelUp(); }
    patchHud({ xp: this.xp, xpNextLevel: this.xpNextLevel, playerLevel: this.playerLevel });
  }
  private beginLevelUp() {
    this.leveling = true; this.player.fullHeal(); this.playerHp = this.player.headMaxHp;
    try { this.physics?.world?.pause(); } catch { /* optional */ }
    const offers = rollLevelOffers(Date.now(), { mineTier: this.player.mineTier() }); setLevelOffers(offers);
    patchHud({ leveling: true, levelOffers: offers, hp: this.playerHp, maxHp: this.player.headMaxHp, playerLevel: this.playerLevel, xp: this.xp, xpNextLevel: this.xpNextLevel });
  }
  private resolveLevelUp(stat: GlobalStatId | null, weaponType: WeaponType | null = null, slot: WeaponSlot | null = null) {
    try {
      if (weaponType) this.player.grantWeapon(weaponType, slot ?? undefined);
      if (stat) {
        const hpGain = this.player.applyGlobalStat(stat);
        if (hpGain > 0) this.playerHp = Math.min(this.player.headMaxHp, this.playerHp + hpGain);
      }
    } catch { /* still unpause */ }
    this.playerHp = this.player.headMaxHp; this.player.fullHeal(); this.leveling = false;
    runtime().leveling = false;
    try { this.physics?.world?.resume(); } catch { /* optional */ }
    patchHud({ leveling: false, levelOffers: [], hp: this.playerHp, maxHp: this.player.headMaxHp, playerLevel: this.playerLevel, xp: this.xp, xpNextLevel: this.xpNextLevel, speed: Math.round(this.player.speed), segments: this.player.segments.length });
  }

  private floatPickup(x: number, y: number, label: string, fever: boolean) {
    const t = this.add.text(x, y, label, { fontFamily: "IBM Plex Mono, monospace", fontSize: fever ? "16px" : "14px", color: fever ? "#f4d35e" : "#5eead4" });
    t.setOrigin(0.5); t.setDepth(31);
    this.tweens.add({ targets: t, y: y - 32, alpha: 0, duration: PICKUP_FLOAT_MS, onComplete: () => t.destroy() });
  }
  private playBlip(fever: boolean) {
    try {
      const AC = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return; if (!this.audioCtx) this.audioCtx = new AC();
      const ctx = this.audioCtx; if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = "sine";
      osc.frequency.setValueAtTime(fever ? 1320 : 980, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(fever ? 1980 : 1560, ctx.currentTime + 0.055);
      gain.gain.setValueAtTime(0.07, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);
    } catch { /* optional */ }
  }
  private floatDmg(x: number, y: number, dmg: number) {
    const t = this.add.text(x, y, `-${dmg}`, { fontFamily: "IBM Plex Mono, monospace", fontSize: "13px", color: "#ece8e4" });
    t.setOrigin(0.5); t.setDepth(30);
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 420, onComplete: () => t.destroy() });
  }
  private buildArena() {
    const g = this.add.graphics(); g.setVisible(false); g.fillStyle(COLOR.arena, 1); g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(1, COLOR.gridLine, 0.55); g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    g.fillStyle(COLOR.grid, 0.35); g.fillCircle(TILE / 2, TILE / 2, 1.6);
    g.generateTexture("arena-tile", TILE, TILE); g.destroy();
    this.floor = this.add.tileSprite(WORLD_SIZE / 2, WORLD_SIZE / 2, WORLD_SIZE, WORLD_SIZE, "arena-tile"); this.floor.setDepth(0);
    const border = this.add.graphics(); border.lineStyle(10, COLOR.bound, 0.9); border.strokeRect(6, 6, WORLD_SIZE - 12, WORLD_SIZE - 12);
    border.lineStyle(2, 0xb85c57, 0.35); border.strokeRect(18, 18, WORLD_SIZE - 36, WORLD_SIZE - 36); border.setDepth(1);
    for (let i = 0; i < 28; i++) this.add.circle(Phaser.Math.Between(120, WORLD_SIZE - 120), Phaser.Math.Between(120, WORLD_SIZE - 120), Phaser.Math.Between(2, 5), 0xffffff, 0.04).setDepth(2);
  }
  private isMobileView() { const w = this.scale.gameSize.width, h = this.scale.gameSize.height; return w < MOBILE_WIDTH || (h > w && w < 1100); }
  private fitZoom() { this.cameras.main.setZoom(this.isMobileView() ? MOBILE_ZOOM : DESKTOP_ZOOM); }
  private onResize(_gameSize: Phaser.Structs.Size) { this.fitZoom(); }
  private cleanup() {
    this.scale.off("resize", this.onResize, this); this.unbindKeys?.(); this.unbindKeys = null;
    this.shots?.destroy(); this.gems?.destroy(); this.clearHostiles(); this.clearMines(); this.clearMortars();
    for (const e of this.enemies) e.destroy(); this.enemies = []; this.player?.destroy();
    window.__gameReady = false; window.__controlsTest = undefined;
  }
}
