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

8. Shop cart is live. 9. Flanker in pool; no Tangled. 10. Push full files. 11. `areaOfEffect` default 1, no shop card. 12. Mortar boom 8×64×64. 13. Swarmer = Death Slime; grunt = Goblin Fighter.
14. **Segment physics:** overlap `player.segmentGroup` (never the empty `segments` array). After trail layout and after moving a hostile, `body.updateFromGameObject()`. `spawnHostile` must `physics.add.existing`, `setCircle(6)`, and `hostileGroup.add`. Dead cars do not take shot damage and do not destroy the red ball.

Last shipped: **Siege/boss shots vs trail** (`a21498e`). Vercel READY. See root `HANDOFF.md` for full rules, file map, shop, Phase 6, XP.
