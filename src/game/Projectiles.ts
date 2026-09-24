import * as Phaser from "phaser";
import { BULLET_POOL, COLOR, WORLD_SIZE } from "./constants";
import type { FireEvent } from "./Weapon";

type Slot = {
  gfx: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  damage: number;
  ttl: number;
  radius: number;
  live: boolean;
  pierce: boolean;
  hitMark: number;
  hitSpark: boolean;
};

export class Projectiles {
  private readonly slots: Slot[] = [];
  private cursor = 0;
  private sweep = 1;

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < BULLET_POOL; i++) {
      const gfx = scene.add.circle(0, 0, 4, COLOR.blaster);
      gfx.setVisible(false);
      gfx.setActive(false);
      gfx.setDepth(16);
      this.slots.push({
        gfx,
        vx: 0,
        vy: 0,
        damage: 0,
        ttl: 0,
        radius: 4,
        live: false,
        pierce: false,
        hitMark: 0,
        hitSpark: false,
      });
    }
  }

  spawn(ev: FireEvent) {
    const slot = this.slots[this.cursor]!;
    this.cursor = (this.cursor + 1) % this.slots.length;
    slot.live = true;
    slot.vx = ev.vx;
    slot.vy = ev.vy;
    slot.damage = ev.damage;
    slot.ttl = ev.pierce ? 0.85 : 1.35;
    slot.radius = ev.radius;
    slot.pierce = Boolean(ev.pierce);
    slot.hitSpark = ev.hitSpark ?? !slot.pierce;
    slot.hitMark = this.sweep++;
    slot.gfx.setFillStyle(ev.color, 1);
    slot.gfx.setScale(ev.radius / 4);
    slot.gfx.setPosition(ev.x, ev.y);
    slot.gfx.setVisible(true);
    slot.gfx.setActive(true);
  }

  update(
    dt: number,
    onHit: (x: number, y: number, dmg: number, r: number, mark: number, pierce: boolean, spark: boolean) => boolean,
  ) {
    for (const s of this.slots) {
      if (!s.live) continue;
      s.ttl -= dt;
      s.gfx.x += s.vx * dt;
      s.gfx.y += s.vy * dt;
      if (
        s.ttl <= 0 ||
        s.gfx.x < 0 ||
        s.gfx.y < 0 ||
        s.gfx.x > WORLD_SIZE ||
        s.gfx.y > WORLD_SIZE
      ) {
        this.kill(s);
        continue;
      }
      const consumed = onHit(s.gfx.x, s.gfx.y, s.damage, s.radius, s.hitMark, s.pierce, s.hitSpark);
      if (consumed && !s.pierce) this.kill(s);
    }
  }

  clear() {
    for (const s of this.slots) this.kill(s);
  }

  destroy() {
    for (const s of this.slots) s.gfx.destroy();
    this.slots.length = 0;
  }

  private kill(s: Slot) {
    s.live = false;
    s.gfx.setVisible(false);
    s.gfx.setActive(false);
  }
}
