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

Last shipped: **6-slot shop that stays open after buys, lock carries the exact offer into the next shop, level-up pool includes the 7 weapons** (on top of XP/full heal, 6 global stats, mine/rail/chain/aura, star gems).

## Rules

- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail.
- Next Wave must not `scene.restart()`. Death Restart still does.
- Pickups: head only. See root `HANDOFF.md` for the full file map, weapon table, shop lock rules, and XP curve.

Shop: 6 slots, lock stores the exact offer on `heldOffers`, multi-buy via `shopBought` + `pendingBuys`, close only on Next Wave. Level-up pool = 6 stats + 7 weapons.
