import * as Phaser from "phaser";
import {
  COIN_ANIM,
  COIN_ANIM_FPS,
  COIN_FRAMES,
  COIN_SCALE_T1,
  COIN_SCALE_T2,
  COIN_SCALE_T3,
  COIN_SHEET,
  COLOR,
  GEM_BLUE_VALUE,
  GEM_DRAG,
  GEM_GREEN_VALUE,
  GEM_POOL,
  GEM_POP,
  GEM_RED_VALUE,
  HEALTH_DROP_CHANCE,
  HEALTH_HEAL,
  MAGNET_DROP_CHANCE,
  MAGNET_SIZE,
  MAGNET_SPEED,
  PICKUP_RADIUS_BASE,
  POTION_KEY,
  POTION_SCALE,
  SEGMENT_VACUUM_RADIUS,
  SEGMENT_VACUUM_SPEED,
} from "./constants";

type Kind = "gem" | "health" | "magnet";

type GemTier = {
  value: number;
  scale: number;
  minHp: number;
};

const TIERS: GemTier[] = [
  { value: GEM_GREEN_VALUE, scale: COIN_SCALE_T1, minHp: 0 },
  { value: GEM_BLUE_VALUE, scale: COIN_SCALE_T2, minHp: 30 },
  { value: GEM_RED_VALUE, scale: COIN_SCALE_T3, minHp: 40 },
];

type Slot = {
  root: Phaser.GameObjects.Container;
  gem: Phaser.GameObjects.Sprite;
  health: Phaser.GameObjects.Sprite;
  magnet: Phaser.GameObjects.Rectangle;
  kind: Kind;
  value: number;
  live: boolean;
  vx: number;
  vy: number;
  magnetized: boolean;
  bob: number;
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

    const coinTex = scene.textures.get(COIN_SHEET);
    if (coinTex && coinTex.key !== "__MISSING") {
      coinTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    const potionTex = scene.textures.get(POTION_KEY);
    if (potionTex && potionTex.key !== "__MISSING") {
      potionTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    if (!scene.anims.exists(COIN_ANIM)) {
      scene.anims.create({
        key: COIN_ANIM,
        frames: scene.anims.generateFrameNumbers(COIN_SHEET, { start: 0, end: COIN_FRAMES - 1 }),
        frameRate: COIN_ANIM_FPS,
        repeat: -1,
      });
    }

    for (let i = 0; i < GEM_POOL; i++) {
      const root = scene.add.container(0, 0);
      root.setVisible(false);
      root.setActive(false);
      root.setDepth(12);

      const gem = scene.add.sprite(0, 0, COIN_SHEET, 0);
      gem.setOrigin(0.5, 0.5);
      gem.setVisible(false);
      const health = scene.add.sprite(0, 0, POTION_KEY);
      health.setOrigin(0.5, 0.5);
      health.setScale(POTION_SCALE);
      health.setVisible(false);
      const magnet = scene.add.rectangle(0, 0, MAGNET_SIZE, MAGNET_SIZE, COLOR.magnet);
      magnet.setStrokeStyle(2, 0xffffff, 0.9);
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
        bob: Math.random() * Math.PI * 2,
      });
    }
  }

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

  collectHead(hx: number, hy: number, dt: number, opts: CollectOpts = {}): PickupResult {
    const result: PickupResult = { gold: 0, heal: 0, magnet: false, events: [] };
    const reach = opts.pickupRadius ?? PICKUP_RADIUS_BASE;
    const reach2 = reach * reach;
    const segs = opts.segmentVacuum ? opts.segments ?? [] : [];
    const vacR2 = SEGMENT_VACUUM_RADIUS * SEGMENT_VACUUM_RADIUS;

    for (const s of this.slots) {
      if (!s.live) continue;
      this.stepPhysics(s, hx, hy, dt, segs, vacR2);
      if (s.kind === "health") {
        s.bob += dt * 3.2;
        s.health.y = Math.sin(s.bob) * 2.4;
      }

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
    slot.gem.setScale(tier.scale);
    slot.gem.setVisible(true);
    slot.health.setVisible(false);
    slot.magnet.setVisible(false);
    slot.health.y = 0;
    const start = Phaser.Math.Between(0, COIN_FRAMES - 1);
    slot.gem.anims.play({ key: COIN_ANIM, startFrame: start }, true);
    slot.gem.anims.timeScale = 0.85 + Math.random() * 0.45;
    this.popIn(slot, x, y);
  }

  private spawnHealth(x: number, y: number) {
    const slot = this.takeSlot();
    slot.kind = "health";
    slot.value = 0;
    slot.gem.setVisible(false);
    slot.gem.anims.stop();
    slot.health.setVisible(true);
    slot.health.setScale(POTION_SCALE);
    slot.health.y = 0;
    slot.magnet.setVisible(false);
    this.popIn(slot, x, y);
  }

  private spawnMagnet(x: number, y: number) {
    const slot = this.takeSlot();
    slot.kind = "magnet";
    slot.value = 0;
    slot.gem.setVisible(false);
    slot.gem.anims.stop();
    slot.health.setVisible(false);
    slot.health.y = 0;
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
    s.gem.anims.stop();
    s.health.y = 0;
    s.root.setVisible(false);
    s.root.setActive(false);
  }
}
