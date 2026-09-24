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

Last shipped: **Goblin Fighter on grunt** (second-easiest horde). 4×16×16 walk strip (`vs-goblin` / `goblinAsset.ts`). Shop cart + Buy vs Next Wave unchanged. Swarmer Death Slime + 8×64 mortar boom unchanged.

### 0.1 GitHub merge / push rules (do not skip)

- **Canonical:** `PaulLVogel/lagoon-reef-ocean-bloom` branch `main`. Live: https://vampire-snake-o34e.vercel.app/
- **Never** `PaulLVogel/vampire-snake`. **Never** commit `.vercel/output`.
- Shop cart: `pickShopOffer` toggles `shopCart`. `requestBuyCart` commits the cart into `shopBought` + `pendingBuys`. `requestNextWave` starts the wave and **drops** unbought cart items. `MainScene.update` (wave-clear branch) **must drain the whole `pendingBuys` queue** each frame, then fall back to `pendingUpgrade` if empty. Do not fold Buy into Next Wave.
- Pity uses `!(bucket.shopBought?.length)`, not cart length or `!shopPicked`.
- `heldOffers()` copies `bucket.heldOffers[i]` first, then locked unbought `shopOffers[i]`.
- **Flanker** is in the base spawn pool. **Tangled** is still **not** in this codebase.
- `areaOfEffect` exists on `SnakePlayer` (default 1) and scales mortar AoE. No shop/level card raises it yet.
- Mortar impact is the **8×64×64** fireball (`vs-mortar-boom`). Never restore the 10-frame 128×80 sheet.
- When pushing: send **entire** files. Prefer `gh` clone + copy + `git push` for large sources. Truncated API payloads previously shipped only section 0 of this file.
- After shipping: keep this file and `src/game/HANDOFF.md` in lockstep, then copy both into `artifacts/` **and** `artifacts/lagoon-reef-ocean-bloom/` **and** `src/game/HANDOFF.md`.

### 0.2 Files that own the weapon overhaul

| Path | Role |
|---|---|
| `src/game/Weapon.ts` | HEAD/SEGMENT pools, mortar, `WeaponSlot`, mine cadence, colors |
| `src/game/constants.ts` | gold head, mortar/rail/chain colors, **MORTAR_FX_*** 64×64×8 @ 12fps, **SHOT_HIT_***, **GOBLIN_*** / **SLIME_*** |
| `src/game/stats.ts` | level offers with `weaponSlot`, mine T3 exclude |
| `src/game/shop.ts` | `add_head_weapon` vs `add_blaster`, mine T3 filter, slot labels |
| `src/game/runtime.ts` | `pendingWeaponSlot` + `pendingBuys` queue |
| `src/game/SnakePlayer.ts` | gold diamond, head inventory (negative `segmentIndex`), colored segments, mine CDR ignore, mortar freeze |
| `src/game/MainScene.ts` | mine 2s fuse, mortar shells + `playMortarExplosion`, **pendingBuys drain**, shop apply with slot |
| `src/game/mortarExplosionAsset.ts` | 8×64 fireball data URI (`MORTAR_EXPLOSION_URL`) |
| `src/game/shotHitAsset.ts` | 5×32 single-shot spark data URI (`SHOT_HIT_URL`) |
| `src/components/game-overlay.tsx` | Head Upgrade / New Segment badges |

Keep this file and `src/game/HANDOFF.md` in lockstep when shipping.

## Enemies (current)

Dynamic pool `allowedEnemyTypes(wave)`: swarmer / grunt / flanker from wave 1; armored_brute at 5; charger at 11; siege at 15. Boss on every `wave % 10 === 0` via living-boss check (not a sticky `wave === 10` flag). Era `floor((wave-1)/10)` multiplies horde HP/contact and boss stats. Swarmer uses Death Slime (`vs-slime`). Grunt (second-easiest) uses Goblin Fighter (`vs-goblin`, `goblinAsset.ts`).
