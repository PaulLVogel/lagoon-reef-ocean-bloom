# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

## Future-chat contract

1. Read this file + `PROJECT_CONTEXT.md` first.
2. Implement **only** the phase or bug the user named this turn.
3. Do not rebuild Phases 1–6 or the app shell. Do not invent Phase 7 unless named.
4. Change the fewest files. Push those to `PaulLVogel/lagoon-reef-ocean-bloom` `main`.
5. Never commit `.vercel/output`.
6. If `src/game` is missing in the App Builder workspace: copy from GitHub `main` (or `artifacts/lagoon-reef-ocean-bloom`). Do not start over.
7. After shipping: update this file + `PROJECT_CONTEXT.md` and copy both into `artifacts/`.

Last shipped: **Phase 6 drop hook** (tiered gems, pop scatter, health, magnet) on `main`.

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
| `src/game/SnakePlayer.ts` | head, segments, weapons, trail, `heal()`, upgrade apply helpers |
| `src/game/Weapon.ts` | `Weapon` / `FireEvent` / default loadout |
| `src/game/MainScene.ts` | spawn, collisions, HP, wave timer, death, shop apply, next wave, gem collect |
| `src/game/Gems.ts` | gem/health/magnet pool, pop scatter, magnetize, vacuum |
| `src/game/shop.ts` | catalog + costs + `rollShopOffers` + `canAffordAny` |
| `src/game/Enemy.ts` | purple chasers (`maxHp` for gem tier) |
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
- Kill → `gems.spawnFromKill` from `applyEnemyHit`.
- Gems by enemy `maxHp`: green 1 / blue 5 / red 10.
- Pop scatter: `Phaser.Math.Between(-50, 50)` + high drag. Head-only pickup.
- 5% red-square health pack → `player.heal(10)`.
- 3% purple diamond magnet → all live gems fly to the head.
- `endWave()` vacuums leftover **gems** into gold, then rolls 3 priced offers.
- `pickShopOffer` deducts cost. Gold carries across waves. Restart zeros gold.
- If nothing is affordable, Next Wave is allowed without a pick.
- While `waveClear`, HUD tick must not overwrite shop-deducted gold.
