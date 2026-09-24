import * as Phaser from "phaser";
import {
  COLOR, COMBO_TRIGGER, COMBO_WINDOW_MS, ENEMY_RADIUS,
  ERA_BOSS_DMG_MUL, ERA_BOSS_HP_MUL, GOLD_TALLY_MS,
  PLAYER_IFRAME_MS, SEGMENT_RADIUS, WAVE_DURATION_MS, WORLD_SIZE,
} from "./constants";
import { Enemy, type EnemySpec } from "./Enemy";
import { patchHud, runtime } from "./runtime";
import { bankInterest, canAffordAny, SHOP_PITY_GOLD, SHOP_PITY_HP, type ShopKind } from "./shop";
import { randomSegmentWeaponType, type FireEvent, type WeaponSlot, type WeaponType } from "./Weapon";

export function installMainSceneRestB(proto: any) {
  proto.startNextWave = function(this: any) {
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

  proto.applyUpgrade = function(this: any, kind: ShopKind, weaponType: WeaponType | null, slot: WeaponSlot | null = null) {
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

  proto.onFire = function(this: any, ev: FireEvent) {
    if (ev.kind === "slash") this.applySlash(ev);
    else if (ev.kind === "mine") this.plantMine(ev);
    else if (ev.kind === "chain") this.applyChain(ev);
    else if (ev.kind === "aura") this.applyAura(ev);
    else if (ev.kind === "mortar") this.launchMortar(ev);
    else this.shots.spawn(ev);
  }

  proto.applySlash = function(this: any, ev: FireEvent) {
    const range = ev.range ?? 80, arc = ev.arc ?? 1.15, angle = ev.angle ?? 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - ev.x, dy = e.y - ev.y, dist = Math.hypot(dx, dy);
      if (dist > range + e.radius) continue;
      if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - angle)) <= arc / 2) this.applyEnemyHit(e, ev.damage);
    }
  }

  proto.livingCount = function(this: any) { return this.enemies.filter((e: any) => e.alive).length; }

  proto.spawnEnemyOutsideView = function(this: any, spec?: EnemySpec) {
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
    const enemy = new Enemy(this, x, y, spec ?? this.specFor(this.rollTier()));
    this.armEnemyBody(enemy);
    this.enemies.push(enemy);
  }

  proto.armEnemyBody = function(this: any, enemy: Enemy) {
    if (!enemy?.root) return;
    const r = enemy.radius;
    enemy.root.setSize(r * 2, r * 2);
    if (!enemy.root.body) this.physics.add.existing(enemy.root);
    const body = enemy.root.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.moves = false;
    body.setCircle(r);
    body.setOffset(-r, -r);
    body.reset(enemy.x, enemy.y);
    this.foes?.add(enemy.root);
  }

  proto.spawnBoss = function(this: any) {
    const era = this.eraIndex();
    const hp = Math.round(820 * (1 + (this.wave - 1) * 0.18) * Math.pow(ERA_BOSS_HP_MUL, era));
    const contact = Math.round(22 * (1 + (this.wave - 1) * 0.1) * Math.pow(ERA_BOSS_DMG_MUL, era));
    this.spawnEnemyOutsideView({ kind: "boss", radius: 52, hp, speed: 48, contact, color: COLOR.boss });
  }

  proto.spawnHostile = function(this: any, x: number, y: number, vx: number, vy: number, damage: number) {
    const r = 6;
    const gfx = this.add.circle(x, y, r, 0xf43f5e, 1);
    gfx.setDepth(15);
    gfx.setData("hostileDamage", damage);
    gfx.setData("hostileShot", true);
    this.physics.add.existing(gfx);
    const body = gfx.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.moves = false;
    body.enable = true;
    body.setCircle(r);
    body.updateFromGameObject();
    if (this.hostileGroup) this.hostileGroup.add(gfx);
    this.hostiles.push({ gfx, vx, vy, damage, live: true });
  }

  proto.tickHostiles = function(this: any, dt: number, now: number) {
    for (const s of this.hostiles) {
      if (!s.live) continue;
      s.gfx.x += s.vx * dt; s.gfx.y += s.vy * dt;
      const body = s.gfx.body as Phaser.Physics.Arcade.Body | undefined;
      if (body) body.updateFromGameObject();
      if (s.gfx.x < 0 || s.gfx.y < 0 || s.gfx.x > WORLD_SIZE || s.gfx.y > WORLD_SIZE) { s.live = false; s.gfx.destroy(); continue; }
      if (now >= this.iFrameUntil && this.player.head) {
        const dx = s.gfx.x - this.player.x, dy = s.gfx.y - this.player.y;
        const need = 6 + this.player.getRadius();
        if (dx * dx + dy * dy <= need * need) { this.hurtPlayer(s.damage, now); s.live = false; s.gfx.destroy(); continue; }
      }
      for (let i = 0; i < this.player.body.length; i++) {
        const seg = this.player.body[i]!;
        if (!seg.isActive || seg.hp <= 0) continue;
        const dx = s.gfx.x - seg.sprite.x, dy = s.gfx.y - seg.sprite.y;
        const need = 6 + SEGMENT_RADIUS;
        if (dx * dx + dy * dy > need * need) continue;
        if (this.player.damageSegment(i, s.damage, now)) { s.live = false; s.gfx.destroy(); break; }
      }
    }
    this.hostiles = this.hostiles.filter((s: any) => s.live);
  }
  proto.clearHostiles = function(this: any) { for (const s of this.hostiles) s.gfx.destroy(); this.hostiles = []; }

  proto.hitEnemiesAt = function(this: any, x: number, y: number, dmg: number, r: number, mark = 0, pierce = false) {
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

  proto.applyEnemyHit = function(this: any, e: Enemy, dmg: number) {
    if (!e.alive) return;
    const x = e.x, y = e.y, hpBand = e.maxHp, wasBoss = e.kind === "boss";
    e.hit(dmg); this.floatDmg(x, y, dmg);
    if (!e.alive) {
      this.kills += 1;
      if (wasBoss) {
        const piles = 18 + this.eraIndex() * 6;
        for (let i = 0; i < piles; i++) this.gems.spawnFromKill(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-40, 40), 80);
        if (this.isBossWave() && !this.waveClear && !this.dead) this.endWave();
      } else this.gems.spawnFromKill(x, y, hpBand);
    }
  }

  proto.handleSegmentDamage = function(this: any, enemyOrShot: Phaser.GameObjects.GameObject, segmentObj: Phaser.GameObjects.GameObject, kind: "contact" | "shot" = "contact") {
    const index = this.player.indexOfSegment(segmentObj);
    if (index < 0) return;
    const state = this.player.body[index];
    if (!state || !state.isActive || state.hp <= 0) return;
    const now = this.time.now;
    const isShot = kind === "shot" || !!(enemyOrShot as any)?.getData?.("hostileShot") || (enemyOrShot as any)?.getData?.("hostileDamage") != null;
    if (isShot) {
      const shot = this.hostiles.find((s: any) => s.live && (s.gfx === enemyOrShot || s.gfx.body === (enemyOrShot as any).body));
      const dmg = shot?.damage ?? Number((enemyOrShot as any).getData?.("hostileDamage") ?? 0);
      if (!dmg) return;
      if (!this.player.damageSegment(index, dmg, now)) return;
      if (shot) { shot.live = false; if (shot.gfx.active) shot.gfx.destroy(); }
      else if ((enemyOrShot as any)?.active) (enemyOrShot as any).destroy();
      return;
    }
    const enemy = this.enemies.find((e: Enemy) => e.alive && (e.root === enemyOrShot || e.root.body === (enemyOrShot as any).body));
    if (!enemy) return;
    this.player.damageSegment(index, enemy.contact, now);
  }

  proto.checkPlayerContact = function(this: any, now: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const eBody = e.root.body as Phaser.Physics.Arcade.Body | undefined;
      if (eBody) eBody.reset(e.x, e.y);
      if (now >= this.iFrameUntil && e.overlaps(this.player.x, this.player.y, this.player.getRadius())) this.hurtPlayer(e.contact, now);
      for (let i = 0; i < this.player.body.length; i++) {
        const s = this.player.body[i]!;
        if (!s.isActive || s.hp <= 0) continue;
        if (!e.overlaps(s.sprite.x, s.sprite.y, SEGMENT_RADIUS)) continue;
        this.player.damageSegment(i, e.contact, now);
      }
    }
  }

  proto.hurtPlayer = function(this: any, amount: number, now: number) {
    this.playerHp = Math.max(0, this.playerHp - this.player.mitigate(amount));
    this.iFrameUntil = now + PLAYER_IFRAME_MS;
    this.cameras.main.flash(70, 180, 40, 50, false);
    patchHud({ hp: this.playerHp });
    if (this.playerHp <= 0) this.onDead();
  }

  proto.onDead = function(this: any) {
    this.dead = true; runtime().started = false;
    for (const e of this.enemies) e.destroy(); this.enemies = []; this.shots.clear(); this.clearHostiles(); this.clearMines(); this.clearMortars(); this.gems.clear();
    patchHud({ hp: 0, swarm: 0, playing: false, dead: true, waveClear: false, gold: this.gold, goldDisplay: this.gold, totalGoldEarned: this.totalGoldEarned, nextWaveBank: this.nextWaveBank });
  }

  proto.tallyGoldDisplay = function(this: any, from: number, to: number) {
    this.goldDisplay = from; patchHud({ goldDisplay: Math.round(from) });
    this.tweens.add({ targets: this, goldDisplay: to, duration: GOLD_TALLY_MS, ease: "Cubic.easeOut", onUpdate: () => patchHud({ goldDisplay: Math.round(this.goldDisplay) }), onComplete: () => { this.goldDisplay = to; patchHud({ goldDisplay: to }); } });
  }

  proto.pruneDead = function(this: any) { this.enemies = this.enemies.filter((e: any) => e.alive); }

  proto.collectLoot = function(this: any, dt: number, now: number) {
    const loot = this.gems.collectHead(this.player.x, this.player.y, dt, { pickupRadius: this.player.pickupRadius, segments: this.player.segments, segmentVacuum: this.player.segmentVacuum });
    if (loot.heal > 0) this.playerHp = Math.min(this.player.headMaxHp, this.playerHp + this.player.heal(loot.heal));
    for (const ev of loot.events) {
      if (ev.kind === "gem") {
        const alreadyFever = now < this.feverUntil;
        this.gemTimes.push(now); this.gemTimes = this.gemTimes.filter((t: number) => t >= now - COMBO_WINDOW_MS);
        if (this.gemTimes.length > COMBO_TRIGGER) this.feverUntil = now + COMBO_WINDOW_MS;
        const value = alreadyFever ? ev.gold * 2 : ev.gold;
        this.totalGoldEarned += value;
        if (this.waveClear) this.nextWaveBank += value; else { this.gold += value; this.goldDisplay = this.gold; }
        this.grantXp(value); this.floatPickup(ev.x, ev.y, `+${value}`, alreadyFever); this.playBlip(alreadyFever);
      } else if (ev.kind === "health") { this.floatPickup(ev.x, ev.y, "+HP", false); this.playBlip(false); }
      else { this.floatPickup(ev.x, ev.y, "MAG", false); this.playBlip(false); }
    }
  }
}
