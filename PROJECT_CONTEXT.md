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

Last shipped: **per-segment independent targeting** on `main` (each trailing segment is its own party member; shots ignore head aim/location).

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
*   **Segment weapons:** Every trailing segment holds its own `Weapon` (`type`, `fireRate`, `lastFired`). Targeting and firing use **that segment's (x, y)** only. Ignore head position and head facing. Do not retarget from the head.
*   **Modularity:** `SnakePlayer.ts` for player/segment/weapon logic, `MainScene.ts` for enemy spawns, collisions, gems, and wave/death/shop apply.
*   **HUD:** `runtime.ts` → `window.__vsRuntime`. Do not introduce zustand for game state.
*   **Assets:** Phaser geometric shapes only unless PNGs are requested.
*   **Next Wave:** Never `scene.restart()` for shop continue. Death Restart still uses `scene.restart()`.
*   **Gems / pickups:** Head collects only (`collectHead` uses `player.x` / `player.y`). Segments never pick up. Uncollected **gems** vacuum to gold at wave end (health/magnet leftover are discarded). Segment vacuum only *pulls* gems toward the head.

## 4. Implementation Roadmap

### [x] Phase 1: Engine & Movement
Vite + Phaser canvas. `SnakePlayer`. WASD 8-way head. `positionHistory` trail.

### [x] Phase 2: Weapons
`Weapon` interface. Every trailing segment is an independent party member (cycle blaster / turret / blade). Each scans alive enemies from **its own (x, y)** and fires from that point toward its unique nearest target. Head aim/location is ignored. `positionHistory` trail is unchanged.

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
- Freeze: `requestToggleFreeze()` stores `frozenKinds`. Next `rollShop()` rebuilds those 3 via `offersFromKinds` (costs rescale with wave). Reroll disabled while frozen. Buying an offer or Restart clears freeze.
- Priced-out UI: cards gray + `.shop-next-pulse` on Next Wave when nothing is affordable.
- HUD gold: do not overwrite `snap.gold` from the scene while `waveClear` (shop already deducted / rerolled).
- Death Restart zeros gold, `purchaseHistory`, and freeze.
- HUD gold display: `goldDisplay` ticks from the pre-buy value to the ledger with a 300ms Phaser tween (`GOLD_TALLY_MS`) on pick or reroll. Ledger `gold` stays instant for shop math.
- Shop-phase late gems: while `waveClear`, `collectHead` still runs. Gem gold goes to `nextWaveBank` (not `hud.gold`) so shop costs / interest / pity stay stable. Bank dumps into gold at `startNextWave`.
- Credit card (`credit_card`): rare overdraft offer. Always purchasable. Deducts cost even if gold goes negative (red HUD). Grants +2 blaster segments and +18% speed. Once per run. Interest uses `max(0, gold)` so debt earns none.
- Lifetime wealth: `totalGoldEarned` increments on gem collect, vacuum, interest, and pity. Purchases never subtract it. Death overlay shows earned + g/kill efficiency, separate from the spending pool.
