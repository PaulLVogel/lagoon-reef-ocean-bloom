# PROJECT VAMPIRE SNAKE: MASTER CONTEXT DOCUMENT

## 0. How future chats must work

Read this file and `src/game/HANDOFF.md` first. Then do **only** what the user asked this turn.

- Do **not** rebuild Phase 1–6, the drop hook, the collect hook, the Vite/Phaser shell, or the whole game.
- Do **not** invent extra phases, refactors, or new folders unless asked. There is **no named Phase 7** until the user names one.
- Change the smallest set of files that implements the request.
- Push those files to **canonical GitHub** `PaulLVogel/lagoon-reef-ocean-bloom` branch **`main`**.
- Vercel project `vampire-snake-o34e` auto-builds from that `main`. Live: https://vampire-snake-o34e.vercel.app/
- Never commit `.vercel/output`. A frozen output folder ships an old build and ignores source.
- Never push new work to `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app`. That prototype is **stale**.

If `src/game` is missing in the App Builder workspace: copy from GitHub `main` (or `artifacts/lagoon-reef-ocean-bloom/src/game`). Do not start over.

Last shipped: **halfling bard as the snake head** (16×16 × 4 walk, nearest-neighbor ×3) on top of the weapon-pool overhaul (`main`).

### 0.1 GitHub merge / push rules (do not skip)

- **Canonical:** `PaulLVogel/lagoon-reef-ocean-bloom` branch `main`. Live: https://vampire-snake-o34e.vercel.app/
- **Never** `PaulLVogel/vampire-snake`. **Never** commit `.vercel/output`.
- Shop can buy **multiple** cards before Next Wave. `runtime.pickShopOffer` queues `pendingBuys`. `MainScene.update` (wave-clear branch) **must drain the whole queue** each frame, then fall back to `pendingUpgrade` if empty. Overwriting GitHub `MainScene` with a single-buy apply **drops purchases**.
- Pity uses `!(bucket.shopBought?.length)`, not `!shopPicked`.
- `heldOffers()` copies `bucket.heldOffers[i]` first, then locked unbought `shopOffers[i]`.
- **Flanker** and **Tangled** are **not** in this codebase. Do not add them unless the user names them as a new feature.
- `areaOfEffect` exists on `SnakePlayer` (default 1) and scales mortar AoE. No shop/level card raises it yet.
- When pushing: send **entire** files. Prefer `gh` clone + copy + `git push` for large sources. Truncated API payloads previously shipped only section 0 of this file.
- After shipping: keep this file and `src/game/HANDOFF.md` in lockstep, then copy both into `artifacts/` **and** `artifacts/lagoon-reef-ocean-bloom/` **and** `src/game/HANDOFF.md`.

### 0.2 Files that own the weapon overhaul

| Path | Role |
|---|---|
| `src/game/Weapon.ts` | HEAD/SEGMENT pools, mortar, `WeaponSlot`, mine cadence, colors |
| `src/game/constants.ts` | gold/head colors, mortar/rail/chain colors, bard sheet / scale |
| `src/game/stats.ts` | level offers with `weaponSlot`, mine T3 exclude |
| `src/game/shop.ts` | `add_head_weapon` vs `add_blaster`, mine T3 filter, slot labels |
| `src/game/runtime.ts` | `pendingWeaponSlot` + `pendingBuys` queue |
| `src/game/SnakePlayer.ts` | bard head sprite, head inventory (negative `segmentIndex`), colored segments, mine CDR ignore, mortar freeze |
| `src/game/MainScene.ts` | preload bard sheet, mine 2s fuse, mortar shells, **pendingBuys drain**, shop apply with slot |
| `src/components/game-overlay.tsx` | Head Upgrade / New Segment badges |

Keep this file and `src/game/HANDOFF.md` in lockstep when shipping. Copy both into:

- `artifacts/PROJECT_CONTEXT.md`
- `artifacts/HANDOFF.md`
- `artifacts/lagoon-reef-ocean-bloom/PROJECT_CONTEXT.md`
- `artifacts/lagoon-reef-ocean-bloom/HANDOFF.md`
- `artifacts/lagoon-reef-ocean-bloom/src/game/HANDOFF.md`

so the next chat can read them if the workspace is a fresh scaffold.

## 1. Core Vision
A browser-based arena survival game combining *Vampire Survivors* (auto-firing weapons, hordes of enemies), *Brotato* (30-second timed waves, between-round shop phases), and *Snake* (player is a head with trailing body segments, where weapons are attached to the segments).

## 2. Tech Stack
*   **Engine:** Phaser 3 (`import * as Phaser from "phaser"`)
*   **Environment:** Vite + TypeScript (TanStack Start wrapper in this repo)
*   **Canonical GitHub:** https://github.com/PaulLVogel/lagoon-reef-ocean-bloom
*   **Live Vercel:** https://vampire-snake-o34e.vercel.app/

## 3. Strict Technical Rules (AI Directives)
*   **Segment Movement:** Segments MUST NOT use Arcade Physics velocity, `moveToObject`, or pathfinding to follow the head. They must strictly follow the head using a `positionHistory` array updated every frame. Segment N is N×`HISTORY_STRIDE` frames behind the head (`HISTORY_STRIDE = 7`). Append history **only while moving**.
*   **Segment HP:** Each trailing segment has its own `hp` / `maxHp` (100) and `isActive`. At 0 HP it greys out (`setTint(0x555555)`) and stops firing, but **still follows `positionHistory`**. **Do not draw floating health bars** (logic stays). Enemies pass through dead segments without further damage. `reviveAll()` at wave end restores HP, tint, and firing. Head contact still damages player HP; segment contact damages that segment only.
*   **Weapons:** Two pools. **HEAD** (`aura` / `melee_slash` / `cone_burst` / `single_shot`) stack on the **halfling bard head** via `grantWeapon(type, "head")` — no new segment. The head graphic is the user-supplied bard sheet (`public/sprites/halfling-bard.png`, 16×16 × 4, integer scale 3, nearest-neighbor). Sheet faces left; flip when moving right. Pickup ring stays a circle. **SEGMENT** (`railgun` / `chain_lightning` / `mine_layer` / `single_shot` / `mortar`) stay 1-to-1 on the trail. Head starts with `single_shot`. Dead segments cannot attack. Duplicates merge in **that slot** (tier 1–3). **Mine layer:** only one segment; T3 removes it from shop/level pools; cadence ignores global CDR (~3s); 2s arming fuse. **Mortar:** slow shell to a frozen (x,y), no travel damage, AoE on impact × `player.areaOfEffect`. Segment tint follows equipped weapon. Shop/level cards label **Head Upgrade** vs **New Segment**. Global stats use `SnakePlayer.applyGlobalStat`. Shop stat items still call `applyItemModifier`.
*   **Assets:** Phaser geometric shapes, **plus** the bard spritesheet (user-requested PNG). Do not swap that sheet unless asked.
*   **Scale / camera:** `createGame` uses `Phaser.Scale.FIT` + `CENTER_BOTH` at 1280×720. Mobile zoom is `MOBILE_ZOOM` (`2/3`) on `cameras.main` only. HUD/shop/HP/gold live in `game-overlay.tsx` (DOM) and must ignore camera zoom.
*   **Enemies:** Three tiers (`swarmer` / `grunt` / `brute`) plus wave-10 `boss`. Do not collapse back to one purple chaser. HP/damage/spawn rate scale with wave. Wave 10 stops normal spawns and spawns one boss.
*   **Enemy chase:** Enemies seek the **nearest** head or segment (including greyed-out body), not only the head.
*   **Modularity:** `SnakePlayer.ts` for player/segment/weapon logic, `MainScene.ts` for enemy spawns, collisions, gems, and wave/death/shop apply.
*   **HUD:** `runtime.ts` → `window.__vsRuntime`. Do not introduce zustand for game state.
*   **Next Wave:** Never `scene.restart()` for shop continue. Death Restart still uses `scene.restart()`.
*   **Gems / pickups:** Head collects only (`collectHead` uses `player.x` / `player.y`). Segments never pick up. Uncollected **gems** vacuum to gold at wave end (health/magnet leftover are discarded). Segment vacuum only *pulls* gems toward the head.

## 4. Implementation Roadmap

### [x] Phase 1: Engine & Movement
Vite + Phaser canvas. `SnakePlayer`. WASD 8-way head. `positionHistory` trail.

### [x] Phase 2: Weapons
`Weapon` interface. Exactly one weapon per trailing segment (`single_shot` / `cone_burst` / `melee_slash`). Each scans alive enemies from **its own (x, y)** and fires only if the closest enemy is inside `baseRange * rangeMultiplier`. Head aim/location is ignored. No orbiting blades. `positionHistory` trail is unchanged. `applyItemModifier` is the shop/item hook.

### [x] Phase 3: Enemy Swarm
`Enemy` class. Spawn outside camera. Chase head. Contact vs head or any segment. Death overlay + Restart (`scene.restart()`).

### [x] Phase 4: Wave Timer
30s HUD clock. Spawn rate ramps 850ms → 280ms. At 00:00 despawn enemies, clear projectiles, pause (`waveClear`).

### [x] Phase 5: The Shop Phase
On `hud.waveClear`, Shop overlay with 3 randomized upgrades. Pick one (applies in-place). **Next Wave** via `requestNextWave()` — resets 30s timer, bumps `wave`, resumes spawning. Keeps HP/kills/loadout. Does **not** `scene.restart()`.

### [x] Phase 6: Economy & EXP + drop hook + collect hook
Enemies drop green / blue / red gems (1 / 5 / 10) by `maxHp`. Head-only pickup. Pop scatter on spawn. 5% health pack (red square, `player.heal(10)`). 3% magnet (purple diamond, live gems fly to the head). Leftover gems vacuum to gold at 00:00. Gold is shop currency. Offers have costs (scale with wave). Leftover gold carries. Death Restart zeros gold. If nothing is affordable, Next Wave is allowed without a pick.

Collect hook: pickup radius larger than head hitbox (shop `pickup_radius`), high-tier `segment_vacuum` pulls gems toward the head, floating `+N` + synth blip on pickup, Fever x2 after >10 gems in 2s.

## 5. Phase 6 hook points (do not reimplement unless asked)
- Drops: `src/game/Gems.ts` spawned from `MainScene.applyEnemyHit` via `spawnFromKill(x, y, e.maxHp)`.
- Collect: `gems.collectHead(player.x, player.y, dt, opts)` — returns `{ gold, heal, magnet, events }`. Head only.
- Pickup radius: `player.pickupRadius` (`PICKUP_RADIUS_BASE` + stacks of `PICKUP_RADIUS_STEP`). Larger than `HEAD_RADIUS`. Shop `pickup_radius` / Wide maw.
- Segment vacuum: shop `segment_vacuum` / Coil vacuum. Gems near a segment fly toward the **head**. Segments still do not collect.
- Pop: `GEM_POP = 50`, `GEM_DRAG = 8` on the gem pool (not the snake).
- Heal: `SnakePlayer.heal(amount)` on health-pack pickup; MainScene caps HP at 100.
- Magnet: `Gems.activateMagnet()` flies live gems to the head.
- Feedback: `floatPickup` 500ms + WebAudio sine blip in `MainScene`.
- Fever: >10 gem pickups in `COMBO_WINDOW_MS` (2000). Subsequent gems ×2 until `feverUntil` elapses (refreshed by further Fever-window picks). HUD `fever` / `combo`.
- Shop cost: `ShopOffer.cost`; `pickShopOffer` deducts `hud.gold` and appends `kind` to `purchaseHistory`.
- Repeat buy: `scaledOfferCost` = `round(base * 1.5^purchasesOf(kind) * waveScale)`.
- Reroll: shop button, flat `SHOP_REROLL_COST` (5g). `requestReroll()` deducts gold, MainScene `rollShop()` rolls 3 new offers. Disabled after a pick or if gold < 5.
- Rarity: Common 70% / Rare 25% / Legendary 5%. Legendary cards use `.shop-legend` glow. New legendary `add_2_blasters`.
- Interest: leftover gold (after buy or skip) gets `bankInterest` = `floor(gold * 0.1)` in `startNextWave`. Next Wave is allowed without a pick so players can bank.
- Skip: `requestNextWave` allowed during shop even if offers are affordable (tactical bank path).
- Pity: if `canAffordAny` is false and the player skips without a pick, `startNextWave` heals `SHOP_PITY_HP` (10, cap 100) and adds `SHOP_PITY_GOLD` (2) after interest. HUD `lastPityHp` / `lastPityGold`.
- Freeze (legacy): `requestToggleFreeze()` still exists but the live UI is **per-slot** Lock (`requestToggleSlotLock(index)`, `slotLocked[]`). Reroll and next shop keep locked cards; unlocked slots re-roll. Buying a card unlocks that slot only.
- Enemy HP: tiers in `Enemy.ts` (`ENEMY_BASE`) × `waveHpMul` — do not revert to `ENEMY_HP + (wave-1)*6`.
- Priced-out UI: cards gray + `.shop-next-pulse` on Next Wave when nothing is affordable.
- HUD gold: do not overwrite `snap.gold` from the scene while `waveClear` (shop already deducted / rerolled).
- Death Restart zeros gold, `purchaseHistory`, and freeze.
- HUD gold display: `goldDisplay` ticks from the pre-buy value to the ledger with a 300ms Phaser tween (`GOLD_TALLY_MS`) on pick or reroll. Ledger `gold` stays instant for shop math.
- Shop-phase late gems: while `waveClear`, `collectHead` still runs. Gem gold goes to `nextWaveBank` (not `hud.gold`) so shop costs / interest / pity stay stable. Bank dumps into gold at `startNextWave`.
- Credit card (`credit_card`): rare overdraft offer. Always purchasable. Deducts cost even if gold goes negative (red HUD). Grants two `grantWeapon` rolls and +18% speed. Once per run. Interest uses `max(0, gold)` so debt earns none.
- Lifetime wealth: `totalGoldEarned` increments on gem collect, vacuum, interest, and pity. Purchases never subtract it. Death overlay shows earned + g/kill efficiency, separate from the spending pool.

## 6. Live systems after Phase 6 (do not rebuild unless asked)

These shipped on `main` `ef12c07`. Treat as current truth.

### Mobile / camera
- `src/game/createGame.ts`: `scale.mode = Phaser.Scale.FIT`, `autoCenter = CENTER_BOTH`, size 1280×720.
- `MainScene.fitZoom()`: desktop `setZoom(1)`; mobile `setZoom(2/3)` when `gameSize.width < 820` or portrait width `< 1100`.
- Overlay HUD is React DOM (`game-overlay.tsx`) — never parent HUD graphics to the world camera.
- `game-canvas.tsx` must not force canvas `h-full w-full` (that fights FIT letterboxing).

### Weapons / start / bars
- Head is the **halfling bard** (`public/sprites/halfling-bard.png`). 16×16, 4-frame walk, scale 3, nearest-neighbor. Starts with `single_shot`. Additional **HEAD** weapons (`aura` / `melee_slash` / `cone_burst` / `single_shot`) stack on the head via `grantWeapon(type, "head")`.
- Pickup ring stays circular (container is not rotated). Sheet faces left; `flipX` when facing right.
- **SEGMENT** weapons (`railgun` / `chain_lightning` / `mine_layer` / `single_shot` / `mortar`) are 1-to-1. `grantWeapon(type, "segment")` merges that slot or grows a segment.
- Unique negative `segmentIndex` for each head gun so `tickWeapons` fires all of them.
- Segment body tint: red rail, cyan lightning, gray mine, green mortar, yellow single shot.
- Segment HP bars stay `setVisible(false)`.

### Extra weapons
- `mine_layer`: one segment only. Cadence ignores CDR (~3s). 2s grey→red fuse before collision. T3 drops from shop/level pools.
- `railgun`: piercing bullet (`FireEvent.pierce`).
- `chain_lightning`: up to 3 bolts to nearest unused enemies.
- `aura`: persistent ring on the **head** when bought as a Head Upgrade.
- `mortar`: slow shell to frozen enemy (x,y); no travel damage; AoE on impact × `areaOfEffect`.

### Shop
- `rollShopOffers(wave, segments, owned, history, held)` — `held[i]` is the locked `ShopOffer` or `null`. Pass `mineTier` / slot-aware `canMerge`.
- Overlay: Lock button per card; "Reroll unlocked"; **Head Upgrade** vs **New Segment** badges.
- Multi-buy: `pendingBuys` queue + `pendingWeaponType` + `pendingWeaponSlot`. `MainScene` drains the queue each shop frame.
- Catalog: `add_head_weapon` and `add_blaster` plus 6 global stats.

### Enemies
- `Enemy` takes an `EnemySpec` (`kind`, radius, hp, speed, contact, color).
- Wave 10: `tickSpawns` only `spawnBoss()` once. Boss `tickBoss` returns hostile shots; `MainScene.spawnHostile` / `tickHostiles` hurt the head.

### XP / level-up (do not rebuild unless asked)
- Gem gold value (and wave-end gem vacuum) grants XP in `MainScene.grantXp`.
- `xpNextLevel = round(18 * level^1.5)`.
- On level: `fullHeal()` head + segments, pause combat (`leveling` + `physics.world.pause()`), DOM menu of 3 random picks from **6 stats + head weapons + segment weapons** (`rollLevelOffers` / `pickLevelOffer`). Mine T3 is excluded.
- HUD: `playerLevel`, `xp`, `xpNextLevel`, `leveling`, `levelOffers`.

### Global stats
Owned on `SnakePlayer`: `headMaxHp`, `segmentMaxHp`, `speed`, `cooldownMul`, `damageMul`, `pickupBonus`, `armor`, `areaOfEffect`. Armor is flat reduction (`mitigate`, min 1) on head and segment hits.

### Gems
Star polygons (`scene.add.star`) in cyan / yellow / magenta with white stroke. Still head-only collect.

