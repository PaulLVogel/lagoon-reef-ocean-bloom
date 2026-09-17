import { patchHud, runtime } from "./runtime";

const GAME_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowLeft",
  "ArrowDown",
  "ArrowRight",
]);

export type MoveVec = { x: number; y: number };

function radialDeadzone(x: number, y: number, dz = 0.18): MoveVec {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export function setGameStarted(value: boolean) {
  const b = runtime();
  b.started = value;
  if (value) patchHud({ playing: true });
}

export function isGameStarted() {
  return runtime().started;
}

export function setInjectedKeys(codes: string[]) {
  const b = runtime();
  b.injected = new Set(codes);
  if (codes.length > 0) {
    b.started = true;
    patchHud({ playing: true });
  }
}

export function setStick(x: number, y: number) {
  const v = radialDeadzone(x, y);
  const b = runtime();
  b.stickX = v.x;
  b.stickY = v.y;
}

export function clearStick() {
  const b = runtime();
  b.stickX = 0;
  b.stickY = 0;
}

export function installKeyboard(target: Window | Document = window) {
  const onDown = (e: KeyboardEvent) => {
    if (GAME_CODES.has(e.code)) e.preventDefault();
    runtime().keys.add(e.code);
  };
  const onUp = (e: KeyboardEvent) => {
    runtime().keys.delete(e.code);
  };
  const clear = () => runtime().keys.clear();

  target.addEventListener("keydown", onDown as EventListener);
  target.addEventListener("keyup", onUp as EventListener);
  window.addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clear();
  });

  return () => {
    target.removeEventListener("keydown", onDown as EventListener);
    target.removeEventListener("keyup", onUp as EventListener);
    window.removeEventListener("blur", clear);
  };
}

function has(code: string) {
  const b = runtime();
  if (b.injected) return b.injected.has(code);
  return b.keys.has(code);
}

function readGamepad(): MoveVec {
  const pads = navigator.getGamepads?.() ?? [];
  for (const pad of pads) {
    if (!pad) continue;
    const raw = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    if (raw.x !== 0 || raw.y !== 0) return raw;
    let x = 0;
    let y = 0;
    if (pad.buttons[14]?.pressed) x -= 1;
    if (pad.buttons[15]?.pressed) x += 1;
    if (pad.buttons[12]?.pressed) y -= 1;
    if (pad.buttons[13]?.pressed) y += 1;
    if (x !== 0 || y !== 0) {
      const m = Math.hypot(x, y) || 1;
      return { x: x / m, y: y / m };
    }
  }
  return { x: 0, y: 0 };
}

/** Screen-space move: x right, y down. Magnitude 0..1. */
export function sampleMove(): MoveVec {
  const b = runtime();
  if (!b.started) return { x: 0, y: 0 };

  let x = 0;
  let y = 0;
  if (has("KeyA") || has("ArrowLeft")) x -= 1;
  if (has("KeyD") || has("ArrowRight")) x += 1;
  if (has("KeyW") || has("ArrowUp")) y -= 1;
  if (has("KeyS") || has("ArrowDown")) y += 1;

  if (x !== 0 || y !== 0) {
    const m = Math.hypot(x, y) || 1;
    return { x: x / m, y: y / m };
  }

  if (b.stickX !== 0 || b.stickY !== 0) return { x: b.stickX, y: b.stickY };

  return readGamepad();
}
