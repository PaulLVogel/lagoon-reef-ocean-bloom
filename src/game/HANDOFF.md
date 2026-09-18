# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

## Future-chat contract

1. Read **this file** and **`PROJECT_CONTEXT.md`** (repo root, also copied to `artifacts/`) first.
2. Implement **only** the phase or bug the user named this turn.
3. Do **not** rebuild Phases 1–6, the drop hook, the collect hook, or the app shell. Do **not** invent Phase 7 unless named.
4. Change the fewest files. Push those to `PaulLVogel/lagoon-reef-ocean-bloom` `main`.
5. Never commit `.vercel/output`.
6. If `src/game` is missing in the App Builder workspace: copy from GitHub `main` (or `artifacts/lagoon-reef-ocean-bloom`). Do not start over.
7. After shipping: update this file + `PROJECT_CONTEXT.md` and copy both into `artifacts/` **and** `artifacts/lagoon-reef-ocean-bloom/`.

Last shipped: **Shop cost hook** on `main` (purchase-history ×1.5, 5g reroll, rarity weights, 10% bank interest).

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail.
- `SnakePlayer` owns player, trail, weapons, `heal()`, pickup radius, segment vacuum. `MainScene` owns enemies, bullets, gems, wave/death/shop apply, Fever, float+blip.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.
- **Next Wave must not `scene.restart()`.** Death Restart still does.
- **Pickups: head only.** Segments never collect. Vacuum leftover **gems** (not health/magnet) to gold at wave end. Segment vacuum pulls gems toward the head.

## File map
| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, segments, weapons, trail, `heal()`, pickup ring, `boostPickupRadius()`, `enableSegmentVacuum()` |
| `src/game/Weapon.ts` | `Weapon` / `FireEvent` / default loadout |
| `src/game/MainScene.ts` | spawn, collisions, HP, wave timer, death, shop apply, next wave, `spawnFromKill`, collect+Fever+blip |
| `src/game/Gems.ts` | gem/health/magnet pool, pop scatter, magnetize, vacuum, `collectHead` |
| `src/game/shop.ts` | catalog + rarity + `scaledOfferCost` + `rollShopOffers` + `bankInterest` |
| `src/game/Enemy.ts` | purple chasers (`hp` / `maxHp` for gem tier) |
| `src/game/Projectiles.ts` | bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap, `purchaseHistory`, `pickShopOffer()`, `requestReroll()`, `requestNextWave()` |
| `src/game/constants.ts` | tunables including gem values, pickup radius, combo window |
| `src/components/game-overlay.tsx` | start / HUD clock / gold / fever / death / shop |

## Phase 2 weapons
| Segment | Type | Behavior |
|---|---|---|
| 0 | blaster | fires along facing, 280ms, 6 dmg |
| 1 | turret | aims nearest enemy, 420ms, 8 dmg |
| 2 | blade | two orbiting rects, 160ms CD, 5 dmg |

## Phase 6 — economy + drop hook + collect hook
Kill → `MainScene.applyEnemyHit` → `gems.spawnFromKill(x, y, enemy.maxHp)`.
Collect → `gems.collectHead(player.x, player.y, dt, { pickupRadius, segments, segmentVacuum })`.

| Drop | Chance | Shape | Effect |
|---|---|---|---|
| Green gem | remainder, `maxHp < 30` | circle | +1 gold |
| Blue gem | remainder, `maxHp >= 30` | circle | +5 gold |
| Red gem | remainder, `maxHp >= 40` | circle | +10 gold |
| Health pack | 5% | red square | `player.heal(10)` (HP capped at 100) |
| Magnet | 3% | purple diamond | `activateMagnet()` — live gems fly to the head |

- Pickup circle is **larger than** `HEAD_RADIUS`. Shop **Wide maw** (`pickup_radius`) adds `PICKUP_RADIUS_STEP`.
- Shop **Coil vacuum** (`segment_vacuum`, high-tier): gems near a segment are pulled toward the head. Segments do not collect.
- On each head collect: floating `+N` rises and fades in 500ms + short high-pitch sine blip.
- Fever: more than 10 gems in 2s → subsequent gems worth ×2 until the 2s combo timer drops (refreshed while Fever stays active).
- Pop scatter: `vx/vy = Phaser.Math.Between(-50, 50)`, high drag (`GEM_DRAG`). Simulated on the gem pool, **not** on snake segments.
- `collectHead` uses head x/y + pickup radius. Segments ignored for pickup.
- Enemy HP scales with wave: `ENEMY_HP + (wave-1)*6 + random(0,10)` so blue/red appear later.
- `endWave()` vacuums leftover **gems** into gold, then `rollShop()` draws 3 rarity-weighted offers.
- `pickShopOffer` deducts `offer.cost` and appends `kind` to `runtime().purchaseHistory`.
- Repeat purchases: `scaledOfferCost(base, wave, bought)` = `round(base * 1.5^bought * waveScale)`. History is an array of `ShopKind`. Restart clears it.
- Reroll: persistent shop button, flat 5g (`SHOP_REROLL_COST`). `requestReroll()` deducts gold; MainScene calls `rollShop()` again. Blocked after a pick or if gold < 5.
- Rarity weights: Common 70% / Rare 25% / Legendary 5%. Legendary offers (Coil vacuum, Add 2 Blaster Segments) use `.shop-legend` glow in the overlay.
- Interest: leftover gold banks `floor(gold * 0.1)` in `startNextWave`. Next Wave is allowed without a pick so players can hoard toward a Legendary.
- While `waveClear`, HUD tick must not overwrite shop-deducted / reroll-deducted gold.
