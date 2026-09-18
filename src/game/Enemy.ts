import * as Phaser from "phaser";
import { COLOR } from "./constants";

export type EnemyKind = "swarmer" | "grunt" | "brute" | "boss";

export type EnemySpec = {
  kind: EnemyKind;
  radius: number;
  hp: number;
  speed: number;
  contact: number;
  color: number;
};

export const ENEMY_BASE: Record<Exclude<EnemyKind, "boss">, Omit<EnemySpec, "hp">> = {
  swarmer: { kind: "swarmer", radius: 8, speed: 165, contact: 4, color: COLOR.swarmer },
  grunt: { kind: "grunt", radius: 12, speed: 95, contact: 8, color: COLOR.grunt },
  brute: { kind: "brute", radius: 22, speed: 52, contact: 16, color: COLOR.brute },
};

export type BossShot = { x: number; y: number; vx: number; vy: number; damage: number };

export class Enemy {
  readonly root: Phaser.GameObjects.Container;
  readonly kind: EnemyKind;
  hp: number;
  readonly maxHp: number;
  radius: number;
  speed: number;
  contact: number;
  private readonly body: Phaser.GameObjects.Arc;
  private chargeUntil = 0;
  private nextVolley = 0;
  private nextCharge = 0;
  private charging = false;

  constructor(scene: Phaser.Scene, x: number, y: number, spec: EnemySpec) {
    this.kind = spec.kind;
    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.radius = spec.radius;
    this.speed = spec.speed;
    this.contact = spec.contact;
    this.root = scene.add.container(x, y);
    this.root.setDepth(spec.kind === "boss" ? 13 : 11);
    const halo = scene.add.circle(0, 0, spec.radius + 6, spec.color, 0.2);
    this.body = scene.add.circle(0, 0, spec.radius, spec.color);
    this.body.setStrokeStyle(2, COLOR.enemyCore, spec.kind === "boss" ? 1 : 0.75);
    const coreR = spec.kind === "boss" ? 12 : spec.kind === "brute" ? 6 : 4;
    const core = scene.add.circle(0, 0, coreR, spec.kind === "boss" ? 0xffe4e6 : COLOR.enemyCore);
    this.root.add([halo, this.body, core]);
    if (spec.kind === "boss") {
      const crown = scene.add.triangle(0, -spec.radius - 8, 0, -14, 12, 6, -12, 6, 0xfbbf24);
      this.root.add(crown);
    }
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

  chase(tx: number, ty: number, dt: number, now = 0) {
    if (!this.alive) return;
    const ang = Math.atan2(ty - this.y, tx - this.x);
    const spd = this.charging && now < this.chargeUntil ? this.speed * 2.4 : this.speed;
    this.root.x += Math.cos(ang) * spd * dt;
    this.root.y += Math.sin(ang) * spd * dt;
    this.root.setRotation(ang);
  }

  tickBoss(now: number, tx: number, ty: number): BossShot[] {
    const shots: BossShot[] = [];
    if (now >= this.nextCharge) {
      this.charging = true;
      this.chargeUntil = now + 520;
      this.nextCharge = now + 2800;
    }
    if (now >= this.chargeUntil) this.charging = false;
    if (now >= this.nextVolley) {
      this.nextVolley = now + 1600;
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + now * 0.0004;
        shots.push({
          x: this.x + Math.cos(a) * (this.radius + 8),
          y: this.y + Math.sin(a) * (this.radius + 8),
          vx: Math.cos(a) * 210,
          vy: Math.sin(a) * 210,
          damage: 10,
        });
      }
      const aim = Math.atan2(ty - this.y, tx - this.x);
      shots.push({
        x: this.x + Math.cos(aim) * (this.radius + 10),
        y: this.y + Math.sin(aim) * (this.radius + 10),
        vx: Math.cos(aim) * 280,
        vy: Math.sin(aim) * 280,
        damage: 14,
      });
    }
    return shots;
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
