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

Last shipped: **Goblin Fighter grunt sprite** — 4×16×16 walk strip on `grunt` (second-easiest horde after Death Slime swarmers). Sheet key `vs-goblin` via `goblinAsset.ts` (`GOBLIN_URL`). Shop cart + Buy vs Next Wave unchanged. Swarmer Death Slime and 8×64 mortar boom unchanged.
