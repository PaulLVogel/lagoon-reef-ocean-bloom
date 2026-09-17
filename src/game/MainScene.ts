import * as Phaser from "phaser";
import {
  COLOR,
  ENEMY_CONTACT_DAMAGE,
  ENEMY_RADIUS,
  HUD_TICK_MS,
  MAX_ENEMIES,
  PLAYER_IFRAME_MS,
  SPAWN_INTERVAL_MS,
  TILE,
  WORLD_SIZE,
} from "./constants";
import { Enemy } from "./Enemy";
import { installControlsTest } from "./controlsTest";
import { isGameStarted, installKeyboard, sampleMove } from "./input";
import { Projectiles } from "./Projectiles";
import { patchHud } from "./runtime";
import { SnakePlayer } from "./SnakePlayer";

export class MainScene extends Phaser.Scene {
  private player!: SnakePlayer;
  private shots!: Projectiles;
  private enemies: Enemy[] = [];
  private spawnAcc = 0;
  private playerHp = 100;
  private iFrameUntil = 0;
  private kills = 0;
  private dead = false;
  private hudAcc = 0;
  private unbindKeys: (() => void) | null = null;
  private floor!: Phaser.GameObjects.TileSprite;

  constructor() {
    super("main");
  }

  init() {
    this.hudAcc = 0;
    this.spawnAcc = 0;
    this.playerHp = 100;
    this.iFrameUntil = 0;
    this.kills = 0;
    this.dead = false;
    this.enemies = [];
  }

  create() {
    this.buildArena();
    const cx = WORLD_SIZE / 2;
    const cy = WORLD_SIZE / 2;
    this.shots = new Projectiles(this);
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
      swarm: 0,
    });
  }

  update(time: number, delta: number) {
    if (this.dead) return;
    const dt = Math.min(delta, 50) / 1000;
    const move = sampleMove();
    const combatOn = isGameStarted();
    const aim = this.nearestEnemy();
    this.player.update(dt, move.x, move.y, time, aim, combatOn);
    if (combatOn) {
      this.spawnAcc += delta;
      if (this.spawnAcc >= SPAWN_INTERVAL_MS && this.livingCount() < MAX_ENEMIES) {
        this.spawnAcc = 0;
        this.spawnEnemyOutsideView();
      }
      for (const e of this.enemies) {
        if (e.alive) e.chase(this.player.x, this.player.y, dt);
      }
      this.shots.update(dt, (x, y, dmg, r) => this.hitEnemiesAt(x, y, dmg, r));
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const bladeDmg = this.player.bladeHits(e.x, e.y, e.radius, time);
        if (bladeDmg > 0) this.applyEnemyHit(e, bladeDmg);
      }
      this.checkPlayerContact(time);
      this.pruneDead();
    }
    this.hudAcc += delta;
    if (this.hudAcc >= HUD_TICK_MS) {
      this.hudAcc = 0;
      if (combatOn) {
        patchHud({
          speed: Math.round(Math.hypot(this.player.vx, this.player.vy)),
          segments: this.player.segments.length,
          hp: this.playerHp,
          kills: this.kills,
          swarm: this.livingCount(),
        });
      }
    }
  }

  private livingCount() {
    return this.enemies.filter((e) => e.alive).length;
  }

  private nearestEnemy() {
    let best: Enemy | null = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best ? { x: best.x, y: best.y } : null;
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
    this.enemies.push(new Enemy(this, x, y));
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
    const wasAlive = e.alive;
    e.hit(dmg);
    this.floatDmg(e.x, e.y, dmg);
    if (wasAlive && !e.alive) this.kills += 1;
  }

  private checkPlayerContact(now: number) {
    if (now < this.iFrameUntil) return;
    const parts = this.player.getParts();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      for (const p of parts) {
        if (!e.overlaps(p.x, p.y, p.r)) continue;
        this.hurtPlayer(ENEMY_CONTACT_DAMAGE, now);
        return;
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
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.shots.clear();
    patchHud({ hp: 0, swarm: 0 });
  }

  private pruneDead() {
    this.enemies = this.enemies.filter((e) => e.alive);
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
    for (const e of this.enemies) e.destroy();
    this.enemies = [];
    this.player?.destroy();
    window.__gameReady = false;
    window.__controlsTest = undefined;
  }
}
