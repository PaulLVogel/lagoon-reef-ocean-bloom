# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

Last shipped: **infinite eras + recurring bosses** — boss on every `wave % 10 === 0`, era `floor((wave-1)/10)` multiplies horde HP/dmg/spawn, boss HP/contact/shots scale by era, killing the boss ends the wave and opens shop. Flanker is still not in the repo. Bard head spritesheet (`BARD_SHEET`) is live on GitHub — do not drop those constants.

## Era / boss rules
- `isBossWave`: `wave > 0 && wave % BOSS_WAVE === 0`.
- `eraIndex`: `floor((wave-1)/10)` — 0 on waves 1–10, 1 on 11–20.
- Horde HP/contact: `(1+(wave-1)*0.18 or 0.1) * ERA_HORDE_MUL^era` (1.75).
- Spawn interval also divides by `ERA_SPAWN_MUL^era` (1.35).
- Boss HP/contact: linear wave curve times `ERA_BOSS_HP_MUL^era` (2.1) / `ERA_BOSS_DMG_MUL^era` (1.65). Shots scale with contact.
- Kill-boss: gem dump + `endWave()` so shop opens. Timer still ends the wave if the boss lives.
- Do not invent Flanker.
