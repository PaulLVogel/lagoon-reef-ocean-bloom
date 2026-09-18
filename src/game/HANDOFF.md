# Vampire Snake — live handoff

Canonical GitHub: https://github.com/PaulLVogel/lagoon-reef-ocean-bloom  
Live Vercel: https://vampire-snake-o34e.vercel.app/

Do **not** use `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app` for new work.

## Future-chat contract

1. Read this file + `PROJECT_CONTEXT.md` first.
2. Implement **only** the phase or bug the user named.
3. Do not rebuild Phases 1–4 or the app shell.
4. Push the changed files to `PaulLVogel/lagoon-reef-ocean-bloom` `main`.
5. Never commit `.vercel/output`.
6. If `src/game` is missing in the App Builder workspace: copy from GitHub `main`. Do not start over.

Phases **1–4 are done** (`main` commit `67dba7b`).

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**.
- `SnakePlayer` owns player, trail, weapons. `MainScene` owns enemies, bullets, wave/death state.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.
- Shapes only. No PNGs unless asked.

## File map
| Path | Owns |
|---|---|
| `src/game/SnakePlayer.ts` | head, segments, weapons, trail |
| `src/game/MainScene.ts` | spawn, collisions, HP, wave timer, death |
| `src/game/Enemy.ts` | purple chasers |
| `src/game/Projectiles.ts` | bullet pool + `clear()` |
| `src/game/runtime.ts` | HUD snap, `requestRestart()` |
| `src/game/constants.ts` | tunables including `WAVE_DURATION_MS` |
| `src/components/game-overlay.tsx` | start / HUD clock / death / wave-clear |

## Phase 2 weapons
| Segment | Type | Behavior |
|---|---|---|
| 0 | blaster | fires along facing, 280ms, 6 dmg |
| 1 | turret | aims nearest enemy, 420ms, 8 dmg |
| 2 | blade | two orbiting rects, 160ms CD, 5 dmg |

## Phase 3
- Spawn outside camera. Cap 28. Contact vs head **or any segment**.
- i-frames 450ms. Death sets `hud.dead`; Restart → `requestRestart()` → `scene.restart()`.

## Phase 4 (live)
- Timer starts when Start is pressed. HUD clock is `mm:ss` (ceil seconds) top-center.
- `WAVE_DURATION_MS = 30000`. Spawn interval lerps `SPAWN_INTERVAL_MS` (850) → `SPAWN_INTERVAL_MIN_MS` (280).
- HUD fields: `waveMs`, `wave` (currently always 1), `waveClear`.
- At 00:00 `endWave()`: destroy enemies, `shots.clear()`, `waveClear = true`, combat off. Player can still idle-move under the overlay.
- Wave-clear overlay currently has **Run another wave** → `requestRestart()` (full scene reset). Death overlay still wins over wave-clear.
- **Phase 5 must not use `scene.restart()` for Next Wave** — that would wipe purchased upgrades. Resume in-place: reset `waveMs`, clear `waveClear`, bump `wave`, resume spawning.

## Next (Phase 5 only, when asked)
Shop overlay **on `hud.waveClear`** (replace the placeholder pause card):
- 3 randomized upgrades (examples: new segment+blaster, turret fire rate, snake speed).
- **Next Wave** button: resume combat, reset 30s timer, resume spawning. Keep HP/kills/loadout.
