# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

Phases **1–3 are done**. Edit `/workspace/src/game` in an App Builder session, or `src/game` in this repo.

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**.
- `SnakePlayer` owns player, trail, weapons. `MainScene` owns enemies, bullets, state.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.

## Phase 2 weapons
| Segment | Type | Behavior |
|---|---|---|
| 0 | blaster | fires along segment facing, 280ms, 6 dmg |
| 1 | turret | aims nearest enemy, 420ms, 8 dmg |
| 2 | blade | two orbiting rects, 160ms CD, 5 dmg |

## Phase 3
- `Enemy.ts`: purple circles, chase head, contact vs head **or any segment**.
- Spawn outside camera view. Cap 28, ~850ms.
- Player i-frames 450ms. HUD: HP / Kills / Swarm.

## Next
Phase 4: 30s wave timer, ramp spawn rate, despawn + pause at 00:00.
