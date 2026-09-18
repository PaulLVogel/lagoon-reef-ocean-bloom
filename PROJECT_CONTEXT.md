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

Last shipped: **split head/segment weapon pools, head inventory, color-coded segments, mine cap + 2s fuse, mortar artillery** (on top of XP/full heal, 6 global stats, mine/rail/chain/aura, star gems, FIT zoom, 1:1 merge, wave-10 boss).

Keep this file and `src/game/HANDOFF.md` in lockstep when shipping. Copy both into:

- `artifacts/PROJECT_CONTEXT.md`
- `artifacts/HANDOFF.md`
- `artifacts/lagoon-reef-ocean-bloom/PROJECT_CONTEXT.md`
- `artifacts/lagoon-reef-ocean-bloom/HANDOFF.md`
- `artifacts/lagoon-reef-ocean-bloom/src/game/HANDOFF.md`

so the next chat can read them if the workspace is a fresh scaffold.
