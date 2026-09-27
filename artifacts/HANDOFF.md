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
9. **Flanker** is in the base horde pool (waves 1–4+). The self-overlap penalty now exists as **self-collision / "SELF-BITE"** (rule 18). Do not add a second, separate "Tangled" mechanic unless named.
10. Push with **full file bodies**. Truncated `PROJECT_CONTEXT.md` previously left GitHub with only section 0. Prefer `gh`/git over pasted API payloads when files are large.
11. `SnakePlayer.areaOfEffect` (default 1) scales mortar blast radius. There is **no** shop/level stat that raises it yet — do not invent one unless asked.
12. Mortar boom is the **8-frame 64×64** fireball. Do **not** revert `MORTAR_FX_FRAME_*` to 128×80 / 10 frames. Do not invent extra VFX sheets unless asked.
13. Swarmer = Death Slime (`vs-slime`). Grunt (second-easiest) = Goblin Fighter (`vs-goblin` / `goblinAsset.ts`). Do not invent extra enemy sheets unless asked.
14. **Segment physics:** overlap must target `player.segmentGroup`, never the empty `segments` array. After trail layout and after moving a hostile, call `body.updateFromGameObject()`. `spawnHostile` must `physics.add.existing`, `setCircle(6)`, and `hostileGroup.add`. Dead cars (`!isActive`) do not take shot damage and do not destroy the red ball.
15. **Infinite train:** `grantSegmentWeapon` always `addArmedSegment`. Do **not** restore segment merge, mine uniqueness, mine T3 pool removal, or `MAX_SEGMENTS = 14`. Head merge + multi-shot stays. Mine fuse 2s / cadence 3s per car. Shop and level-up must keep offering segment weapons.
16. **Looping fantasy floor:** `MainScene.ensureFantasyBackground()` draws a 256×256 moss/stone tile (`0x112211` base, `0x224422` grid, faint cobble) and `generateTexture('fantasyBackground')` **before** the TileSprite exists. Viewport `TileSprite` at (0,0), `setScrollFactor(0)`, `setDepth(-1)`. `syncBackgroundTile()` sets `tilePositionX/Y` to `cameras.main.scrollX/Y` every frame and on resize. `buildArena` must **not** recreate the old world-sized `arena-tile` floor. No extra floor PNG.

17. **Distance-based trail (Paul approved overriding the old "stride only" rule):** `positionHistory` is still the trail, but a point is committed only after the head moves `HISTORY_MIN_STEP` (4 px), and segment *i* sits `(i + 1) × SEGMENT_SPACING` (28 px) of **path length** behind the head, interpolated between points (`layoutSegments`). Spacing no longer changes with frame rate or move speed (the old `HISTORY_STRIDE = 7` gave 55 px gaps at 30 Hz, 28 px at 60 Hz, 12 px at 144 Hz). Trim/extend by path length (`trimHistory`, `ensureHistoryCapacity` extends the tail straight back). Do **not** go back to a fixed number of history points per segment.
18. **Self-collision ("SELF-BITE"):** `MainScene.checkSelfCollision` (restB, called in the combat loop before `checkPlayerContact`) asks `SnakePlayer.selfHitIndex()`: head overlapping any segment from index `SELF_HIT_IGNORE_SEGMENTS` (2) on, using `(HEAD_RADIUS + SEGMENT_RADIUS) × SELF_HIT_RADIUS_MUL`. Greyed cars count (they keep their hitbox). Hit = flat `SELF_HIT_DAMAGE` (6) to head HP (no armor, no i-frames granted), `knockFromSegment` → knockback away from that car (`SELF_HIT_KNOCKBACK` px/s decaying over `SELF_HIT_STUN_MS` 220 ms, input ignored), `SELF_HIT_COOLDOWN_MS` 900 ms before the next self-hit. Feedback: orange camera flash + small shake, head glow/bard tint orange, hit car flashes white, orange ring burst, floating `SELF-BITE -6`, low thud. Only while `combatOn` (not in the shop/wave-clear roam). Can kill you (head HP). Tune via the `SELF_HIT_*` constants. A coil (rule 19) runs first and can suppress it briefly.
19. **Coiling ("COIL"):** `MainScene.checkCoil` (restB, called in the combat loop right **before** `checkSelfCollision`) asks `SnakePlayer.coilLoop()`: head within `COIL_CLOSE_DIST` (36 px) of a car at index ≥ `COIL_MIN_SEGMENT_INDEX` (4, i.e. the 5th car) **and** the polygon head → `positionHistory` → that car encloses ≥ `COIL_MIN_AREA` (5000 px²). Every live enemy whose centre is inside takes `(COIL_BASE_DAMAGE 60 + COIL_DAMAGE_PER_SEGMENT 8 × cars in the loop) × player.damageMul` via `applyEnemyHit` (bosses included). Then `COIL_COOLDOWN_MS` (4 s) cooldown (`scene.coilReadyAt`) and `grantSelfHitGrace(COIL_BITE_GRACE_MS 500)`. **SELF-BITE interaction (Paul approved):** a coil off cooldown fires first and grants 0.5 s bite immunity; while the coil is cooling down, or for thin/zero-area loops (reversing straight back into yourself) or cars 3–4, touching the body still bites. Coil radius 36 px > bite radius ~21 px, so an approaching head closes the coil before it bites. Feedback: gold polygon fill + outline fading 420 ms, small shake, `COIL xN` label at the loop centre, rising triangle chime. HUD: `coilMs` (ms to ready, `-1` when the train is ≤ 4 cars) → DOM `Coil` pill (`Ready` / `3.2s`). Combat only.

20. **Shedding ("SHED", Paul approved):** **E**, gamepad **RB/RT** (buttons 5/7), or the round **SHED** button bottom-right on touch (`requestShed` → `runtime.shedRequested`). `input.consumeShed()` is read every frame in `update` (restA) so presses outside combat are dropped; `MainScene.tryShed` (restB) runs in the combat loop right **before** `checkCoil`. `SnakePlayer.shed(now)`: if **any** cars are greyed, **all** greyed cars detach and each **explodes** (`playMortarExplosion` fireball, `SHED_BLAST_DAMAGE 45 × damageMul` to enemies within `SHED_BLAST_RADIUS` 80 px; overlapping blasts stack). If none are greyed, only the **tail** car detaches and becomes a stationary **turret** (`player.turrets`) that keeps firing its weapon (segment rules: one shot, no head multi-shot) for `SHED_TURRET_MS` (8 s) with a shrinking ring, blinks for the last 20 %, then fades out; it is out of `segmentGroup` (enemies/shots ignore it). An unarmed tail car explodes instead. Shed cars and their weapons are **gone for good**; the next segment buy still appends a new car (rule 15 unchanged, no cap). `removeSegments` reindexes survivors (`Weapon.segmentIndex`, `segIndex` data, depth) and trims the path; cars behind a removed mid-body car **slide** into their new slot over `SHED_SLIDE_MS` (180 ms) instead of snapping. After a shed: `SHED_COOLDOWN_MS` (6 s, `scene.shedReadyAt`) and `grantSelfHitGrace(SHED_BITE_GRACE_MS 500)`. Coil just uses whatever length remains (the pill hides at ≤ 4 cars). Feedback: `SHED` / `SHED xN` (orange) or `TURRET` (cyan) float, small shake on blasts, low pop. HUD: `shedMs` (ms to ready, `-1` with no cars or in the shop) → DOM `Shed` pill + the mobile button shows the countdown. Combat only.

Last shipped: **Shedding** (Claude, branch `claude/task-8-shedding`, built on `claude/task-7-coiling` → `claude/task-6-self-collision`; all awaiting Paul's merge). Before that: **Coiling** (branch `claude/task-7-coiling`). Before that: **Distance-based trail + self-collision** (branch `claude/task-6-self-collision`). Before that: looping fantasy floor (`f50916f`). Infinite train + head multi-shot still live. Mine layer uncapped (2s fuse, 3s cadence each).

## Rules

- Segments: `positionHistory` only, **distance-based** (`SEGMENT_SPACING = 28` px of path per car, point committed every `HISTORY_MIN_STEP = 4` px). Append **only while the head actually moves** (pushing into a wall adds nothing). No Arcade velocity / `moveToObject` / pathfinding on the trail. Greyed-out (0 HP) segments still trail the same way.
- Self-collision: head vs own body past the first 2 cars → `SELF-BITE` (see rule 18).
- Coiling: head closing a real loop on car 5+ → `COIL` damages enemies inside, 4 s cooldown, 0.5 s bite grace (see rule 19).
- Shedding: E / RB / mobile SHED → all greyed cars explode, or (none greyed) the tail becomes an 8 s turret; 6 s cooldown; shed cars are gone for good (see rule 20).
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
| `src/game/SnakePlayer.ts` | head, distance-based trail, self-hit query + knockback/stun (`selfHitIndex`, `knockFromSegment`), coil loop polygon (`coilLoop`, `grantSelfHitGrace`), shedding (`shed`, `removeSegments` reindex + slide, `turrets`, `tryFire`), `segmentGroup`, bodies + `updateFromGameObject`, HP/grey-out, `deadWeightMul`, head merge + multi-shot, segment append |
| `src/game/Weapon.ts` | 8 types (head + segment pools + mortar), `WeaponSlot`, mine cadence, `FireEvent` mortar |
| `src/game/MainScene.ts` | fantasy TileSprite floor, FIT zoom, `foes`/`hostileGroup` overlaps, mines, mortar, shot-hit, **pendingBuys drain** |
| `src/game/mainSceneRestA.ts` | `update` + `syncBackgroundTile`, waves, shop roll |
| `src/game/mainSceneRestC.ts` | mines/mortar FX, level-up, `buildArena` border only |
| `src/game/mainSceneRestB.ts` | `spawnHostile`, `tickHostiles`, `handleSegmentDamage`, `armEnemyBody`, `tryShed` + `playShedPop`, `checkCoil` + `playCoilChime`, `checkSelfCollision` + `playThud` |
| `src/game/mortarExplosionAsset.ts` | `MORTAR_EXPLOSION_URL` data URI for the 8×64 fireball sheet |
| `src/game/shotHitAsset.ts` | `SHOT_HIT_URL` data URI for the 5×32 single-shot spark |
| `src/game/slimeAsset.ts` | `SLIME_URL` data URI for the 4×16 Death Slime walk |
| `src/game/goblinAsset.ts` | `GOBLIN_URL` data URI for the 4×16 Goblin Fighter strip |
| `src/game/Gems.ts` | star gems + health/magnet, pop, magnetize, vacuum, `collectHead` |
| `src/game/stats.ts` | 6 global stats + head/segment weapon offers in `rollLevelOffers` |
| `src/game/shop.ts` | `SHOP_SLOTS = 6`, `add_head_weapon` + `add_blaster`, lock copies the offer object |
| `src/game/Enemy.ts` | horde kinds + boss; slime swarmer + goblin grunt walk sprites; flanker orbit, charger dash, siege tail bolts |
| `src/game/Projectiles.ts` | player bullet pool + `clear()` |
| `src/game/input.ts` | keyboard / stick / gamepad move, `consumeShed` (E, pad 5/7, mobile queue), `requestShed` |
| `src/game/runtime.ts` | HUD snap + XP/level fields + `coilMs` / `shedMs`, `shedRequested`, `pickLevelOffer()`, `pendingBuys` queue, shop lock/reroll/next |
| `src/game/constants.ts` | world, zoom, `SEGMENT_SPACING` / `HISTORY_MIN_STEP`, `SELF_HIT_*`, `COIL_*`, `SHED_*`, XP curve, stat steps, gem/weapon colors, **MORTAR_FX_*** (64×64×8 @ 12fps), **SHOT_HIT_***, **SLIME_***, **GOBLIN_*** |
| `src/game/createGame.ts` | Phaser.Game with `Scale.FIT` + `CENTER_BOTH` |
| `src/components/game-overlay.tsx` | start / HUD (Coil + Shed pills) / mobile SHED button / XP / level-up menu / death / shop + Lock |
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
