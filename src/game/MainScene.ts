import * as Phaser from "phaser";
import {
  COLOR,
  COMBO_TRIGGER,
  COMBO_WINDOW_MS,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_HP,
  ENEMY_RADIUS,
  GOLD_TALLY_MS,
  HUD_TICK_MS,
  MAX_ENEMIES,
  PICKUP_FLOAT_MS,
  PLAYER_IFRAME_MS,
  SEGMENT_RADIUS,
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

export class MainScene extends Phaser.Scene {
  private player!: SnakePlayer;
  private shots!: Projectiles;
  private gems!: Gems;
  private enemies: Enemy[] = [];
  private spawnAcc = 0;
  private playerHp = 100;
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

  constructor() {
    super("main");
  }

  init() {
    this.hudAcc = 0;
    this.spawnAcc = 0;
    this.playerHp = 100;
    this.iFrameUntil = 0;
    this.kills = 0;
    this.gold = 0;
    this.goldDisplay = 0;
    this.nextWaveBank = 0;
    this.totalGoldEarned = 0;
    this.dead = false;
    this.waveClear = false;
    this.wave = 1;
    this.waveMs = WAVE_DURATION_MS;
    this.enemies = [];
    this.gemTimes = [];
    this.feverUntil = 0;
  }

  create() {
    this.buildArena();
    const cx = WORLD_SIZE / 2;
    const cy = WORLD_SIZE / 2;
    this.shots = new Projectiles(this);
    this.gems = new Gems(this);
    this.player = new SnakePlayer(this, cx, cy, (ev) => this.shots.spawn(ev));
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
      segments: this.player.segments.length,
      speed: 0,
      hp: this.playerHp,
      maxHp: 100,
      kills: 0,
      gold: 0,
      goldDisplay: 0,
      totalGoldEarned: 0,
      nextWaveBank: 0,
      swarm: 0,
      dead: false,
      waveClear: false,
      waveMs: WAVE_DURATION_MS,
      wave: 1,
      shopOffers: [],
      shopPicked: null,
    });
  }

  update(time: number, delta: number) {
    if (this.dead || this.waveClear) {
      const bucket = runtime();
      if (bucket.restartRequested) {
        bucket.restartRequested = false;
        this.scene.restart();
        return;
      }
      if (this.waveClear && !this.dead) {
        if (bucket.pendingUpgrade) {
          const kind = bucket.pendingUpgrade;
          bucket.pendingUpgrade = null;
          const from = bucket.goldTallyFrom ?? this.gold;
          this.gold = bucket.snap.gold;
          bucket.goldTallyFrom = null;
          this.tallyGoldDisplay(from, this.gold);
          this.applyUpgrade(kind);
        }
        if (bucket.rerollRequested) {
          bucket.rerollRequested = false;
          const from = bucket.goldTallyFrom ?? this.gold;
          this.gold = bucket.snap.gold;
          bucket.goldTallyFrom = null;
          this.tallyGoldDisplay(from, this.gold);
          this.rollShop();
        }
        if (bucket.nextWaveRequested) {
          bucket.nextWaveRequested = false;
          this.startNextWave();
        }
      }
      if (this.dead) return;
      if (this.waveClear) {
        const shopDt = Math.min(delta, 50) / 1000;
        this.collectLoot(shopDt, time);
      }
    }

    const dt = Math.min(delta, 50) / 1000;
    const move = sampleMove();
    const combatOn = isGameStarted() && !this.waveClear && !this.dead;
    this.player.update(dt, move.x, move.y, time, this.enemies, combatOn);

    if (combatOn) {
      this.waveMs = Math.max(0, this.waveMs - delta);
      if (this.waveMs <= 0) {
        this.endWave();
      } else {
        this.spawnAcc += delta;
        const interval = this.spawnInterval();
        if (this.spawnAcc >= interval && this.livingCount() < MAX_ENEMIES) {
          this.spawnAcc = 0;
          this.spawnEnemyOutsideView();
        }
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const t = this.player.nearestChasePoint(e.x, e.y);
          e.chase(t.x, t.y, dt);
        }
        this.shots.update(dt, (x, y, dmg, r) => this.hitEnemiesAt(x, y, dmg, r));
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const bladeDmg = this.player.bladeHits(e.x, e.y, e.radius, time);
          if (bladeDmg > 0) this.applyEnemyHit(e, bladeDmg);
        }
        this.checkPlayerContact(time);
        this.collectLoot(dt, time);
        this.pruneDead();
      }
    }

    this.hudAcc += delta;
    if (this.hudAcc >= HUD_TICK_MS) {
      this.hudAcc = 0;
      if (isGameStarted()) {
        const hud: Parameters<typeof patchHud>[0] = {
          speed: Math.round(Math.hypot(this.player.vx, this.player.vy)),
          segments: this.player.segments.length,
          hp: this.playerHp,
          kills: this.kills,
          swarm: this.livingCount(),
          waveMs: this.waveMs,
          waveClear: this.waveClear,
          wave: this.wave,
        };
        if (!this.waveClear) {
          hud.gold = this.gold;
          hud.goldDisplay = this.goldDisplay;
        }
        hud.totalGoldEarned = this.totalGoldEarned;
        hud.nextWaveBank = this.nextWaveBank;
        hud.fever = time < this.feverUntil;
        hud.combo = this.gemTimes.length;
        patchHud(hud);
      }
    }
  }

  private spawnInterval() {
    const t = 1 - this.waveMs / WAVE_DURATION_MS;
    return Phaser.Math.Linear(SPAWN_INTERVAL_MS, SPAWN_INTERVAL_MIN_MS, t);
  }

  private endWave() {
    this.waveMs = 0;
    this.waveClear = true;
    this.player.reviveAll();
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.shots.clear();
    const vacuumed = this.gems.vacuum();
    if (vacuumed > 0) {
      this.gold += vacuumed;
      this.totalGoldEarned += vacuumed;
    }
    this.goldDisplay = this.gold;
    this.gemTimes = [];
    this.feverUntil = 0;
    const bucket = runtime();
    bucket.shopPicked = null;
    bucket.pendingUpgrade = null;
    bucket.nextWaveRequested = false;
    bucket.rerollRequested = false;
    this.rollShop();
    patchHud({
      waveMs: 0,
      swarm: 0,
      waveClear: true,
      playing: true,
      wave: this.wave,
      shopPicked: null,
      segments: this.player.segments.length,
      hp: this.playerHp,
      kills: this.kills,
      gold: this.gold,
      goldDisplay: this.goldDisplay,
      totalGoldEarned: this.totalGoldEarned,
      nextWaveBank: this.nextWaveBank,
      fever: false,
      combo: 0,
      lastInterest: 0,
      shopFrozen: bucket.shopFrozen,
    });
  }

  private rollShop() {
    const bucket = runtime();
    const offers =
      bucket.shopFrozen && bucket.frozenKinds.length
        ? offersFromKinds(bucket.frozenKinds, this.wave, bucket.purchaseHistory)
        : rollShopOffers(
            this.wave,
            this.player.segments.length,
            { segmentVacuum: this.player.segmentVacuum },
            bucket.purchaseHistory,
          );
    if (!bucket.shopFrozen) bucket.frozenKinds = [];
    bucket.shopOffers = offers;
    bucket.shopPicked = null;
    bucket.pendingUpgrade = null;
    patchHud({
      shopOffers: offers,
      shopPicked: null,
      gold: this.gold,
      segments: this.player.segments.length,
      shopFrozen: bucket.shopFrozen,
    });
  }

  private startNextWave() {
    const bucket = runtime();
    const skipped = !bucket.shopPicked;
    const pricedOut = skipped && !canAffordAny(bucket.snap.gold, bucket.shopOffers);
    this.wave += 1;
    this.waveMs = WAVE_DURATION_MS;
    this.waveClear = false;
    this.spawnAcc = 0;
    this.gold = bucket.snap.gold;
    if (this.nextWaveBank > 0) {
      this.gold += this.nextWaveBank;
      this.nextWaveBank = 0;
    }
    const interest = bankInterest(this.gold);
    this.gold += interest;
    if (interest > 0) this.totalGoldEarned += interest;
    let pityHp = 0;
    let pityGold = 0;
    if (pricedOut) {
      pityGold = SHOP_PITY_GOLD;
      this.gold += pityGold;
      this.totalGoldEarned += pityGold;
      const nextHp = Math.min(100, this.playerHp + SHOP_PITY_HP);
      pityHp = nextHp - this.playerHp;
      this.playerHp = nextHp;
    }
    if (!bucket.shopFrozen) bucket.frozenKinds = [];
    this.gemTimes = [];
    this.feverUntil = 0;
    bucket.shopOffers = [];
    bucket.shopPicked = null;
    bucket.pendingUpgrade = null;
    bucket.rerollRequested = false;
    patchHud({
      waveClear: false,
      waveMs: WAVE_DURATION_MS,
      wave: this.wave,
      swarm: 0,
      shopOffers: [],
      shopPicked: null,
      playing: true,
      segments: this.player.segments.length,
      hp: this.playerHp,
      kills: this.kills,
      gold: this.gold,
      goldDisplay: this.gold,
      totalGoldEarned: this.totalGoldEarned,
      nextWaveBank: 0,
      speed: Math.round(this.player.speed),
      fever: false,
      combo: 0,
      lastInterest: interest,
      shopFrozen: bucket.shopFrozen,
      lastPityHp: pityHp,
      lastPityGold: pityGold,
    });
  }

  private applyUpgrade(kind: ShopKind) {
    if (kind === "add_blaster") {
      this.player.addArmedSegment("blaster");
    } else if (kind === "add_2_blasters") {
      this.player.addArmedSegment("blaster");
      this.player.addArmedSegment("blaster");
    } else if (kind === "turret_rate") {
      this.player.boostFireRate("turret", 0.8);
    } else if (kind === "snake_speed") {
      this.player.boostSpeed(1.18);
    } else if (kind === "blaster_rate") {
      this.player.boostFireRate("blaster", 0.8);
    } else if (kind === "turret_dmg") {
      this.player.boostDamage("turret", 3);
    } else if (kind === "heal") {
      this.playerHp = Math.min(100, this.playerHp + 30);
    } else if (kind === "pickup_radius") {
      this.player.boostPickupRadius();
    } else if (kind === "segment_vacuum") {
      this.player.enableSegmentVacuum();
    } else if (kind === "credit_card") {
      this.player.addArmedSegment("blaster");
      this.player.addArmedSegment("blaster");
      this.player.boostSpeed(1.18);
    }
    patchHud({
      segments: this.player.segments.length,
      hp: this.playerHp,
      gold: this.gold,
      speed: Math.round(this.player.speed),
    });
  }

  private livingCount() {
    return this.enemies.filter((e) => e.alive).length;
  }

  private spawnEnemyOutsideView() {
    const cam = this.cameras.main;
    const view = cam.worldView;
    const pad = 56;
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      const edge = Phaser.Math.Between(0, 3);
      if (edge === 0) {
        x = view.x - pad - ENEMY_RADIUS;
        y = Phaser.Math.Between(view.y, view.bottom);
      } else if (edge === 1) {
        x = view.right + pad + ENEMY_RADIUS;
        y = Phaser.Math.Between(view.y, view.bottom);
      } else if (edge === 2) {
        x = Phaser.Math.Between(view.x, view.right);
        y = view.y - pad - ENEMY_RADIUS;
      } else {
        x = Phaser.Math.Between(view.x, view.right);
        y = view.bottom + pad + ENEMY_RADIUS;
      }
      x = Phaser.Math.Clamp(x, ENEMY_RADIUS + 8, WORLD_SIZE - ENEMY_RADIUS - 8);
      y = Phaser.Math.Clamp(y, ENEMY_RADIUS + 8, WORLD_SIZE - ENEMY_RADIUS - 8);
      tries += 1;
    } while (view.contains(x, y) && tries < 8);
    this.enemies.push(new Enemy(this, x, y, this.rollEnemyHp()));
  }

  private rollEnemyHp() {
    return ENEMY_HP + (this.wave - 1) * 6 + Phaser.Math.Between(0, 10);
  }

  private hitEnemiesAt(x: number, y: number, dmg: number, r: number) {
    for (const e of this.enemies) {
      if (!e.overlaps(x, y, r)) continue;
      this.applyEnemyHit(e, dmg);
      return true;
    }
    return false;
  }

  private applyEnemyHit(e: Enemy, dmg: number) {
    if (!e.alive) return;
    const x = e.x;
    const y = e.y;
    const hpBand = e.maxHp;
    e.hit(dmg);
    this.floatDmg(x, y, dmg);
    if (!e.alive) {
      this.kills += 1;
      this.gems.spawnFromKill(x, y, hpBand);
    }
  }

  private checkPlayerContact(now: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const hitHead =
        now >= this.iFrameUntil &&
        e.overlaps(this.player.x, this.player.y, this.player.getRadius());
      if (hitHead) this.hurtPlayer(ENEMY_CONTACT_DAMAGE, now);
      for (let i = 0; i < this.player.body.length; i++) {
        const s = this.player.body[i]!;
        if (!e.overlaps(s.sprite.x, s.sprite.y, SEGMENT_RADIUS)) continue;
        if (!s.isActive || s.hp <= 0) continue;
        this.player.damageSegment(i, ENEMY_CONTACT_DAMAGE, now);
      }
    }
  }

  private hurtPlayer(amount: number, now: number) {
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.iFrameUntil = now + PLAYER_IFRAME_MS;
    this.cameras.main.flash(70, 180, 40, 50, false);
    patchHud({ hp: this.playerHp });
    if (this.playerHp <= 0) this.onDead();
  }

  private onDead() {
    this.dead = true;
    runtime().started = false;
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.shots.clear();
    this.gems.clear();
    patchHud({
      hp: 0,
      swarm: 0,
      playing: false,
      dead: true,
      waveClear: false,
      gold: this.gold,
      goldDisplay: this.gold,
      totalGoldEarned: this.totalGoldEarned,
      nextWaveBank: this.nextWaveBank,
    });
  }

  private tallyGoldDisplay(from: number, to: number) {
    this.goldDisplay = from;
    patchHud({ goldDisplay: Math.round(from) });
    this.tweens.add({
      targets: this,
      goldDisplay: to,
      duration: GOLD_TALLY_MS,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        patchHud({ goldDisplay: Math.round(this.goldDisplay) });
      },
      onComplete: () => {
        this.goldDisplay = to;
        patchHud({ goldDisplay: to });
      },
    });
  }

  private pruneDead() {
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  private collectLoot(dt: number, now: number) {
    const loot = this.gems.collectHead(this.player.x, this.player.y, dt, {
      pickupRadius: this.player.pickupRadius,
      segments: this.player.segments,
      segmentVacuum: this.player.segmentVacuum,
    });
    if (loot.heal > 0) {
      this.playerHp = Math.min(100, this.playerHp + this.player.heal(loot.heal));
    }
    for (const ev of loot.events) {
      if (ev.kind === "gem") {
        const alreadyFever = now < this.feverUntil;
        this.gemTimes.push(now);
        const cutoff = now - COMBO_WINDOW_MS;
        this.gemTimes = this.gemTimes.filter((t) => t >= cutoff);
        if (this.gemTimes.length > COMBO_TRIGGER) {
          this.feverUntil = now + COMBO_WINDOW_MS;
        }
        const value = alreadyFever ? ev.gold * 2 : ev.gold;
        this.totalGoldEarned += value;
        if (this.waveClear) {
          this.nextWaveBank += value;
        } else {
          this.gold += value;
          this.goldDisplay = this.gold;
        }
        this.floatPickup(ev.x, ev.y, `+${value}`, alreadyFever);
        this.playBlip(alreadyFever);
      } else if (ev.kind === "health") {
        this.floatPickup(ev.x, ev.y, "+HP", false);
        this.playBlip(false);
      } else {
        this.floatPickup(ev.x, ev.y, "MAG", false);
        this.playBlip(false);
      }
    }
  }

  private floatPickup(x: number, y: number, label: string, fever: boolean) {
    const t = this.add.text(x, y, label, {
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: fever ? "16px" : "14px",
      color: fever ? "#f4d35e" : "#5eead4",
    });
    t.setOrigin(0.5);
    t.setDepth(31);
    this.tweens.add({
      targets: t,
      y: y - 32,
      alpha: 0,
      duration: PICKUP_FLOAT_MS,
      onComplete: () => t.destroy(),
    });
  }

  private playBlip(fever: boolean) {
    try {
      const AC =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!this.audioCtx) this.audioCtx = new AC();
      const ctx = this.audioCtx;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      const start = fever ? 1320 : 980;
      const end = fever ? 1980 : 1560;
      osc.frequency.setValueAtTime(start, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(end, ctx.currentTime + 0.055);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      /* audio optional */
    }
  }

  private floatDmg(x: number, y: number, dmg: number) {
    const t = this.add.text(x, y, `-${dmg}`, {
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: "13px",
      color: "#ece8e4",
    });
    t.setOrigin(0.5);
    t.setDepth(30);
    this.tweens.add({
      targets: t,
      y: y - 28,
      alpha: 0,
      duration: 420,
      onComplete: () => t.destroy(),
    });
  }

  private buildArena() {
    const g = this.add.graphics();
    g.setVisible(false);
    g.fillStyle(COLOR.arena, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(1, COLOR.gridLine, 0.55);
    g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    g.fillStyle(COLOR.grid, 0.35);
    g.fillCircle(TILE / 2, TILE / 2, 1.6);
    g.generateTexture("arena-tile", TILE, TILE);
    g.destroy();
    this.floor = this.add.tileSprite(
      WORLD_SIZE / 2,
      WORLD_SIZE / 2,
      WORLD_SIZE,
      WORLD_SIZE,
      "arena-tile",
    );
    this.floor.setDepth(0);
    const border = this.add.graphics();
    border.lineStyle(10, COLOR.bound, 0.9);
    border.strokeRect(6, 6, WORLD_SIZE - 12, WORLD_SIZE - 12);
    border.lineStyle(2, 0xb85c57, 0.35);
    border.strokeRect(18, 18, WORLD_SIZE - 36, WORLD_SIZE - 36);
    border.setDepth(1);
    for (let i = 0; i < 28; i++) {
      const rx = Phaser.Math.Between(120, WORLD_SIZE - 120);
      const ry = Phaser.Math.Between(120, WORLD_SIZE - 120);
      const dust = this.add.circle(rx, ry, Phaser.Math.Between(2, 5), 0xffffff, 0.04);
      dust.setDepth(2);
    }
  }

  private fitZoom() {
    const cam = this.cameras.main;
    const short = Math.min(cam.width, cam.height);
    cam.setZoom(short < 520 ? 0.78 : short < 900 ? 0.92 : 1);
  }

  private onResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height);
    this.fitZoom();
  }

  private cleanup() {
    this.scale.off("resize", this.onResize, this);
    this.unbindKeys?.();
    this.unbindKeys = null;
    this.shots?.destroy();
    this.gems?.destroy();
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.player?.destroy();
    window.__gameReady = false;
    window.__controlsTest = undefined;
  }
}
