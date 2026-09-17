import * as Phaser from "phaser";
import { COLOR, ENEMY_HP, ENEMY_RADIUS, ENEMY_SPEED } from "./constants";

export class Enemy {
  readonly root: Phaser.GameObjects.Container;
  hp = ENEMY_HP;
  readonly radius = ENEMY_RADIUS;
  private readonly body: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.root = scene.add.container(x, y);
    this.root.setDepth(11);
    const halo = scene.add.circle(0, 0, ENEMY_RADIUS + 6, COLOR.enemy, 0.2);
    this.body = scene.add.circle(0, 0, ENEMY_RADIUS, COLOR.enemy);
    this.body.setStrokeStyle(2, COLOR.enemyCore, 0.75);
    const core = scene.add.circle(0, 0, 4, COLOR.enemyCore);
    this.root.add([halo, this.body, core]);
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

  chase(tx: number, ty: number, dt: number) {
    if (!this.alive) return;
    const ang = Math.atan2(ty - this.y, tx - this.x);
    this.root.x += Math.cos(ang) * ENEMY_SPEED * dt;
    this.root.y += Math.sin(ang) * ENEMY_SPEED * dt;
    this.root.setRotation(ang);
  }

  hit(dmg: number) {
    if (!this.alive) return false;
    this.hp -= dmg;
    this.body.setFillStyle(COLOR.enemyHurt);
    if (this.hp <= 0) {
      this.root.destroy(true);
      return true;
    }
    return true;
  }

  overlaps(x: number, y: number, r: number) {
    if (!this.alive) return false;
    const dx = x - this.x;
    const dy = y - this.y;
    const need = r + this.radius;
    return dx * dx + dy * dy <= need * need;
  }

  destroy() {
    if (this.root.active) this.root.destroy(true);
  }
}
