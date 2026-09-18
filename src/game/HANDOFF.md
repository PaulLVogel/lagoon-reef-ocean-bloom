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

Last shipped: **split head/segment weapon pools, head inventory, color-coded segments, mine cap + 2s fuse, mortar artillery** (on top of 6-slot shop, lock-carry, level-up weapons).

## Rules

- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**. No Arcade velocity / `moveToObject` / pathfinding on the trail. Greyed-out (0 HP) segments still trail the same way.
- Segment HP: starts at 100 (`segmentMaxHp` grows with Max HP stat). `isActive` false at 0 (no fire, tint `0x555555`). Logic stays; **do not draw floating health bars**. `reviveAll()` / `fullHeal()` restore HP. Dead segments do not take more damage. Head contact damages player HP; segment contact damages that segment only. Armor is flat reduction (`mitigate`, min 1).
- Start loadout: `DEFAULT_SEGMENT_COUNT = 0`. The **head** starts with `single_shot` and can stack more **HEAD WEAPONS** (`aura` / `melee_slash` / `cone_burst` / `single_shot`) without growing segments. Trailing segments only roll **SEGMENT WEAPONS** (`railgun` / `chain_lightning` / `mine_layer` / `single_shot` / `mortar`) at 1-to-1.
- Segment weapons: each trailing **active** segment holds **exactly one** `Weapon`. Targeting and shots use **that origin (x, y)**. Dead segments do not fire. Head weapons all fire from the diamond. No orbiting extras.
- Weapon tiers: `Weapon.tier` is 1–3 (`WEAPON_TIER_CAP`). Duplicate buys `grantWeapon(type, slot)` merge the lowest-tier copy **in that slot**. Mine layer is unique: one segment only; T3 removes it from shop/level pools. Mine cadence **ignores** global CDR (3s, slight tier trim) and mines arm for 2s before colliding.
- Mortar: fires a slow shell at the enemy's **frozen (x, y)**; no contact damage in flight; AoE on impact scales with `SnakePlayer.areaOfEffect`.
