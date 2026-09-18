import * as Phaser from "phaser";
import { COLOR } from "./constants";

export type EnemyKind =
  | "swarmer"
  | "grunt"
  | "brute"
  | "flanker"
  | "armored_brute"
  | "charger"
  | "siege"
  | "boss";

export type HordeKind = Exclude<EnemyKind, "boss">;

export type EnemySpec = {
  kind: EnemyKind;
  radius: number;
  hp: number;
  speed: number;
  contact: number;
  color: number;
};

export const ENEMY_BASE: Record<HordeKind, Omit<EnemySpec, "hp">> = {
  swarmer: { kind: "swarmer", radius: 8, speed: 165, contact: 4, color: COLOR.swarmer },
  grunt: { kind: "grunt", radius: 12, speed: 95, contact: 8, color: COLOR.grunt },
  brute: { kind: "brute", radius: 22, speed: 52, contact: 16, color: COLOR.brute },
  flanker: { kind: "flanker", radius: 11, speed: 155, contact: 6, color: COLOR.flanker },
  armored_brute: { kind: "armored_brute", radius: 28, speed: 30, contact: 20, color: COLOR.armoredBrute },
  charger: { kind: "charger", radius: 16, speed: 88, contact: 24, color: COLOR.charger },
  siege: { kind: "siege", radius: 34, speed: 26, contact: 14, color: COLOR.siege },
};

export const ENEMY_HP_BASE: Record<HordeKind, number> = {
  swarmer: 10,
  grunt: 24,
  brute: 70,
  flanker: 16,
  armored_brute: 190,
  charger: 42,
  siege: 230,
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
  private readonly body: Phaser.GameObjects.Shape;
  private chargeUntil = 0;
  private nextVolley = 0;
  private nextCharge = 0;
  private charging = false;
  private orbitSign = Math.random() < 0.5 ? -1 : 1;
  private nextDash = 0;
  private dashUntil = 0;
  private dashAng = 0;
  private nextSiege = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, spec: EnemySpec) {
    this.kind = spec.kind;
    this.hp = spec.hp;
    this.maxHp = spec.hp;
    this.radius = spec.radius;
    this.speed = spec.speed;
    this.contact = spec.contact;
    this.root = scene.add.container(x, y);
    this.root.setDepth(spec.kind === "boss" ? 13 : spec.kind === "siege" ? 12 : 11);
    const halo = scene.add.circle(0, 0, spec.radius + 6, spec.color, 0.2);
    this.body = this.makeBody(scene, spec);
    const coreR = spec.kind === "boss" ? 12 : spec.kind === "siege" || spec.kind === "armored_brute" ? 8 : spec.kind === "brute" ? 6 : 4;
    const core = scene.add.circle(0, 0, coreR, spec.kind === "boss" ? 0xffe4e6 : COLOR.enemyCore);
    this.root.add([halo, this.body, core]);
    if (spec.kind === "boss") {
      const crown = scene.add.triangle(0, -spec.radius - 8, 0, -14, 12, 6, -12, 6, 0xfbbf24);
      this.root.add(crown);
    }
    if (spec.kind === "siege") {
      const barrel = scene.add.rectangle(0, -spec.radius * 0.35, 8, spec.radius * 0.7, 0xc4b5fd);
      this.root.add(barrel);
    }
  }

  private makeBody(scene: Phaser.Scene, spec: EnemySpec): Phaser.GameObjects.Shape {
    const r = spec.radius;
    let shape: Phaser.GameObjects.Shape;
    if (spec.kind === "flanker") {
      shape = scene.add.star(0, 0, 4, r * 0.55, r, spec.color);
    } else if (spec.kind === "armored_brute") {
      shape = scene.add.rectangle(0, 0, r * 1.7, r * 1.7, spec.color);
    } else if (spec.kind === "charger") {
      shape = scene.add.triangle(0, 0, 0, -r, r * 0.95, r * 0.75, -r * 0.95, r * 0.75, spec.color);
    } else if (spec.kind === "siege") {
      shape = scene.add.star(0, 0, 6, r * 0.62, r, spec.color);
    } else {
      shape = scene.add.circle(0, 0, r, spec.color);
    }
    shape.setStrokeStyle(2, COLOR.enemyCore, spec.kind === "boss" ? 1 : 0.75);
    return shape;
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
    let aimX = tx;
    let aimY = ty;
    if (this.kind === "flanker") {
      const dx = this.x - tx;
      const dy = this.y - ty;
      const dist = Math.hypot(dx, dy) || 1;
      const side = this.orbitSign;
      aimX = tx + (-dy / dist) * 90 * side + (dx / dist) * 18;
      aimY = ty + (dx / dist) * 90 * side + (dy / dist) * 18;
    }
    const ang = Math.atan2(aimY - this.y, aimX - this.x);
    let spd = this.speed;
    if (this.kind === "boss" && this.charging && now < this.chargeUntil) spd = this.speed * 2.4;
    if (this.kind === "charger") {
      if (now >= this.nextDash) {
        this.dashUntil = now + 280;
        this.nextDash = now + 900 + Math.random() * 500;
        this.dashAng = ang + (Math.random() - 0.5) * 1.15;
      }
      if (now < this.dashUntil) {
        spd = this.speed * 2.8;
        this.root.x += Math.cos(this.dashAng) * spd * dt;
        this.root.y += Math.sin(this.dashAng) * spd * dt;
        this.root.setRotation(this.dashAng);
        return;
      }
      spd = this.speed * 0.55;
    }
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
      const shotMul = Math.max(1, this.contact / 22);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + now * 0.0004;
        shots.push({
          x: this.x + Math.cos(a) * (this.radius + 8),
          y: this.y + Math.sin(a) * (this.radius + 8),
          vx: Math.cos(a) * 210,
          vy: Math.sin(a) * 210,
          damage: Math.max(10, Math.round(10 * shotMul)),
        });
      }
      const aim = Math.atan2(ty - this.y, tx - this.x);
      shots.push({
        x: this.x + Math.cos(aim) * (this.radius + 10),
        y: this.y + Math.sin(aim) * (this.radius + 10),
        vx: Math.cos(aim) * 280,
        vy: Math.sin(aim) * 280,
        damage: Math.max(14, Math.round(14 * shotMul)),
      });
    }
    return shots;
  }

  /** Slow bolts aimed at the snake tail (falls back to head coords). */
  tickSiege(now: number, tx: number, ty: number): BossShot[] {
    if (this.kind !== "siege" || !this.alive) return [];
    if (this.nextSiege === 0) this.nextSiege = now + 900;
    if (now < this.nextSiege) return [];
    this.nextSiege = now + 2200;
    const aim = Math.atan2(ty - this.y, tx - this.x);
    const shotMul = Math.max(1, this.contact / 14);
    return [{
      x: this.x + Math.cos(aim) * (this.radius + 10),
      y: this.y + Math.sin(aim) * (this.radius + 10),
      vx: Math.cos(aim) * 190,
      vy: Math.sin(aim) * 190,
      damage: Math.max(8, Math.round(8 * shotMul)),
    }];
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
