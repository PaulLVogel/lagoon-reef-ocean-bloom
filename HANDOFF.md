# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

## Future-chat contract

1. Read **this file** and **`PROJECT_CONTEXT.md`** (repo root, also copied to `artifacts/`) first.
2. Implement **only** the phase or bug the user named this turn.
3. Do **not** rebuild Phases 1–6, the drop hook, or the app shell. Do **not** invent Phase 7 unless named.
4. Change the fewest files. Push those to `PaulLVogel/lagoon-reef-ocean-bloom` `main`.
5. Never commit `.vercel/output`.
6. If `src/game` is missing in the App Builder workspace: copy from GitHub `main` (or `artifacts/lagoon-reef-ocean-bloom`). Do not start over.
7. After shipping: update this file + `PROJECT_CONTEXT.md` and copy both into `artifacts/` **and** `artifacts/lagoon-reef-ocean-bloom/`.

Last shipped: **Phase 6 drop hook** on `main` (`10b7df5`).

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail.
- `SnakePlayer` owns player, trail, weapons, `heal()`. `MainScene` owns enemies, bullets, gems, wave/death/shop apply.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.
- **Next Wave must not `scene.restart()`.** Death Restart still does.
- **Pickups: head only.** Segments never collect. Vacuum leftover **gems** (not health/magnet) to gold at wave end.

## File map
| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, segments, weapons, trail, `heal()`, upgrade apply helpers |
| `src/game/Weapon.ts` | `Weapon` / `FireEvent` / default loadout |
| `src/game/MainScene.ts` | spawn, collisions, HP, wave timer, death, shop apply, next wave, `spawnFromKill` |
| `src/game/Gems.ts` | gem/health/magnet pool, pop scatter, magnetize, vacuum, `collectHead` |
| `src/game/shop.ts` | catalog + costs + `rollShopOffers` + `canAffordAny` |
| `src/game/Enemy.ts` | purple chasers (`hp` / `maxHp` for gem tier) |
| `src/game/Projectiles.ts` | bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap (incl. gold), `pickShopOffer()`, `requestNextWave()` |
| `src/game/constants.ts` | tunables including gem values and drop chances |
| `src/components/game-overlay.tsx` | start / HUD clock / gold / death / shop |

## Phase 2 weapons
| Segment | Type | Behavior |
|---|---|---|
| 0 | blaster | fires along facing, 280ms, 6 dmg |
| 1 | turret | aims nearest enemy, 420ms, 8 dmg |
| 2 | blade | two orbiting rects, 160ms CD, 5 dmg |

## Phase 6 — economy + drop hook (`10b7df5`)
Kill → `MainScene.applyEnemyHit` → `gems.spawnFromKill(x, y, enemy.maxHp)`.

| Drop | Chance | Shape | Effect |
|---|---|---|---|
| Green gem | remainder, `maxHp < 30` | circle | +1 gold |
| Blue gem | remainder, `maxHp >= 30` | circle | +5 gold |
| Red gem | remainder, `maxHp >= 40` | circle | +10 gold |
| Health pack | 5% | red square | `player.heal(10)` (HP capped at 100) |
| Magnet | 3% | purple diamond | `activateMagnet()` — live gems fly to the head |

- Pop scatter: `vx/vy = Phaser.Math.Between(-50, 50)`, high drag (`GEM_DRAG`). Simulated on the gem pool, **not** on snake segments.
- `collectHead` uses head x/y + `HEAD_RADIUS`. Segments ignored.
- Enemy HP scales with wave: `ENEMY_HP + (wave-1)*6 + random(0,10)` so blue/red appear later.
- `endWave()` vacuums leftover **gems** into gold, then rolls 3 priced offers.
- `pickShopOffer` deducts cost. Gold carries across waves. Restart zeros gold.
- If nothing is affordable, Next Wave is allowed without a pick.
- While `waveClear`, HUD tick must not overwrite shop-deducted gold.
