# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

Read root `HANDOFF.md` + `PROJECT_CONTEXT.md` for the full contract. Last shipped: **Siege/boss shots vs trail** (`a21498e`). Overlap `player.segmentGroup` (never the empty `segments` array). `spawnHostile` enables Arcade `setCircle(6)` and `hostileGroup.add`. After layout/move call `updateFromGameObject()`. Dead cars pass shots through. Never commit `.vercel/output`. Never use `PaulLVogel/vampire-snake`.
