# PROJECT VAMPIRE SNAKE: MASTER CONTEXT DOCUMENT

## 0. How future chats must work

Read this file and `src/game/HANDOFF.md` first. Then do **only** what the user asked this turn.

- Do **not** rebuild Phase 1–6, the drop hook, the collect hook, the Vite/Phaser shell, or the whole game.
- Do **not** invent extra phases, refactors, or new folders unless asked. There is **no named Phase 7** until the user names one.
- Change the smallest set of files that implements the request.
- Push those files to **canonical GitHub** `PaulLVogel/lagoon-reef-ocean-bloom` branch **`main`**.
- Vercel project `vampire-snake-o34e` auto-builds from that `main`. Live: https://vampire-snake-o34e.vercel.app/
- Never commit `.vercel/output`.
- Never push new work to `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app`. That prototype is **stale**.

Last shipped: **6-slot multi-buy shop, lock carries the exact offer, level-up can grant weapons** (on top of XP/full heal, 6 global stats, mine/rail/chain/aura, star gems, FIT zoom, 1:1 merge, wave-10 boss).

Keep this file and `src/game/HANDOFF.md` in lockstep when shipping. Full rules live in root `HANDOFF.md`.

## Live additions after Phase 6

- XP: gem gold + vacuum → `MainScene.grantXp`. Curve `round(18 * level^1.5)`.
- Level-up: full heal, pause combat, 3 random picks from **6 stats + 7 weapons** (`src/game/stats.ts`). `pickLevelOffer` may call `grantWeapon`.
- Global stats on `SnakePlayer.applyGlobalStat`: max HP, speed, CDR, damage, pickup radius, armor.
- Weapons in `WEAPON_CYCLE`: single, cone, melee, mine, rail, chain, aura. Still 1-to-1 + T1–T3 merge.
- Gems are white-stroke stars (cyan / yellow / magenta).
- Shop: `SHOP_SLOTS = 6`. Lock copies the offer onto `heldOffers[i]`; next shop must keep those objects. Buys append `shopBought` + `pendingBuys`; shop stays open until Next Wave.
