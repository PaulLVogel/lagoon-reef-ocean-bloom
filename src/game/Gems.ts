import * as Phaser from "phaser";
import {
  GEM_BLUE_VALUE,
  GEM_GOLD_VALUE,
  GEM_GREEN_VALUE,
  GEM_POOL,
  GEM_RADIUS,
  HEAD_RADIUS,
} from "./constants";

type GemTier = {
  value: number;
  color: number;
  scale: number;
};

const TIERS: GemTier[] = [
  { value: GEM_GREEN_VALUE, color: 0x5eead4, scale: 1 },
  { value: GEM_BLUE_VALUE, color: 0x60a5fa, scale: 1.15 },
  { value: GEM_GOLD_VALUE, color: 0xf4d35e, scale: 1.35 },
];

type Slot = {
  gfx: Phaser.GameObjects.Arc;
  value: number;
  live: boolean;
  bob: number;
};

function rollTier(): GemTier {
  const n = Math.random();
  if (n < 0.08) return TIERS[2]!;
  if (n < 0.3) return TIERS[1]!;
  return TIERS[0]!;
}

export class Gems {
  private readonly slots: Slot[] = [];
  private cursor = 0;

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < GEM_POOL; i++) {
      const gfx = scene.add.circle(0, 0, GEM_RADIUS, TIERS[0]!.color);
      gfx.setVisible(false);
      gfx.setActive(false);
      gfx.setDepth(12);
      gfx.setStrokeStyle(1, 0xffffff, 0.35);
      this.slots.push({ gfx, value: 0, live: false, bob: 0 });
    }
  }

  spawn(x: number, y: number) {
    const tier = rollTier();
    const slot = this.slots[this.cursor]!;
    this.cursor = (this.cursor + 1) % this.slots.length;
    slot.live = true;
    slot.value = tier.value;
    slot.bob = Math.random() * Math.PI * 2;
    slot.gfx.setFillStyle(tier.color, 1);
    slot.gfx.setScale(tier.scale);
    slot.gfx.setPosition(x, y);
    slot.gfx.setVisible(true);
    slot.gfx.setActive(true);
    slot.gfx.setAlpha(1);
  }

  /** Head-only collect. Segments never pick up. */
  collectHead(hx: number, hy: number, dt: number): number {
    const reach = HEAD_RADIUS + GEM_RADIUS + 6;
    const reach2 = reach * reach;
    let gained = 0;
    for (const s of this.slots) {
      if (!s.live) continue;
      s.bob += dt * 4;
      s.gfx.y += Math.sin(s.bob) * 8 * dt;
      const dx = hx - s.gfx.x;
      const dy = hy - s.gfx.y;
      if (dx * dx + dy * dy > reach2) continue;
      gained += s.value;
      this.kill(s);
    }
    return gained;
  }

  vacuum(): number {
    let gained = 0;
    for (const s of this.slots) {
      if (!s.live) continue;
      gained += s.value;
      this.kill(s);
    }
    return gained;
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
