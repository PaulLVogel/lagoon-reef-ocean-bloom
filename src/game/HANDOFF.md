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

Last shipped: **XP + level-up full heal, 6 global stats, mine/rail/chain/aura, star gems** (keeps FIT zoom, 1:1 merge, tiers + boss, per-slot shop lock).

## Rules

- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail. Greyed-out (0 HP) segments still trail the same way.
- Segment HP: starts at 100 (`segmentMaxHp` grows with Max HP stat). `isActive` false at 0 (no fire, tint `0x555555`). Logic stays; **do not draw floating health bars**. `reviveAll()` / `fullHeal()` restore HP. Dead segments do not take more damage. Head contact damages player HP; segment contact damages that segment only. Armor is flat reduction (`mitigate`, min 1).
- Start loadout: `DEFAULT_SEGMENT_COUNT = 0`. The **head** has exactly one `single_shot` (`segmentIndex = -1`). Trailing segments are only added via shop `grantWeapon`.
- Segment weapons: each trailing **active** segment holds **exactly one** `Weapon`. Targeting and shots use **that origin (x, y)** — head weapon from the head, segment weapons from the segment. Dead segments do not fire. No orbiting extras. `armSegment` / `attachMount` refuse a second gun on the same index.
- Weapon tiers: `Weapon.tier` is 1–3 (`WEAPON_TIER_CAP`). Duplicate shop buys call `SnakePlayer.grantWeapon(type)` which **merges** the lowest-tier copy of that type (`bumpTier`) instead of growing a new segment. Cap T3. Damage `×(1+(tier-1)*0.55)`, range `×(1+(tier-1)*0.18)`.
- `SnakePlayer` owns player, trail, weapons (incl. head gun), `heal()`, `grantWeapon()`, pickup radius, segment vacuum, `applyGlobalStat`, armor. `MainScene` owns enemies, bullets, mines/chain/aura resolve, gems, XP/level-up, wave/death/shop apply.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand). Shop and level-up HUD are **DOM** (`game-overlay.tsx`) so camera zoom must not be applied to menus/HP/gold/XP.
- Phaser: `import * as Phaser from "phaser"`. Scale: `Phaser.Scale.FIT` + `CENTER_BOTH`, design size `GAME_WIDTH×GAME_HEIGHT` (1280×720). Mobile uses `cameras.main.setZoom(MOBILE_ZOOM)` (`2/3`); desktop zoom `1`.
- Shapes only. No PNGs unless asked.
- **Next Wave must not `scene.restart()`.** Death Restart still does.
- **Pickups: head only.** Segments never collect. Vacuum leftover **gems** (not health/magnet) to gold + XP at wave end.

## File map

| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, trail, HP/grey-out, weapons + merge, `applyGlobalStat`, `fullHeal()`, armor, auras |
| `src/game/Weapon.ts` | 7 types, `tier`, `FireEvent` kinds bullet/slash/mine/chain/aura, pierce/bounces |
| `src/game/MainScene.ts` | FIT zoom, tiers + boss, mines/chain/aura/pierce, XP/level-up pause, shop apply, gems |
| `src/game/Gems.ts` | star gems + health/magnet, pop, magnetize, vacuum, `collectHead` |
| `src/game/stats.ts` | 6 global stats + `rollLevelOffers` |
| `src/game/shop.ts` | catalog incl. `stat_*` + rarity + lock-aware `rollShopOffers` |
| `src/game/Enemy.ts` | `swarmer` / `grunt` / `brute` / `boss` specs, chase, boss volley+charge |
| `src/game/Projectiles.ts` | player bullet pool + pierce + `clear()` |
| `src/game/runtime.ts` | HUD snap + XP/level fields, `pickLevelOffer()`, shop lock/reroll/next |
| `src/game/constants.ts` | world, zoom, XP curve, stat steps, gem/weapon colors |
| `src/game/createGame.ts` | Phaser.Game with `Scale.FIT` + `CENTER_BOTH` |
| `src/components/game-overlay.tsx` | start / HUD / XP / level-up menu / death / shop + Lock |
| `src/components/game-canvas.tsx` | Phaser host; canvas must not `h-full w-full` (breaks FIT letterbox) |

## Weapons

Orbiting / circling blades are **gone**. Strict 1-to-1.

| Who | Type | Behavior |
|---|---|---|
| Head at start | `single_shot` | nearest enemy in range, 280ms, projectile from **head** xy |
| Shop-grown segment | rolled from `WEAPON_CYCLE` (7 types) | fires only that type from **segment** xy |
| Duplicate buy | merge | existing lowest-tier copy of that type → next tier, no new segment, cap T3 |
| `cone_burst` | | 3–5 spread pellets toward nearest in-range enemy |
| `melee_slash` | | instant arc/cleave graphic, no traveling bullet |
| `mine_layer` | | drops a mine at segment xy; detonates AoE on enemy touch |
| `railgun` | | fast pierce bullet; does not die on first hit |
| `chain_lightning` | | hit nearest, then bolt to next (max 3 hops) |
| `aura` | | garlic ring around the segment; ticks every 0.5s |

## Enemies & waves

Do **not** go back to a single purple chaser. Wave 10 is boss-only.

## Shop locking & merge

Per-slot Lock survives reroll and the next shop. Duplicate weapons merge to T3. Shop also rolls the 6 global stats as `stat_*`.

## Phase 6 economy

Still live. Cyan/yellow/magenta **stars** with white stroke. Head-only collect. Gem gold also grants XP.

## XP, level-up, global stats

Do not rebuild unless asked.

- XP from gem collect + wave-end gem vacuum (`MainScene.grantXp`). Threshold `xpForLevel(level) = round(18 * level^1.5)`.
- Level-up: `fullHeal()` + pause (`leveling`, `physics.world.pause()`), 3 random stats from `rollLevelOffers`. Overlay calls `pickLevelOffer`; scene applies `applyGlobalStat`.
- Stats: Max HP +20, Move speed ×1.12, CDR ×1.12, Damage ×1.15, Pickup radius +1 stack, Armor +2.
