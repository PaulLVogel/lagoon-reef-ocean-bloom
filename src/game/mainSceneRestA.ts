import * as Phaser from "phaser";
import {
  BOSS_WAVE, COLOR, COMBO_TRIGGER, COMBO_WINDOW_MS, DESKTOP_ZOOM, ENEMY_RADIUS,
  ERA_BOSS_DMG_MUL, ERA_BOSS_HP_MUL, ERA_HORDE_MUL, ERA_SPAWN_MUL,
  GOLD_TALLY_MS, HUD_TICK_MS, MAX_ENEMIES, MOBILE_WIDTH, MOBILE_ZOOM, PICKUP_FLOAT_MS,
  PLAYER_IFRAME_MS, PLAYER_MAX_HP, SEGMENT_RADIUS, SPAWN_INTERVAL_MIN_MS, SPAWN_INTERVAL_MS,
  TILE, MORTAR_FX_ANIM, MORTAR_FX_FPS, MORTAR_FX_FRAME_H, MORTAR_FX_FRAME_W, MORTAR_FX_FRAMES, MORTAR_FX_SHEET,
  WAVE_DURATION_MS, WORLD_SIZE, xpForLevel,
} from "./constants";
import { ENEMY_BASE, ENEMY_HP_BASE, Enemy, type HordeKind, type EnemySpec } from "./Enemy";
import { isGameStarted, sampleMove } from "./input";
import { patchHud, runtime, setLevelOffers } from "./runtime";
import { rollLevelOffers, type GlobalStatId } from "./stats";
import { bankInterest, canAffordAny, rollShopOffers, SHOP_PITY_GOLD, SHOP_PITY_HP, SHOP_SLOTS, type ShopKind, type ShopOffer } from "./shop";
import { randomSegmentWeaponType, type FireEvent, type WeaponSlot, type WeaponType } from "./Weapon";

export function installMainSceneRestA(proto: any) {
  proto.update = function(this: any, time: number, delta: number) {
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

  proto.isBossWave = function(this: any, wave = this.wave) { return wave > 0 && wave % BOSS_WAVE === 0; }
  proto.eraIndex = function(this: any, wave = this.wave) { return Math.max(0, Math.floor((wave - 1) / BOSS_WAVE)); }
  proto.eraHordeMul = function(this: any, wave = this.wave) { return Math.pow(ERA_HORDE_MUL, this.eraIndex(wave)); }
  proto.tickSpawns = function(this: any, delta: number, _time: number) {
    if (this.isBossWave()) {
      const hasBoss = this.enemies.some((e) => e.alive && e.kind === "boss");
      if (!hasBoss) { this.bossSpawned = false; this.spawnBoss(); this.bossSpawned = true; }
      return;
    }
    this.bossSpawned = false;
    this.spawnAcc += delta;
    const cap = Math.min(64, MAX_ENEMIES + (this.wave - 1) * 2 + this.eraIndex() * 6);
    if (this.spawnAcc >= this.spawnInterval() && this.livingCount() < cap) { this.spawnAcc = 0; this.spawnEnemyOutsideView(); }
  }
  proto.spawnInterval = function(this: any) {
    const t = 1 - this.waveMs / WAVE_DURATION_MS;
    const waveTighten = 1 + (this.wave - 1) * 0.09;
    const eraTighten = Math.pow(ERA_SPAWN_MUL, this.eraIndex());
    return Math.max(90, Phaser.Math.Linear(SPAWN_INTERVAL_MS, SPAWN_INTERVAL_MIN_MS, t) / (waveTighten * eraTighten));
  }
  proto.waveHpMul = function(this: any) { return (1 + (this.wave - 1) * 0.18) * this.eraHordeMul(); }
  proto.waveDmgMul = function(this: any) { return (1 + (this.wave - 1) * 0.1) * this.eraHordeMul(); }
  proto.allowedEnemyTypes = function(this: any, wave = this.wave) {
    const pool: HordeKind[] = ["swarmer", "grunt", "flanker"];
    if (wave >= 5) pool.push("armored_brute");
    if (wave >= 11) pool.push("charger");
    if (wave >= 15) pool.push("siege");
    return pool;
  }
  proto.rollTier = function(this: any) {
    const pool = this.allowedEnemyTypes();
    const weight: Record<HordeKind, number> = {
      swarmer: 1.15, grunt: 1, brute: 0.4, flanker: 0.85,
      armored_brute: this.wave >= 5 ? 0.55 + this.eraIndex() * 0.08 : 0,
      charger: this.wave >= 11 ? 0.5 + this.eraIndex() * 0.06 : 0,
      siege: this.wave >= 15 ? 0.28 + this.eraIndex() * 0.05 : 0,
    };
    let total = 0;
    for (const k of pool) total += weight[k] ?? 0.4;
    let n = Math.random() * total;
    for (const k of pool) { n -= weight[k] ?? 0.4; if (n <= 0) return k; }
    return pool[pool.length - 1] ?? "swarmer";
  }
  proto.specFor = function(this: any, kind: HordeKind) {
    const base = ENEMY_BASE[kind];
    return { ...base, hp: Math.round(ENEMY_HP_BASE[kind] * this.waveHpMul() + Phaser.Math.Between(0, 6)), speed: base.speed, contact: Math.round(base.contact * this.waveDmgMul()) };
  }

  proto.endWave = function(this: any) {
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

  proto.heldOffers = function(this: any) {
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

  proto.rollShop = function(this: any) {
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
}
