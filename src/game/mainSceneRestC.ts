import * as Phaser from "phaser";
import {
  COLOR, COMBO_TRIGGER, COMBO_WINDOW_MS, DESKTOP_ZOOM,
  GOLD_TALLY_MS, MOBILE_WIDTH, MOBILE_ZOOM, PICKUP_FLOAT_MS,
  TILE, MORTAR_FX_ANIM, MORTAR_FX_FPS, MORTAR_FX_FRAME_W, MORTAR_FX_FRAMES, MORTAR_FX_SHEET,
  WAVE_DURATION_MS, WORLD_SIZE, xpForLevel,
} from "./constants";
import { Enemy } from "./Enemy";
import { patchHud, runtime, setLevelOffers } from "./runtime";
import { rollLevelOffers, type GlobalStatId } from "./stats";
import { type WeaponSlot, type WeaponType } from "./Weapon";
import { type FireEvent } from "./Weapon";

export function installMainSceneRestC(proto: any) {
  proto.plantMine = function(this: any, ev: FireEvent) {
    const gfx = this.add.circle(ev.x, ev.y, 8, 0x6b7280, 0.55);
    gfx.setStrokeStyle(2, 0x9ca3af, 0.7); gfx.setDepth(14);
    this.mines.push({ gfx, x: ev.x, y: ev.y, r: ev.radius, damage: ev.damage, live: true, armedAt: this.time.now + 2000 });
  }
  proto.tickMines = function(this: any, now: number) {
    for (const m of this.mines) {
      if (!m.live) continue;
      const armStart = m.armedAt - 2000;
      const t = Phaser.Math.Clamp((now - armStart) / 2000, 0, 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x6b7280), Phaser.Display.Color.ValueToColor(0xef4444), 100, Math.round(t * 100));
      m.gfx.setFillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 0.45 + t * 0.55);
      m.gfx.setStrokeStyle(2, t >= 1 ? 0xffe4e6 : 0x9ca3af, 0.7 + t * 0.25);
      if (now < m.armedAt) continue;
      for (const e of this.enemies) { if (e.alive && e.overlaps(m.x, m.y, m.r)) { this.detonateMine(m); break; } }
    }
    this.mines = this.mines.filter((m: any) => m.live);
  }
  proto.detonateMine = function(this: any, m: any) {
    m.live = false;
    const flash = this.add.circle(m.x, m.y, m.r, COLOR.mine, 0.35); flash.setDepth(15);
    this.tweens.add({ targets: flash, alpha: 0, scale: 1.4, duration: 180, onComplete: () => flash.destroy() });
    for (const e of this.enemies) if (e.alive && e.overlaps(m.x, m.y, m.r)) this.applyEnemyHit(e, m.damage);
    m.gfx.destroy();
  }
  proto.clearMines = function(this: any) { for (const m of this.mines) m.gfx.destroy(); this.mines = []; }

  proto.launchMortar = function(this: any, ev: FireEvent) {
    const tx = ev.tx ?? ev.x, ty = ev.ty ?? ev.y;
    const gfx = this.add.circle(ev.x, ev.y, 6, COLOR.mortar, 0.95);
    gfx.setStrokeStyle(2, 0xbbf7d0, 0.9); gfx.setDepth(17);
    const mark = this.add.circle(tx, ty, 10, COLOR.mortar, 0);
    mark.setStrokeStyle(1.5, COLOR.mortar, 0.7); mark.setDepth(9);
    this.tweens.add({ targets: mark, alpha: 0.25, duration: 900, yoyo: true, repeat: 2, onComplete: () => mark.destroy() });
    this.mortars.push({ gfx, x: ev.x, y: ev.y, tx, ty, speed: 190, damage: ev.damage, aoe: ev.aoe ?? 78, live: true });
  }
  proto.tickMortars = function(this: any, dt: number) {
    for (const s of this.mortars) {
      if (!s.live) continue;
      const dx = s.tx - s.gfx.x, dy = s.ty - s.gfx.y, dist = Math.hypot(dx, dy);
      if (dist <= Math.max(6, s.speed * dt)) { this.detonateMortar(s); continue; }
      s.gfx.x += (dx / dist) * s.speed * dt; s.gfx.y += (dy / dist) * s.speed * dt;
    }
    this.mortars = this.mortars.filter((s: any) => s.live);
  }
  proto.ensureMortarFx = function(this: any) {
    const tex = this.textures.get(MORTAR_FX_SHEET);
    if (tex && tex.key !== "__MISSING") tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    if (!this.anims.exists(MORTAR_FX_ANIM)) {
      this.anims.create({
        key: MORTAR_FX_ANIM,
        frames: this.anims.generateFrameNumbers(MORTAR_FX_SHEET, { start: 0, end: MORTAR_FX_FRAMES - 1 }),
        frameRate: MORTAR_FX_FPS,
        repeat: 0,
      });
    }
  }
  proto.playMortarExplosion = function(this: any, x: number, y: number, aoe: number) {
    if (!this.textures.exists(MORTAR_FX_SHEET)) return;
    const scale = Math.max(0.7, (aoe * 2.15) / MORTAR_FX_FRAME_W);
    const fx = this.add.sprite(x, y, MORTAR_FX_SHEET, 0);
    fx.setOrigin(0.5, 0.82);
    fx.setScale(scale);
    fx.setDepth(16);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    fx.play(MORTAR_FX_ANIM);
  }
  proto.detonateMortar = function(this: any, s: any) {
    s.live = false; const x = s.tx, y = s.ty; s.gfx.destroy();
    this.playMortarExplosion(x, y, s.aoe);
    for (const e of this.enemies) if (e.alive && e.overlaps(x, y, s.aoe)) this.applyEnemyHit(e, s.damage);
  }
  proto.clearMortars = function(this: any) { for (const s of this.mortars) s.gfx.destroy(); this.mortars = []; }
  proto.applyAura = function(this: any, ev: FireEvent) { for (const e of this.enemies) if (e.alive && e.overlaps(ev.x, ev.y, ev.radius)) this.applyEnemyHit(e, ev.damage); }
  proto.applyChain = function(this: any, ev: FireEvent) {
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
  proto.drawBolt = function(this: any, x1: number, y1: number, x2: number, y2: number) {
    const g = this.add.graphics(); g.setDepth(18); g.lineStyle(2.4, COLOR.chain, 0.95); g.lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() });
  }
  proto.grantXp = function(this: any, amount: number) {
    if (amount <= 0 || this.leveling || this.dead) return;
    this.xp += amount;
    while (this.xp >= this.xpNextLevel && !this.leveling) { this.xp -= this.xpNextLevel; this.playerLevel += 1; this.xpNextLevel = xpForLevel(this.playerLevel); this.beginLevelUp(); }
    patchHud({ xp: this.xp, xpNextLevel: this.xpNextLevel, playerLevel: this.playerLevel });
  }
  proto.beginLevelUp = function(this: any) {
    this.leveling = true; this.player.fullHeal(); this.playerHp = this.player.headMaxHp;
    try { this.physics?.world?.pause(); } catch { /* optional */ }
    const offers = rollLevelOffers(Date.now(), { mineTier: this.player.mineTier() }); setLevelOffers(offers);
    patchHud({ leveling: true, levelOffers: offers, hp: this.playerHp, maxHp: this.player.headMaxHp, playerLevel: this.playerLevel, xp: this.xp, xpNextLevel: this.xpNextLevel });
  }
  proto.resolveLevelUp = function(this: any, stat: GlobalStatId | null, weaponType: WeaponType | null = null, slot: WeaponSlot | null = null) {
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

  proto.floatPickup = function(this: any, x: number, y: number, label: string, fever: boolean) {
    const t = this.add.text(x, y, label, { fontFamily: "IBM Plex Mono, monospace", fontSize: fever ? "16px" : "14px", color: fever ? "#f4d35e" : "#5eead4" });
    t.setOrigin(0.5); t.setDepth(31);
    this.tweens.add({ targets: t, y: y - 32, alpha: 0, duration: PICKUP_FLOAT_MS, onComplete: () => t.destroy() });
  }
  proto.playBlip = function(this: any, fever: boolean) {
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
  proto.floatDmg = function(this: any, x: number, y: number, dmg: number) {
    const t = this.add.text(x, y, `-${dmg}`, { fontFamily: "IBM Plex Mono, monospace", fontSize: "13px", color: "#ece8e4" });
    t.setOrigin(0.5); t.setDepth(30);
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 420, onComplete: () => t.destroy() });
  }
  proto.buildArena = function(this: any) {
    const border = this.add.graphics(); border.lineStyle(10, COLOR.bound, 0.9); border.strokeRect(6, 6, WORLD_SIZE - 12, WORLD_SIZE - 12);
    border.lineStyle(2, 0xb85c57, 0.35); border.strokeRect(18, 18, WORLD_SIZE - 36, WORLD_SIZE - 36); border.setDepth(1);
    for (let i = 0; i < 28; i++) this.add.circle(Phaser.Math.Between(120, WORLD_SIZE - 120), Phaser.Math.Between(120, WORLD_SIZE - 120), Phaser.Math.Between(2, 5), 0xffffff, 0.04).setDepth(2);
  }
  proto.isMobileView = function(this: any) { const w = this.scale.gameSize.width, h = this.scale.gameSize.height; return w < MOBILE_WIDTH || (h > w && w < 1100); }
  proto.fitZoom = function(this: any) { this.cameras.main.setZoom(this.isMobileView() ? MOBILE_ZOOM : DESKTOP_ZOOM); }
  proto.onResize = function(this: any, _gameSize: Phaser.Structs.Size) { this.fitZoom(); this.syncBackgroundTile?.(); }
  proto.cleanup = function(this: any) {
    this.scale.off("resize", this.onResize, this); this.unbindKeys?.(); this.unbindKeys = null;
    this.shots?.destroy(); this.gems?.destroy(); this.clearHostiles(); this.clearMines(); this.clearMortars();
    for (const e of this.enemies) e.destroy(); this.enemies = []; this.player?.destroy();
    window.__gameReady = false; window.__controlsTest = undefined;
  }
}
