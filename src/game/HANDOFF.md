# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

## Future-chat contract

1. Read this file + `PROJECT_CONTEXT.md`.
2. Implement **only** the phase or bug the user named.
3. Do not rebuild Phases 1–3 or the app shell.
4. Push the changed files to `PaulLVogel/lagoon-reef-ocean-bloom` `main`.
5. Never commit `.vercel/output`.

Phases **1–3 are done** (swarm live on o34e; death screen + Restart on `main`).

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**.
- `SnakePlayer` owns player, trail, weapons. `MainScene` owns enemies, bullets, state.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.

## Next
Phase 4: 30s wave timer, ramp spawn rate, despawn + pause at 00:00.
