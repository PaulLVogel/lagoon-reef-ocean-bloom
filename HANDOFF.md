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
9. **Flanker** is in the base horde pool (waves 1–4+). **Tangled** overlap penalty is still **not** in this repo. Do not invent Tangled unless named.
10. Push with **full file bodies**. Truncated `PROJECT_CONTEXT.md` previously left GitHub with only section 0. Prefer `gh`/git over pasted API payloads when files are large.
11. `SnakePlayer.areaOfEffect` (default 1) scales mortar blast radius. There is **no** shop/level stat that raises it yet — do not invent one unless asked.

Last shipped: **mortar impact sheet swap** — 8-frame 64×64 fireball (`vs-mortar-boom`). Single-shot hit spark unchanged.
