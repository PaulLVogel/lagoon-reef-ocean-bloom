# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

## Future-chat contract

1. Read this file + `PROJECT_CONTEXT.md` first.
2. Implement **only** the phase or bug the user named.
3. Do not rebuild Phases 1–6 or the app shell.
4. Push the changed files to `PaulLVogel/lagoon-reef-ocean-bloom` `main`.
5. Never commit `.vercel/output`.
6. If `src/game` is missing in the App Builder workspace: copy from GitHub `main`. Do not start over.

Phases **1–6 are done**.

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**.
- `SnakePlayer` owns player, trail, weapons. `MainScene` owns enemies, bullets, gems, wave/death/shop apply.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.
- **Next Wave must not `scene.restart()`.** Death Restart still does.
- **Gems: head only.** Segments never collect. Vacuum remaining gems at wave end.

## File map
| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, segments, weapons, trail, upgrade apply helpers |
| `src/game/MainScene.ts` | spawn, collisions, HP, wave timer, death, shop apply, next wave, gem collect |
| `src/game/Gems.ts` | colored EXP gem pool, head pickup, vacuum |
| `src/game/shop.ts` | catalog + costs + `rollShopOffers` |
| `src/game/Enemy.ts` | purple chasers |
| `src/game/Projectiles.ts` | bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap (incl. gold), `pickShopOffer()`, `requestNextWave()` |
| `src/game/constants.ts` | tunables including gem values |
| `src/components/game-overlay.tsx` | start / HUD clock / gold / death / shop |

## Phase 2 weapons
| Segment | Type | Behavior |
|---|---|---|
| 0 | blaster | fires along facing, 280ms, 6 dmg |
| 1 | turret | aims nearest enemy, 420ms, 8 dmg |
| 2 | blade | two orbiting rects, 160ms CD, 5 dmg |

## Phase 6
- Kill → gem drop (green 1 / blue 3 / gold 8).
- `collectHead` uses head x/y + `HEAD_RADIUS`. Segments ignored.
- `endWave()` vacuums leftover gems into gold, then rolls 3 priced offers.
- `pickShopOffer` deducts cost. Gold carries across waves. Restart zeros gold.
- If nothing is affordable, Next Wave is allowed without a pick.
