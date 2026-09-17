import type { SnakePlayer } from "./SnakePlayer";
import { setInjectedKeys } from "./input";

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setSteer?: (v: number) => void;
  setKeys?: (codes: string[]) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __gameReady?: boolean;
  }
}

/**
 * 0 = screen-up, positive = left (CCW). Matches controls skill A = +yaw.
 * Phaser velocity is y-down, so convert with atan2(-vx, -vy).
 */
export function installControlsTest(player: SnakePlayer) {
  window.__controlsTest = {
    getYaw: () => Math.atan2(-player.vx, -player.vy),
    getSpeed: () => Math.hypot(player.vx, player.vy),
    setKeys: (codes: string[]) => setInjectedKeys(codes),
  };
  window.__gameReady = true;
}
