import * as Phaser from "phaser";
import {
  COLOR,
  GEM_BLUE_VALUE,
  GEM_DRAG,
  GEM_GREEN_VALUE,
  GEM_POOL,
  GEM_POP,
  GEM_RADIUS,
  GEM_RED_VALUE,
  HEALTH_DROP_CHANCE,
  HEALTH_HEAL,
  HEALTH_SIZE,
  MAGNET_DROP_CHANCE,
  MAGNET_SIZE,
  MAGNET_SPEED,
  PICKUP_RADIUS_BASE,
  SEGMENT_VACUUM_RADIUS,
  SEGMENT_VACUUM_SPEED,
} from "./constants";

type Kind = "gem" | "health" | "magnet";

type GemTier = {
  value: number;
  color: number;
  scale: number;
  minHp: number;
};

const TIERS: GemTier[] = [
  { value: GEM_GREEN_VALUE, color: COLOR.gemGreen, scale: 1, minHp: 0 },
  { value: GEM_BLUE_VALUE, color: COLOR.gemBlue, scale: 1.15, minHp: 30 },
  { value: GEM_RED_VALUE, color: COLOR.gemRed, scale: 1.35, minHp: 40 },
];

type Slot = {
  root: Phaser.GameObjects.Container;
  gem: Phaser.GameObjects.Arc;
  health: Phaser.GameObjects.Rectangle;
  magnet: Phaser.GameObjects.Rectangle;
  kind: Kind;
  value: number;
  live: boolean;
  vx: number;
  vy: number;
  magnetized: boolean;
};

function tierFromHp(hp: number): GemTier {
  if (hp >= TIERS[2]!.minHp) return TIERS[2]!;
  if (hp >= TIERS[1]!.minHp) return TIERS[1]!;
  return TIERS[0]!;
}

export type PickupEvent = {
  x: number;
  y: number;
  kind: Kind;
  gold: number;
};

export type PickupResult = {
  gold: number;
  heal: number;
  magnet: boolean;
  events: PickupEvent[];
};

export type CollectOpts = {
  pickupRadius?: number;
  segments?: { x: number; y: number }[];
  segmentVacuum?: boolean;
};

export class Gems {
  private readonly slots: Slot[] = [];
  private cursor = 0;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    for (let i = 0; i < GEM_POOL; i++) {
      const root = scene.add.container(0, 0);
      root.setVisible(false);
      root.setActive(false);
      root.setDepth(12);

      const gem = scene.add.circle(0, 0, GEM_RADIUS, COLOR.gemGreen);
      gem.setStrokeStyle(1, 0xffffff, 0.35);
      const health = scene.add.rectangle(0, 0, HEALTH_SIZE, HEALTH_SIZE, COLOR.health);
      health.setStrokeStyle(1, 0xffffff, 0.45);
      health.setVisible(false);
      const magnet = scene.add.rectangle(0, 0, MAGNET_SIZE, MAGNET_SIZE, COLOR.magnet);
      magnet.setStrokeStyle(1, 0xffffff, 0.5);
      magnet.setRotation(Math.PI / 4);
      magnet.setVisible(false);

      root.add([gem, health, magnet]);
      this.slots.push({
        root,
        gem,
        health,
        magnet,
        kind: "gem",
        value: 0,
        live: false,
        vx: 0,
        vy: 0,
        magnetized: false,
      });
    }
  }

  /** Kill drop: 5% health, rare magnet, else gem tiered by enemy HP. */
  spawnFromKill(x: number, y: number, enemyHp: number) {
    const roll = Math.random();
    if (roll < HEALTH_DROP_CHANCE) {
      this.spawnHealth(x, y);
      return;
    }
    if (roll < HEALTH_DROP_CHANCE + MAGNET_DROP_CHANCE) {
      this.spawnMagnet(x, y);
      return;
    }
    this.spawnGem(x, y, enemyHp);
  }

  spawn(x: number, y: number, enemyHp = 0) {
    this.spawnFromKill(x, y, enemyHp);
  }

  /**
   * Head-only collect. Segments never pick up.
   * Pickup uses a radius larger than the physical head hitbox.
   * Optional segment vacuum pulls nearby gems toward the head.
   */
  collectHead(hx: number, hy: number, dt: number, opts: CollectOpts = {}): PickupResult {
    const result: PickupResult = { gold: 0, heal: 0, magnet: false, events: [] };
    const reach = opts.pickupRadius ?? PICKUP_RADIUS_BASE;
    const reach2 = reach * reach;
    const segs = opts.segmentVacuum ? opts.segments ?? [] : [];
    const vacR2 = SEGMENT_VACUUM_RADIUS * SEGMENT_VACUUM_RADIUS;

    for (const s of this.slots) {
      if (!s.live) continue;
      this.stepPhysics(s, hx, hy, dt, segs, vacR2);

      const dx = hx - s.root.x;
      const dy = hy - s.root.y;
      if (dx * dx + dy * dy > reach2) continue;

      if (s.kind === "health") {
        result.heal += HEALTH_HEAL;
        result.events.push({ x: s.root.x, y: s.root.y, kind: "health", gold: 0 });
        this.kill(s);
        continue;
      }
      if (s.kind === "magnet") {
        result.magnet = true;
        result.events.push({ x: s.root.x, y: s.root.y, kind: "magnet", gold: 0 });
        this.kill(s);
        this.activateMagnet();
        continue;
      }
      result.gold += s.value;
      result.events.push({ x: s.root.x, y: s.root.y, kind: "gem", gold: s.value });
      this.kill(s);
    }
    return result;
  }

  activateMagnet() {
    for (const s of this.slots) {
      if (s.live && s.kind === "gem") s.magnetized = true;
    }
  }

  vacuum(): number {
    let gained = 0;
    for (const s of this.slots) {
      if (!s.live) continue;
      if (s.kind === "gem") gained += s.value;
      this.kill(s);
    }
    return gained;
  }

  clear() {
    for (const s of this.slots) this.kill(s);
  }

  destroy() {
    for (const s of this.slots) s.root.destroy(true);
    this.slots.length = 0;
  }

  private spawnGem(x: number, y: number, enemyHp: number) {
    const tier = tierFromHp(enemyHp);
    const slot = this.takeSlot();
    slot.kind = "gem";
    slot.value = tier.value;
    slot.gem.setFillStyle(tier.color, 1);
    slot.gem.setScale(tier.scale);
    slot.gem.setVisible(true);
    slot.health.setVisible(false);
    slot.magnet.setVisible(false);
    this.popIn(slot, x, y);
  }

  private spawnHealth(x: number, y: number) {
    const slot = this.takeSlot();
    slot.kind = "health";
    slot.value = 0;
    slot.gem.setVisible(false);
    slot.health.setVisible(true);
    slot.magnet.setVisible(false);
    this.popIn(slot, x, y);
  }

  private spawnMagnet(x: number, y: number) {
    const slot = this.takeSlot();
    slot.kind = "magnet";
    slot.value = 0;
    slot.gem.setVisible(false);
    slot.health.setVisible(false);
    slot.magnet.setVisible(true);
    this.popIn(slot, x, y);
  }

  private takeSlot(): Slot {
    const slot = this.slots[this.cursor]!;
    this.cursor = (this.cursor + 1) % this.slots.length;
    return slot;
  }

  private popIn(slot: Slot, x: number, y: number) {
    slot.live = true;
    slot.magnetized = false;
    slot.vx = Phaser.Math.Between(-GEM_POP, GEM_POP);
    slot.vy = Phaser.Math.Between(-GEM_POP, GEM_POP);
    slot.root.setPosition(x, y);
    slot.root.setVisible(true);
    slot.root.setActive(true);
    slot.root.setAlpha(1);
  }

  private stepPhysics(
    s: Slot,
    hx: number,
    hy: number,
    dt: number,
    segs: { x: number; y: number }[],
    vacR2: number,
  ) {
    if (s.magnetized && s.kind === "gem") {
      const ang = Math.atan2(hy - s.root.y, hx - s.root.x);
      s.vx = Math.cos(ang) * MAGNET_SPEED;
      s.vy = Math.sin(ang) * MAGNET_SPEED;
      s.root.x += s.vx * dt;
      s.root.y += s.vy * dt;
      return;
    }
    if (s.kind === "gem" && segs.length > 0) {
      let near = false;
      for (const p of segs) {
        const dx = s.root.x - p.x;
        const dy = s.root.y - p.y;
        if (dx * dx + dy * dy <= vacR2) {
          near = true;
          break;
        }
      }
      if (near) {
        const ang = Math.atan2(hy - s.root.y, hx - s.root.x);
        s.vx = Math.cos(ang) * SEGMENT_VACUUM_SPEED;
        s.vy = Math.sin(ang) * SEGMENT_VACUUM_SPEED;
        s.root.x += s.vx * dt;
        s.root.y += s.vy * dt;
        return;
      }
    }
    s.root.x += s.vx * dt;
    s.root.y += s.vy * dt;
    const damp = Math.max(0, 1 - GEM_DRAG * dt);
    s.vx *= damp;
    s.vy *= damp;
    if (s.vx * s.vx + s.vy * s.vy < 4) {
      s.vx = 0;
      s.vy = 0;
    }
  }

  private kill(s: Slot) {
    s.live = false;
    s.magnetized = false;
    s.vx = 0;
    s.vy = 0;
    s.root.setVisible(false);
    s.root.setActive(false);
  }
}
