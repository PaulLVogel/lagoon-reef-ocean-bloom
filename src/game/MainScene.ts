import * as Phaser from "phaser";
import { COLOR, HUD_TICK_MS, TILE, WORLD_SIZE } from "./constants";
import { Dummy } from "./Dummy";
import { installControlsTest } from "./controlsTest";
import { isGameStarted, installKeyboard, sampleMove } from "./input";
import { Projectiles } from "./Projectiles";
import { patchHud } from "./runtime";
import { SnakePlayer } from "./SnakePlayer";

export class MainScene extends Phaser.Scene {
  private player!: SnakePlayer;
  private dummy!: Dummy;
  private shots!: Projectiles;
  private hudAcc = 0;
  private unbindKeys: (() => void) | null = null;
  private floor!: Phaser.GameObjects.TileSprite;

  constructor() {
    super("main");
  }

  init() {
    this.hudAcc = 0;
  }

  create() {
    this.buildArena();

    const cx = WORLD_SIZE / 2;
    const cy = WORLD_SIZE / 2;
    this.shots = new Projectiles(this);
    this.player = new SnakePlayer(this, cx, cy, (ev) => this.shots.spawn(ev));
    this.dummy = new Dummy(this, cx + 260, cy - 30);

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
      hp: 100,
      dummyHp: this.dummy.hp,
      dummyMax: this.dummy.maxHp,
      hits: 0,
    });
  }

  update(time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    const move = sampleMove();
    const combatOn = isGameStarted();
    const aim = this.dummy.alive ? { x: this.dummy.x, y: this.dummy.y } : null;

    this.player.update(dt, move.x, move.y, time, aim, combatOn);
    this.dummy.update(time);

    if (combatOn) {
      this.shots.update(dt, (x, y, dmg, r) => {
        if (!this.dummy.overlaps(x, y, r)) return false;
        this.dummy.hit(dmg, time);
        this.floatDmg(x, y, dmg);
        return true;
      });
      const bladeDmg = this.player.bladeHits(this.dummy.x, this.dummy.y, this.dummy.radius, time);
      if (bladeDmg > 0 && this.dummy.hit(bladeDmg, time)) {
        this.floatDmg(this.dummy.x, this.dummy.y, bladeDmg);
      }
    }

    this.hudAcc += delta;
    if (this.hudAcc >= HUD_TICK_MS) {
      this.hudAcc = 0;
      if (combatOn) {
        patchHud({
          speed: Math.round(Math.hypot(this.player.vx, this.player.vy)),
          segments: this.player.segments.length,
          dummyHp: this.dummy.hp,
          dummyMax: this.dummy.maxHp,
          hits: this.dummy.hits,
        });
      }
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
    this.dummy?.destroy();
    this.player?.destroy();
    window.__gameReady = false;
    window.__controlsTest = undefined;
  }
}
