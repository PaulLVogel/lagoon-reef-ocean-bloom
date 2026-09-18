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

8. Shop multi-buy is live: overlay can buy several cards before Next Wave. `pickShopOffer` appends to `runtime.pendingBuys`. **`MainScene` must drain that whole queue each shop frame** (fall back to a single `pendingUpgrade` only if the queue is empty). Do **not** revert to applying one buy per frame.
9. **Flanker** enemies and **Tangled** overlap penalty are **not** in this repo. GitHub search is empty. Do not invent them unless the user names them as a new feature.
10. Push with **full file bodies**. Truncated `PROJECT_CONTEXT.md` previously left GitHub with only section 0. Prefer `gh`/git over pasted API payloads when files are large.
11. `SnakePlayer.areaOfEffect` (default 1) scales mortar blast radius. There is **no** shop/level stat that raises it yet — do not invent one unless asked.
12. The **head is the halfling bard** (`public/sprites/halfling-bard.png`, 16×16 × 4, `BARD_SCALE = 4`, nearest-neighbor). Sheet faces left; `flipX` when moving right. Do **not** revert to the gold diamond or the train atlas unless the user asks.

Last shipped: **halfling bard as the snake head** (16×16 × 4 walk, nearest-neighbor ×4, `main` `9a8ac9e` + this doc fix). Weapon-pool overhaul still live.

## Rules

- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail. Greyed-out (0 HP) segments still trail the same way.
- Segment HP: starts at 100 (`segmentMaxHp` grows with Max HP stat). `isActive` false at 0 (no fire, tint `0x555555`). Logic stays; **do not draw floating health bars**. `reviveAll()` / `fullHeal()` restore HP. Dead segments do not take more damage. Head contact damages player HP; segment contact damages that segment only. Armor is flat reduction (`mitigate`, min 1).
- Start loadout: `DEFAULT_SEGMENT_COUNT = 0`. The **head** is the **halfling bard** spritesheet (`public/sprites/halfling-bard.png`, 16×16, 4-frame walk, integer `BARD_SCALE = 4`, nearest-neighbor). Sheet faces left; `flipX` when moving right. Pickup ring stays a circle (head container is not rotated). Extra **HEAD WEAPONS** (`aura` / `melee_slash` / `cone_burst` / `single_shot`) still stack on the head without growing segments. Trailing segments only roll **SEGMENT WEAPONS** (`railgun` / `chain_lightning` / `mine_layer` / `single_shot` / `mortar`) at 1-to-1.
- Segment weapons: each trailing **active** segment holds **exactly one** `Weapon`. Targeting and shots use **that origin (x, y)**. Dead segments do not fire. Head weapons all fire from the bard. No orbiting extras.
- Weapon tiers: `Weapon.tier` is 1–3 (`WEAPON_TIER_CAP`). Duplicate buys `grantWeapon(type, slot)` merge the lowest-tier copy **in that slot**. Mine layer is unique: one segment only; T3 removes it from shop/level pools. Mine cadence **ignores** global CDR (3s, slight tier trim) and mines arm for 2s before colliding.
- Mortar: fires a slow shell at the enemy's **frozen (x, y)**; no contact damage in flight; AoE on impact scales with `SnakePlayer.areaOfEffect`.
- `SnakePlayer` owns player, trail, weapons (incl. head gun), `heal()`, `grantWeapon()`, pickup radius, segment vacuum. `MainScene` owns enemies (tiers + boss), player bullets, hostile boss shots, gems, wave/death/shop apply, Fever, float+blip.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand). Shop HUD is **DOM** (`game-overlay.tsx`) so camera zoom must not be applied to menus/HP/gold.
- Phaser: `import * as Phaser from "phaser"`. Scale: `Phaser.Scale.FIT` + `CENTER_BOTH`, design size `GAME_WIDTH×GAME_HEIGHT` (1280×720). Mobile (`width < MOBILE_WIDTH` or portrait) uses `cameras.main.setZoom(MOBILE_ZOOM)` (`2/3`); desktop zoom `1`.
- Shapes only **except** the user-supplied bard sheet (`public/sprites/halfling-bard.png`). Do not replace it with a generated sheet unless asked.
- **Next Wave must not `scene.restart()`.** Death Restart still does.
- **Pickups: head only.** Segments never collect. Vacuum leftover **gems** (not health/magnet) to gold at wave end. Segment vacuum pulls gems toward the head.

## File map

| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head **halfling bard sprite**, trail, HP/grey-out, weapons + merge, `applyGlobalStat`, `fullHeal()`, armor, auras |
| `src/game/Weapon.ts` | 8 types (head + segment pools + mortar), `WeaponSlot`, mine cadence, `FireEvent` mortar |
| `src/game/MainScene.ts` | FIT zoom, `preload` bard sheet, tiers + boss, mines (2s fuse), mortar shells, XP/level-up pause, **pendingBuys drain**, shop apply |
| `src/game/constants.ts` | world, zoom, XP curve, stat steps, gem/weapon colors, **bard sheet / `BARD_SCALE = 4`** |
| `public/sprites/halfling-bard.png` | 16×16 × 4 walk strip (faces left). Preloaded in `MainScene`. |
| `src/game/Gems.ts` | star gems + health/magnet, pop, magnetize, vacuum, `collectHead` |
| `src/game/stats.ts` | 6 global stats + head/segment weapon offers in `rollLevelOffers` |
| `src/game/shop.ts` | `SHOP_SLOTS = 6`, `add_head_weapon` + `add_blaster`, lock copies the offer object |
| `src/game/Enemy.ts` | `swarmer` / `grunt` / `brute` / `boss` specs, chase, boss volley+charge |
| `src/game/Projectiles.ts` | player bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap + XP/level fields, `pickLevelOffer()`, `pendingBuys` queue, shop lock/reroll/next |
| `src/game/createGame.ts` | Phaser.Game with `Scale.FIT` + `CENTER_BOTH` |
| `src/components/game-overlay.tsx` | start / HUD / XP / level-up menu / death / shop + Lock |
| `src/components/game-canvas.tsx` | Phaser host; canvas must not `h-full w-full` (breaks FIT letterbox) |

## Weapons

Orbiting / circling blades are **gone**. Head inventory + 1-to-1 segments.

| Who | Type | Behavior |
|---|---|---|
| Head (bard) | HEAD pool | `aura` / `melee_slash` / `cone_burst` / `single_shot` stack on the bard. `grantWeapon(type, "head")`. |
| Shop-grown segment | SEGMENT pool | `railgun` / `chain_lightning` / `mine_layer` / `single_shot` / `mortar`. Exactly one per segment. |
| Duplicate buy | merge | lowest-tier copy **in that slot** → next tier. Mine: never a second segment. Cap T3. |
| `cone_burst` | head | spread pellets from **head** xy |
| `melee_slash` | head | instant arc/cleave from **head** xy |
| `aura` | head | garlic ring around the bard |
| `single_shot` | both | nearest in-range enemy from that origin |
| `mine_layer` | segment | 1 only; ~3s cadence ignores CDR; 2s grey→red fuse; T3 leaves pools |
| `railgun` | segment | fast pierce bullet (red segment) |
| `chain_lightning` | segment | hit nearest, then bolt (cyan segment) |
| `mortar` | segment | slow shell to frozen (x,y); no travel hit; AoE × `areaOfEffect` (green segment) |

Shop: `add_head_weapon` vs `add_blaster`. Overlay badges **Head Upgrade** / **New Segment**. `grantWeapon(type, slot)` is the add-or-merge hook. `applyItemModifier` still works.

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

- Shop rolls **6** cards (`SHOP_SLOTS`). Overlay grid is 3×2.
- Each card has its own Lock. Lock stores the **exact** `ShopOffer` on `runtime.heldOffers[i]`. `rollShopOffers` copies a locked slot unchanged (same id, weapon, title, cost). `startNextWave` must **not** wipe `heldOffers`.
- Reroll replaces **unlocked unbought** slots only. Blocked if none of those remain or gold < 5.
- Buying a card deducts gold, marks that id in `shopBought`, queues `pendingBuys`, and unlocks **that** slot. Other cards stay buyable. The shop **does not close** until Next Wave.
- `add_head_weapon` rolls HEAD pool onto the bard. `add_blaster` rolls SEGMENT pool. Titles/badges: Head Upgrade vs New Segment.
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

Cycling loadout on spawn is **gone**. Head starts single-shot; shop rolls/merges. `turret_*` / `blaster_rate` still buff `cone_burst` / `single_shot`.

## XP, level-up, global stats

Do not rebuild unless asked.

- XP from gem collect + wave-end gem vacuum (`MainScene.grantXp`). Threshold `xpForLevel(level) = round(18 * level^1.5)`.
- Level-up: `fullHeal()` + pause (`leveling`, `physics.world.pause()`), 3 random picks from **6 stats + HEAD weapons + SEGMENT weapons**. Overlay calls `pickLevelOffer` with `weaponSlot`. Scene applies `applyGlobalStat` and/or `grantWeapon(type, slot)`. Mine T3 is excluded.
- Stats: Max HP +20, Move speed ×1.12, CDR ×1.12, Damage ×1.15, Pickup radius +1 stack, Armor +2.
- Same six also roll in the end-of-wave shop as `stat_*`.
