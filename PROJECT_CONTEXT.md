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

Last shipped: **Infinite train + head multi-shot** — segment weapons always append a new car (no merge, no mine cap, no length cap). Head weapons still merge to T3 and scale multi-shot / cone pellets / slash fans. Shop and level-up always keep segment cards in the pool. Mines stay 2s fuse + 3s cadence per car.

### 0.3 Segment / hostile physics (do not regress)

Phaser **does not** watch a native JS array after `physics.add.overlap` is created. Binding overlap to `player.segments` while it is empty ignores later `push`. Always use groups:

- `SnakePlayer.segmentGroup = scene.physics.add.group({ allowGravity: false, immovable: true })` in the constructor.
- `spawnSegment`: `physics.add.existing(container)`, `setCircle(SEGMENT_RADIUS)`, `setOffset(-r,-r)`, `body.moves = false`, `container.setData("segIndex", i)`, **`segmentGroup.add(container)`**.
- `layoutSegments`: after `setPosition`, **`(body).updateFromGameObject()`** — `body.reset` is not enough for containers moved by `positionHistory`.
- `MainScene.create`: `foes` group + `hostileGroup`. Overlap `foes` ↔ `segmentGroup` (`kind: "contact"`). Overlap `hostileGroup` ↔ `segmentGroup` (`kind: "shot"`) with process callback that returns false when the car is dead (`!isActive || hp <= 0`) so shots pass through dead weight.
- `spawnHostile` (in `mainSceneRestB.ts`): enable body, `setCircle(6)`, tag `hostileShot` / `hostileDamage`, **`hostileGroup.add(gfx)`**. Tick: move by vx/vy then `updateFromGameObject`.
- `handleSegmentDamage` lives on restB proto (class method is a stub overwritten at install). Shot branch: `damageSegment` then `destroy()` the ball. Dead cars return immediately and must **not** eat the projectile.
- `tickHostiles` keeps a distance fallback vs living segments so a missed Arcade frame still pops the ball.
- Dead-weight speed: `SnakePlayer.deadWeightMul()` (`max(0.55, 1 - dead*0.08)`) applied in `update` while moving. Grey-out tint `0x555555`. No floating HP bars.
- Do **not** put Arcade velocity / `moveToObject` / pathfinding on the trail.

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
- **Infinite train (do not regress):** segment buys always `addArmedSegment`. Never merge trailing weapons. Never cap length. Never exclude `mine_layer` from shop/level pools. Head-only merge + multi-shot (T1/T2/T3 = 1/2/3 shots, cone 3/6/9, slash fans). Mine: 2s fuse + fixed 3s cadence per car.

### 0.2 Files that own the weapon overhaul

| Path | Role |
|---|---|
| `src/game/Weapon.ts` | HEAD/SEGMENT pools, mortar, `WeaponSlot`, mine cadence, colors |
| `src/game/constants.ts` | gold head, mortar/rail/chain colors, **MORTAR_FX_*** 64×64×8 @ 12fps, **SHOT_HIT_***, **GOBLIN_*** / **SLIME_*** |
| `src/game/stats.ts` | level offers with `weaponSlot`; segment weapons always in pool |
| `src/game/shop.ts` | `add_head_weapon` vs `add_blaster`; no length cap; segment cards always append |
| `src/game/runtime.ts` | `pendingWeaponSlot` + `pendingBuys` queue |
| `src/game/SnakePlayer.ts` | gold diamond, head inventory + head merge/multi-shot, trail always-append, mine cadence |
| `src/game/MainScene.ts` | mine 2s fuse, mortar shells + `playMortarExplosion`, **pendingBuys drain**, shop apply with slot |
| `src/game/mortarExplosionAsset.ts` | 8×64 fireball data URI (`MORTAR_EXPLOSION_URL`) |
| `src/game/shotHitAsset.ts` | 5×32 single-shot spark data URI (`SHOT_HIT_URL`) |
| `src/components/game-overlay.tsx` | Head Upgrade / New Segment badges |

Keep this file and `src/game/HANDOFF.md` in lockstep when shipping.

## Enemies (current)

Dynamic pool `allowedEnemyTypes(wave)`: swarmer / grunt / flanker from wave 1; armored_brute at 5; charger at 11; siege at 15. Boss on every `wave % 10 === 0` via living-boss check (not a sticky `wave === 10` flag). Era `floor((wave-1)/10)` multiplies horde HP/contact and boss stats. Swarmer uses Death Slime (`vs-slime`). Grunt (second-easiest) uses Goblin Fighter (`vs-goblin`, `goblinAsset.ts`).
