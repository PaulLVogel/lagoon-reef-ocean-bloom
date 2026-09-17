import * as Phaser from "phaser";
import { COLOR } from "./constants";
import { MainScene } from "./MainScene";

export function createGame(parent: HTMLElement) {
  const width = Math.max(parent.clientWidth, 320);
  const height = Math.max(parent.clientHeight, 240);

  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor: COLOR.arena,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: "high-performance",
    },
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene: [MainScene],
    disableContextMenu: true,
    audio: { noAudio: true },
  });
}
