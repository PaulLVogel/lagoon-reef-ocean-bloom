# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

## Future-chat contract

1. Read this file + `PROJECT_CONTEXT.md`.
2. Implement **only** the phase or bug the user named.
3. Do not rebuild Phases 1–4 or the app shell.
4. Push the changed files to `PaulLVogel/lagoon-reef-ocean-bloom` `main`.
5. Never commit `.vercel/output`.

Phases **1–4 are done** (30s wave timer + spawn ramp + wave-clear pause on `main`).

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**.
- `SnakePlayer` owns player, trail, weapons. `MainScene` owns enemies, bullets, state.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.

## Phase 4
- `WAVE_DURATION_MS = 30000`. HUD clock `mm:ss` at top.
- Spawn interval lerps 850ms → 280ms as the clock dies.
- At 00:00: despawn swarm, `shots.clear()`, `waveClear` pause overlay.

## Next
Phase 5: shop overlay on wave complete, 3 upgrades, Next Wave button.
