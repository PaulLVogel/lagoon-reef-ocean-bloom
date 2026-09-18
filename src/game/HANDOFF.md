# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

## Future-chat contract

1. Read this file + `PROJECT_CONTEXT.md` first.
2. Implement **only** the phase or bug the user named.
3. Do not rebuild Phases 1–5 or the app shell.
4. Push the changed files to `PaulLVogel/lagoon-reef-ocean-bloom` `main`.
5. Never commit `.vercel/output`.
6. If `src/game` is missing in the App Builder workspace: copy from GitHub `main`. Do not start over.

Phases **1–5 are done**. Next named work is **Phase 6 (economy & EXP)**.

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**.
- `SnakePlayer` owns player, trail, weapons. `MainScene` owns enemies, bullets, wave/death/shop apply.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.
- **Next Wave must not `scene.restart()`.** Death Restart still does.

## File map
| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, segments, weapons, trail, upgrade apply helpers |
| `src/game/MainScene.ts` | spawn, collisions, HP, wave timer, death, shop apply, next wave |
| `src/game/shop.ts` | catalog + `rollShopOffers` |
| `src/game/Enemy.ts` | purple chasers |
| `src/game/Projectiles.ts` | bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap, `requestRestart()`, `pickShopOffer()`, `requestNextWave()` |
| `src/game/constants.ts` | tunables including `WAVE_DURATION_MS` |
| `src/components/game-overlay.tsx` | start / HUD clock / death / shop |

## Phase 2 weapons
| Segment | Type | Behavior |
|---|---|---|
| 0 | blaster | fires along facing, 280ms, 6 dmg |
| 1 | turret | aims nearest enemy, 420ms, 8 dmg |
| 2 | blade | two orbiting rects, 160ms CD, 5 dmg |

## Phase 5
- At 00:00 `endWave()` still despawns enemies + `shots.clear()`, then rolls 3 unique offers into `hud.shopOffers`.
- Overlay replaces the pause card with shop cards. One pick applies immediately (`pendingUpgrade`).
- **Next Wave** → `requestNextWave()` → `startNextWave()`: `wave += 1`, `waveMs = 30000`, `waveClear = false`, resume spawn. HP/kills/loadout persist.
- Death still uses `requestRestart()` → `scene.restart()`.
- Catalog: new blaster segment, turret cadence, coil speed, blaster cadence, turret cores, mend scales.

## Next (Phase 6 only, when asked)
Enemies drop colored EXP gems. Head (not segments) collects. Convert to shop currency.
