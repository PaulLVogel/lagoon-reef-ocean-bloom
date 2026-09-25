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

8. Shop cart is live: `pickShopOffer` toggles `shopCart` only (deselect allowed). **Buy** (`requestBuyCart`) moves cart → `shopBought` + `pendingBuys`. **Next Wave** (`requestNextWave`) does **not** purchase leftover cart items. **`MainScene` must drain the whole `pendingBuys` queue each shop frame** (fall back to a single `pendingUpgrade` only if the queue is empty). Do **not** revert to applying one buy per frame or folding Buy into Next Wave.
9. **Flanker** is in the base horde pool (waves 1–4+). **Tangled** overlap penalty is still **not** in this repo. Do not invent Tangled unless named.
10. Push with **full file bodies**. Truncated `PROJECT_CONTEXT.md` previously left GitHub with only section 0. Prefer `gh`/git over pasted API payloads when files are large.
11. `SnakePlayer.areaOfEffect` (default 1) scales mortar blast radius. There is **no** shop/level stat that raises it yet — do not invent one unless asked.
12. Mortar boom is the **8-frame 64×64** fireball. Do **not** revert `MORTAR_FX_FRAME_*` to 128×80 / 10 frames. Do not invent extra VFX sheets unless asked.
13. Swarmer = Death Slime (`vs-slime`). Grunt (second-easiest) = Goblin Fighter (`vs-goblin` / `goblinAsset.ts`). Do not invent extra enemy sheets unless asked.
14. **Segment physics:** overlap must target `player.segmentGroup`, never the empty `segments` array. After trail layout and after moving a hostile, call `body.updateFromGameObject()`. `spawnHostile` must `physics.add.existing`, `setCircle(6)`, and `hostileGroup.add`. Dead cars (`!isActive`) do not take shot damage and do not destroy the red ball.
15. **Infinite train:** `grantSegmentWeapon` always `addArmedSegment`. Do **not** restore segment merge, mine uniqueness, mine T3 pool removal, or `MAX_SEGMENTS = 14`. Head merge + multi-shot stays. Mine fuse 2s / cadence 3s per car. Shop and level-up must keep offering segment weapons.
16. **Looping fantasy floor:** `MainScene.ensureFantasyBackground()` draws a 256×256 moss/stone tile (`0x112211` base, `0x224422` grid, faint cobble) and `generateTexture('fantasyBackground')` **before** the TileSprite exists. Viewport `TileSprite` at (0,0), `setScrollFactor(0)`, `setDepth(-1)`. `syncBackgroundTile()` sets `tilePositionX/Y` to `cameras.main.scrollX/Y` every frame and on resize. `buildArena` must **not** recreate the old world-sized `arena-tile` floor. No extra floor PNG.

Last shipped: **Looping fantasy floor** (`f50916f`) — camera-locked TileSprite moss/stone grid. Infinite train + head multi-shot still live. Mine layer uncapped (2s fuse, 3s cadence each).

## Rules

- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail. Greyed-out (0 HP) segments still trail the same way.
- Segment HP: starts at 100 (`segmentMaxHp` grows with Max HP stat). `isActive` false at 0 (no fire, tint `0x555555`). Logic stays; **do not draw floating health bars**. `reviveAll()` / `fullHeal()` restore HP. Dead segments do not take more damage. Head contact damages player HP; segment contact damages that segment only. Armor is flat reduction (`mitigate`, min 1).
- Start loadout: `DEFAULT_SEGMENT_COUNT = 0`. The **head** starts with `single_shot` and can stack more **HEAD WEAPONS** (`aura` / `melee_slash` / `cone_burst` / `single_shot`) without growing segments. Trailing segments only roll **SEGMENT WEAPONS** (`railgun` / `chain_lightning` / `mine_layer` / `single_shot` / `mortar`) at 1-to-1.
- Segment weapons: each trailing **active** segment holds **exactly one** `Weapon`. Targeting and shots use **that origin (x, y)**. Dead segments do not fire. Head weapons all fire from the diamond. No orbiting extras.
- Weapon tiers: `Weapon.tier` is 1–3 (`WEAPON_TIER_CAP`) **on the head only**. Duplicate **head** buys merge. Duplicate **segment** buys always grow a new car. Mine layer is uncapped; each mine car drops on a fixed 3s cadence (ignores CDR) and arms for 2s.
- Mortar: fires a slow shell at the enemy's **frozen (x, y)**; no contact damage in flight; AoE on impact scales with `SnakePlayer.areaOfEffect`. Impact plays `vs-mortar-boom` (8×64×64 fireball), not the old 10-frame 128×80 sheet.
- `SnakePlayer` owns player, trail, weapons (incl. head gun), `heal()`, `grantWeapon()`, pickup radius, segment vacuum. `MainScene` owns enemies (tiers + boss), player bullets, hostile boss shots, gems, wave/death/shop apply, Fever, float+blip.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand). Shop HUD is **DOM** (`game-overlay.tsx`) so camera zoom must not be applied to menus/HP/gold.
- Phaser: `import * as Phaser from "phaser"`. Scale: `Phaser.Scale.FIT` + `CENTER_BOTH`, design size `GAME_WIDTH×GAME_HEIGHT` (1280×720). Mobile (`width < MOBILE_WIDTH` or portrait) uses `cameras.main.setZoom(MOBILE_ZOOM)` (`2/3`); desktop zoom `1`.
- Shapes only, except user-provided sheets already in `public/sprites` (bard head, coins, potion, mortar boom, shot-hit, **death slime swarmer**, **goblin fighter grunt**). Do not invent extra PNGs.
- **Next Wave must not `scene.restart()`.** Death Restart still does.
- **Pickups: head only.** Segments never collect. Vacuum leftover **gems** (not health/magnet) to gold at wave end. Segment vacuum pulls gems toward the head.
- Arena floor is the generated `fantasyBackground` TileSprite (camera-locked). Do not restore the old `arena-tile` world sprite.

## File map

| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, trail, `segmentGroup`, bodies + `updateFromGameObject`, HP/grey-out, `deadWeightMul`, head merge + multi-shot, segment append |
| `src/game/Weapon.ts` | 8 types (head + segment pools + mortar), `WeaponSlot`, mine cadence, `FireEvent` mortar |
| `src/game/MainScene.ts` | fantasy TileSprite floor, FIT zoom, `foes`/`hostileGroup` overlaps, mines, mortar, shot-hit, **pendingBuys drain** |
| `src/game/mainSceneRestA.ts` | `update` + `syncBackgroundTile`, waves, shop roll |
| `src/game/mainSceneRestC.ts` | mines/mortar FX, level-up, `buildArena` border only |
| `src/game/mainSceneRestB.ts` | `spawnHostile`, `tickHostiles`, `handleSegmentDamage`, `armEnemyBody` |
| `src/game/mortarExplosionAsset.ts` | `MORTAR_EXPLOSION_URL` data URI for the 8×64 fireball sheet |
| `src/game/shotHitAsset.ts` | `SHOT_HIT_URL` data URI for the 5×32 single-shot spark |
| `src/game/slimeAsset.ts` | `SLIME_URL` data URI for the 4×16 Death Slime walk |
| `src/game/goblinAsset.ts` | `GOBLIN_URL` data URI for the 4×16 Goblin Fighter strip |
| `src/game/Gems.ts` | star gems + health/magnet, pop, magnetize, vacuum, `collectHead` |
| `src/game/stats.ts` | 6 global stats + head/segment weapon offers in `rollLevelOffers` |
| `src/game/shop.ts` | `SHOP_SLOTS = 6`, `add_head_weapon` + `add_blaster`, lock copies the offer object |
| `src/game/Enemy.ts` | horde kinds + boss; slime swarmer + goblin grunt walk sprites; flanker orbit, charger dash, siege tail bolts |
| `src/game/Projectiles.ts` | player bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap + XP/level fields, `pickLevelOffer()`, `pendingBuys` queue, shop lock/reroll/next |
| `src/game/constants.ts` | world, zoom, XP curve, stat steps, gem/weapon colors, **MORTAR_FX_*** (64×64×8 @ 12fps), **SHOT_HIT_***, **SLIME_***, **GOBLIN_*** |
| `src/game/createGame.ts` | Phaser.Game with `Scale.FIT` + `CENTER_BOTH` |
| `src/components/game-overlay.tsx` | start / HUD / XP / level-up menu / death / shop + Lock |
| `src/components/game-canvas.tsx` | Phaser host; canvas must not `h-full w-full` (breaks FIT letterbox) |

## Weapons

Orbiting / circling blades are **gone**. Head inventory + 1-to-1 segments.

| Who | Type | Behavior |
|---|---|---|
| Head (diamond) | HEAD pool | `aura` / `melee_slash` / `cone_burst` / `single_shot` stack on the head. `grantWeapon(type, "head")`. |
| Shop-grown segment | SEGMENT pool | `railgun` / `chain_lightning` / `mine_layer` / `single_shot` / `mortar`. Exactly one per segment. |
| Duplicate buy | head merge / segment append | Head: lowest-tier copy → next tier (multi-shot scales). Segment: always a new car. Mine: unlimited cars. |
| `cone_burst` | head | spread pellets from **head** xy |
| `melee_slash` | head | instant arc/cleave from **head** xy |
| `aura` | head | garlic ring around the diamond |
| `single_shot` | both | nearest in-range enemy from that origin |
| `mine_layer` | segment | unlimited cars; 3s cadence ignores CDR; 2s grey→red fuse |
| `railgun` | segment | fast pierce bullet (red segment) |
| `chain_lightning` | segment | hit nearest, then bolt (cyan segment) |
| `mortar` | segment | slow shell to frozen (x,y); no travel hit; AoE × `areaOfEffect` (green segment); impact = `vs-mortar-boom` |

Shop: `add_head_weapon` vs `add_blaster`. Overlay badges **Head Upgrade** / **New Segment**. `grantWeapon(type, "head")` adds or merges; `grantWeapon(type, "segment")` always grows a car. `applyItemModifier` still works.

## Enemies & waves

Do **not** go back to a single purple chaser.

| Kind | Size | HP base | Speed | Contact |
|---|---|---|---|---|
| `swarmer` (Death Slime sprite) | 8 | 10 | 165 | 4 |
| `grunt` (Goblin Fighter sprite) | 12 | 24 | 95 | 8 |
| `flanker` (waves 1+) | 11 | 16 | 155 | 6 |
| `armored_brute` (wave 5+) | 28 | 190 | 30 | 20 |
| `charger` (wave 11+) | 16 | 42 | 88 | 24 |
| `siege` (wave 15+) | 34 | 230 | 26 | 14 |
| `boss` (every 10th wave) | 52 | `820 * wave * era` | 48 | 22 |

- Mix shifts toward grunts/brutes as `wave` rises. HP `×(1+(wave-1)*0.18)`, contact `×(1+(wave-1)*0.1)`.
- Spawn interval `lerp(850,280,t) / (1+(wave-1)*0.09)`, cap `min(50, 28+(wave-1)*2)`.
- **Boss waves (`wave > 0 && wave % BOSS_WAVE === 0`)**: 10, 20, 30… No normal spawns. One boss. HP/contact scale with wave *and* era (`ERA_BOSS_HP_MUL` / `ERA_BOSS_DMG_MUL`). Volley/aimed shot damage tracks contact. Kill-boss dumps gems (18 + 6×era) and calls `endWave()` so shop opens; the 30s timer still ends the wave if the boss lives.
- **Era spike:** `era = floor((wave-1)/10)`. Waves 1–10 era 0; 11–20 era 1. Horde HP and contact use `waveMul * ERA_HORDE_MUL^era`. Spawn interval divides by `ERA_SPAWN_MUL^era`. Cap rises with era. Wave 11 horde is meant to feel much worse than wave 9. Unlock pool expands with wave; siege engines fire slow bolts at the tail.

## Shop locking & cart

- Shop rolls **6** cards (`SHOP_SLOTS`). Overlay grid is 3×2.
- Each card has its own Lock. Lock stores the **exact** `ShopOffer` on `runtime.heldOffers[i]`. `rollShopOffers` copies a locked slot unchanged (same id, weapon, title, cost). `startNextWave` must **not** wipe `heldOffers`.
- Reroll replaces **unlocked unbought** slots only. Blocked if none of those remain or gold < 5.
- Tapping a card toggles it in `shopCart`. Tapping again deselects it. **Buy** deducts gold, marks those ids in `shopBought`, queues `pendingBuys`, and unlocks those slots. Purchased cards stay marked Bought and cannot be deselected. Other cards stay selectable. The shop **does not close** until Next Wave. Next Wave drops any leftover cart without buying it.
- `add_head_weapon` rolls HEAD pool onto the diamond. `add_blaster` rolls SEGMENT pool. Titles/badges: Head Upgrade vs New Segment.
- `add_2_blasters` / `credit_card` call `grantWeapon(..., "segment")` twice.

## Phase 6 — economy + drop hook + collect hook

Still live. Do not reimplement unless asked.

Kill → `MainScene.applyEnemyHit` → `gems.spawnFromKill(x, y, enemy.maxHp)`.
Collect → `gems.collectHead(player.x, player.y, dt, { pickupRadius, segments, segmentVacuum })`.

| Drop | Chance | Shape | Effect |
|---|---|---|---|
| Cyan gem | remainder, `maxHp < 30` | white-stroke star | +1 gold + XP |
| Yellow gem | remainder, `maxHp >= 30` | white-stroke star | +5 gold + XP |
| Magenta gem | remainder, `maxHp >= 40` | white-stroke star | +10 gold + XP |
| Health pack | 5% | red square | `player.heal(10)` (HP capped at `headMaxHp`) |
| Magnet | 3% | purple diamond | `activateMagnet()` — live gems fly to the head |

- Pickup circle is **larger than** `HEAD_RADIUS`. Shop **Wide maw** (`pickup_radius`) adds `PICKUP_RADIUS_STEP`.
- Shop **Coil vacuum** (`segment_vacuum`): gems near a segment are pulled toward the head. Segments do not collect.
- Fever, gold tally, late-shop `nextWaveBank`, interest, pity, credit-card overdraft, `totalGoldEarned` — unchanged from Phase 6.

## Phase 2 weapons (historical)

Cycling loadout on spawn is **gone**. Head starts single-shot; head duplicates merge; segment duplicates append. `turret_*` / `blaster_rate` still buff `cone_burst` / `single_shot`.

## XP, level-up, global stats

Do not rebuild unless asked.

- XP from gem collect + wave-end gem vacuum (`MainScene.grantXp`). Threshold `xpForLevel(level) = round(18 * level^1.5)`.
- Level-up: `fullHeal()` + pause (`leveling`, `physics.world.pause()`), 3 random picks from **6 stats + HEAD weapons + SEGMENT weapons**. Overlay calls `pickLevelOffer` with `weaponSlot`. Scene applies `applyGlobalStat` and/or `grantWeapon(type, slot)`. Segment weapons (including mine) stay in the pool forever.
- Stats: Max HP +20, Move speed ×1.12, CDR ×1.12, Damage ×1.15, Pickup radius +1 stack, Armor +2.
- Same six also roll in the end-of-wave shop as `stat_*`.
