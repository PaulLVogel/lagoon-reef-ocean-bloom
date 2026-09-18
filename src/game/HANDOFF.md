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

Last shipped: **mobile FIT+zoom, 1:1 weapons + hidden HP bars, enemy tiers, wave-10 boss, per-slot shop lock, Brotato weapon merge T1–T3**.

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail. Greyed-out (0 HP) segments still trail the same way.
- Segment HP: 100 each, floating Graphics bars, `isActive` false at 0 (no fire, tint 0x555555, hide bar). `reviveAll()` on wave end. Dead segments do not take more damage.
- Segment weapons: each trailing **active** segment is an independent party member. Targeting and shots use **that segment's (x, y)** only — never head position or facing. Dead segments do not fire. **Exactly one** weapon per segment — no orbiting extras.
- `SnakePlayer` owns player, trail, weapons, `heal()`, pickup radius, segment vacuum. `MainScene` owns enemies, bullets, gems, wave/death/shop apply, Fever, float+blip.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.
- **Next Wave must not `scene.restart()`.** Death Restart still does.
- **Pickups: head only.** Segments never collect. Vacuum leftover **gems** (not health/magnet) to gold at wave end. Segment vacuum pulls gems toward the head.

## File map
| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, segments, trail, per-segment HP/bars/grey-out, one weapon per segment, slash graphic, `applyItemModifier`, `heal()`, `reviveAll()`, pickup ring |
| `src/game/Weapon.ts` | `WeaponType` SINGLE_SHOT/CONE_BURST/MELEE_SLASH, stats + multipliers, `FireEvent`, `makeWeapon`, `defaultLoadout` |
| `src/game/MainScene.ts` | spawn, collisions, HP, wave timer, death, shop apply, next wave, `spawnFromKill`, collect+Fever+blip |
| `src/game/Gems.ts` | gem/health/magnet pool, pop scatter, magnetize, vacuum, `collectHead` |
| `src/game/shop.ts` | catalog + rarity + `scaledOfferCost` + `rollShopOffers` + `offersFromKinds` + `canAffordAny` + `bankInterest` + pity constants |
| `src/game/Enemy.ts` | purple chasers (`hp` / `maxHp` for gem tier) |
| `src/game/Projectiles.ts` | bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap, `purchaseHistory`, freeze, `pickShopOffer()`, `requestReroll()`, `requestToggleFreeze()`, `requestNextWave()` |
| `src/game/constants.ts` | tunables including gem values, pickup radius, combo window |
| `src/components/game-overlay.tsx` | start / HUD clock / gold / fever / death / shop |

## Weapons (one per trailing segment)

Orbiting / circling blades are **gone**. Each segment holds exactly one `Weapon`. Targeting uses **that segment's (x, y)** only — never head position or head facing. `positionHistory` trail is unchanged. Greyed-out segments skip fire.

| Cycle | Type | Behavior |
|---|---|---|
| 0, 3, … | `single_shot` | nearest enemy in `baseRange * rangeMultiplier`, 280ms, projectile from segment xy |
| 1, 4, … | `cone_burst` | 3–5 spread pellets toward nearest in-range enemy |
| 2, 5, … | `melee_slash` | instant arc/cleave graphic, no traveling bullet; hits in the wedge |

Stats: `baseDamage`, `baseRange`, `baseFireRate` plus `damageMultiplier` / `rangeMultiplier` / `fireRateMultiplier` (default 1). Closest enemy outside calculated range → no fire.

Shop hook: `applyItemModifier(segmentIndex, "damage" \| "range" \| "fireRate", multiplier)`.

## Phase 2 weapons (historical)

Replaced by the modular types above. Shop kinds `add_blaster` / `turret_*` still apply to `single_shot` / `cone_burst`.

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
- Tactical skip: `requestNextWave` works even when something is affordable.
- Pity: skip while `canAffordAny` is false → +10 HP (cap 100) and +2g after interest.
- Freeze: lock the current 3 kinds; next shop rebuilds them (`offersFromKinds`) with wave-scaled costs. Reroll off while frozen. Pick or Restart clears freeze.
- Priced-out UI: gray cards + pulsing green Next Wave (`.shop-next-pulse`).
- While `waveClear`, HUD tick must not overwrite shop-deducted / reroll-deducted gold.
- Gold tally: pick/reroll stores `goldTallyFrom`; MainScene `tallyGoldDisplay` tweens `goldDisplay` 300ms. Overlay reads `goldDisplay` (red if < 0). Ledger `gold` is instant.
- Late shop gems: collect during `waveClear` adds to `nextWaveBank` only. Applied in `startNextWave` after the purchase, before interest.
- Credit card shop kind: overdraft allowed; +2 blasters + 18% speed; once per run.
- `totalGoldEarned` never shrinks on spend. Death screen shows lifetime + g/kill. Restart zeros it.
