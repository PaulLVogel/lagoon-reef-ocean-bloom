import * as Phaser from "phaser";
import { COLOR, DUMMY_HP, DUMMY_RADIUS } from "./constants";

export class Dummy {
  readonly root: Phaser.GameObjects.Container;
  hp = DUMMY_HP;
  maxHp = DUMMY_HP;
  hits = 0;
  readonly radius = DUMMY_RADIUS;

  private readonly body: Phaser.GameObjects.Arc;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private deadUntil = 0;
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.root = scene.add.container(x, y);
    this.root.setDepth(12);

    const ring = scene.add.circle(0, 0, DUMMY_RADIUS + 8, COLOR.dummy, 0.18);
    this.body = scene.add.circle(0, 0, DUMMY_RADIUS, COLOR.dummy);
    this.body.setStrokeStyle(2, 0xffffff, 0.22);
    const core = scene.add.rectangle(0, -4, 14, 22, 0x9aa3ad);
    const base = scene.add.rectangle(0, 16, 26, 8, 0x4d5560);
    this.bar = scene.add.rectangle(0, -DUMMY_RADIUS - 14, 40, 5, COLOR.hp);
    const label = scene.add.text(0, DUMMY_RADIUS + 14, "DUMMY", {
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: "11px",
      color: "#ece8e4",
    });
    label.setOrigin(0.5, 0);

    this.root.add([ring, this.body, core, base, this.bar, label]);
  }

  get x() {
    return this.root.x;
  }

  get y() {
    return this.root.y;
  }

  get alive() {
    return this.hp > 0;
  }

  hit(dmg: number, now: number) {
    if (this.hp <= 0) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.hits += 1;
    this.flashUntil = now + 80;
    this.body.setFillStyle(COLOR.dummyHurt);
    this.syncBar();
    if (this.hp <= 0) {
      this.deadUntil = now + 1400;
      this.root.setAlpha(0.28);
    }
    return true;
  }

  update(now: number) {
    if (this.hp <= 0 && now >= this.deadUntil) {
      this.hp = this.maxHp;
      this.root.setAlpha(1);
      this.syncBar();
    }
    if (now >= this.flashUntil && this.hp > 0) {
      this.body.setFillStyle(COLOR.dummy);
    }
  }

  overlaps(x: number, y: number, r: number) {
    if (this.hp <= 0) return false;
    const dx = x - this.x;
    const dy = y - this.y;
    const need = r + this.radius;
    return dx * dx + dy * dy <= need * need;
  }

  destroy() {
    this.root.destroy(true);
  }

  private syncBar() {
    const t = this.hp / this.maxHp;
    this.bar.width = 40 * t;
    this.bar.setFillStyle(t > 0.35 ? COLOR.hp : 0xc9846a);
  }
}
