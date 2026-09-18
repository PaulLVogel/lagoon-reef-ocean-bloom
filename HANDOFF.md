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
7. After shipping: update this file + `PROJECT_CONTEXT.md` and copy both into `artifacts/` **and** `artifacts/lagoon-reef-ocean-bloom/` **and** `src/game/HANDOFF.md`.

Last shipped (`main` `ef12c07`): **mobile FIT + camera zoom, head-only single-shot start, 1:1 weapons, hidden segment HP bars, enemy tiers + wave scaling, wave-10 boss, per-slot shop lock, Brotato weapon merge T1–T3**.

## Rules

- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail. Greyed-out (0 HP) segments still trail the same way.
- Segment HP: 100 each, `isActive` false at 0 (no fire, tint `0x555555`). Logic stays; **do not draw floating health bars**. `reviveAll()` on wave end. Dead segments do not take more damage. Head contact damages player HP; segment contact damages that segment only.
- Start loadout: `DEFAULT_SEGMENT_COUNT = 0`. The **head** has exactly one `single_shot` (`segmentIndex = -1`). Trailing segments are only added via shop `grantWeapon`.
- Segment weapons: each trailing **active** segment holds **exactly one** `Weapon`. Targeting and shots use **that origin (x, y)** — head weapon from the head, segment weapons from the segment. Dead segments do not fire. No orbiting extras. `armSegment` / `attachMount` refuse a second gun on the same index.
- Weapon tiers: `Weapon.tier` is 1–3 (`WEAPON_TIER_CAP`). Duplicate shop buys call `SnakePlayer.grantWeapon(type)` which **merges** the lowest-tier copy of that type (`bumpTier`) instead of growing a new segment. Cap T3. Damage `×(1+(tier-1)*0.55)`, range `×(1+(tier-1)*0.18)`.
- `SnakePlayer` owns player, trail, weapons (incl. head gun), `heal()`, `grantWeapon()`, pickup radius, segment vacuum. `MainScene` owns enemies (tiers + boss), player bullets, hostile boss shots, gems, wave/death/shop apply, Fever, float+blip.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand). Shop HUD is **DOM** (`game-overlay.tsx`) so camera zoom must not be applied to menus/HP/gold.
- Phaser: `import * as Phaser from "phaser"`. Scale: `Phaser.Scale.FIT` + `CENTER_BOTH`, design size `GAME_WIDTH×GAME_HEIGHT` (1280×720). Mobile (`width < MOBILE_WIDTH` or portrait) uses `cameras.main.setZoom(MOBILE_ZOOM)` (`2/3`); desktop zoom `1`.
- Shapes only. No PNGs unless asked.
- **Next Wave must not `scene.restart()`.** Death Restart still does.
- **Pickups: head only.** Segments never collect. Vacuum leftover **gems** (not health/magnet) to gold at wave end. Segment vacuum pulls gems toward the head.

## File map

| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, trail, per-segment HP/grey-out (bars hidden), head single-shot + one weapon per segment, `grantWeapon` merge, `applyItemModifier`, `heal()`, `reviveAll()`, pickup ring |
| `src/game/Weapon.ts` | types, `tier`, `makeWeapon`, `randomWeaponType`, `bumpTier`, `weaponDamage`/`weaponRange` with tier mul, `FireEvent` |
| `src/game/MainScene.ts` | FIT zoom, spawn tiers, wave-10 boss, hostile shots, collisions, HP, wave timer, death, shop apply, next wave, `spawnFromKill`, collect+Fever+blip |
| `src/game/Gems.ts` | gem/health/magnet pool, pop scatter, magnetize, vacuum, `collectHead` |
| `src/game/shop.ts` | catalog + rarity + `scaledOfferCost` + `rollShopOffers(..., held)` per-slot keep + `weaponType`/`merge` on `add_blaster` |
| `src/game/Enemy.ts` | `swarmer` / `grunt` / `brute` / `boss` specs, chase, boss volley+charge |
| `src/game/Projectiles.ts` | player bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap, `purchaseHistory`, `slotLocked[]`, `frozenKinds`, `pendingWeaponType`, `pickShopOffer()`, `requestReroll()`, `requestToggleSlotLock(i)`, `requestNextWave()` |
| `src/game/constants.ts` | world, `GAME_WIDTH/HEIGHT`, `MOBILE_ZOOM`, `BOSS_WAVE`, gem/pickup tunables |
| `src/game/createGame.ts` | Phaser.Game with `Scale.FIT` + `CENTER_BOTH` |
| `src/components/game-overlay.tsx` | start / HUD clock / gold / fever / death / shop cards with per-slot Lock |
| `src/components/game-canvas.tsx` | Phaser host; canvas must not `h-full w-full` (breaks FIT letterbox) |

## Weapons

Orbiting / circling blades are **gone**. Strict 1-to-1.

| Who | Type | Behavior |
|---|---|---|
| Head at start | `single_shot` | nearest enemy in range, 280ms, projectile from **head** xy |
| Shop-grown segment | rolled `single_shot` / `cone_burst` / `melee_slash` | fires only that type from **segment** xy |
| Duplicate buy | merge | existing lowest-tier copy of that type → next tier, no new segment, cap T3 |
| `cone_burst` | | 3–5 spread pellets toward nearest in-range enemy |
| `melee_slash` | | instant arc/cleave graphic, no traveling bullet |

Shop hook: `applyItemModifier(segmentIndex, "damage" \| "range" \| "fireRate", multiplier)` still works. `grantWeapon` is the add-or-merge hook. `add_blaster` offers stamp `weaponType` + merge title at roll time.

## Enemies & waves

Do **not** go back to a single purple chaser.

| Kind | Size | HP base | Speed | Contact |
|---|---|---|---|---|
| `swarmer` | 8 | 10 | 165 | 4 |
| `grunt` | 12 | 24 | 95 | 8 |
| `brute` | 22 | 70 | 52 | 16 |
| `boss` (wave 10 only) | 52 | `820 * waveHpMul` | 48 | 22 |

- Mix shifts toward grunts/brutes as `wave` rises. HP `×(1+(wave-1)*0.18)`, contact `×(1+(wave-1)*0.1)`.
- Spawn interval `lerp(850,280,t) / (1+(wave-1)*0.09)`, cap `min(50, 28+(wave-1)*2)`.
- **Wave 10 (`BOSS_WAVE`)**: no normal spawns. One boss: chase + periodic 8-way volley + aimed shot + charge. Death dumps ~18 gems (`spawnFromKill` with high hpBand). Wave timer still 30s; `endWave` still clears the field.

## Shop locking & merge

- Each of the 3 cards has its own Lock (`requestToggleSlotLock(index)` → `slotLocked[i]`).
- Reroll (`requestReroll`) replaces **unlocked** slots only; locked cards stay in their slot (`rollShopOffers(..., held)`). Blocked if all three locked or gold < 5 or after a pick.
- Advancing to the next shop keeps locked slots; costs rescale with wave.
- Buying a card unlocks **that** slot only. Restart clears all locks. Global freeze-all is leftover (`requestToggleFreeze`) — prefer per-slot lock in the overlay.
- `add_blaster` is a rolled weapon: if `player.canMerge(type)` the card title is `Merge {label} → T{n}`; apply path is `grantWeapon`.
- `add_2_blasters` / `credit_card` call `grantWeapon` twice (merge-or-add each).

## Phase 6 — economy + drop hook + collect hook

Still live. Do not reimplement unless asked.

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
- Shop **Coil vacuum** (`segment_vacuum`): gems near a segment are pulled toward the head. Segments do not collect.
- Fever, gold tally, late-shop `nextWaveBank`, interest, pity, credit-card overdraft, `totalGoldEarned` — unchanged from Phase 6.

## Phase 2 weapons (historical)

Cycling loadout on spawn is **gone**. Head starts single-shot; shop rolls/merges. `turret_*` / `blaster_rate` still buff `cone_burst` / `single_shot`.
