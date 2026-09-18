# PROJECT VAMPIRE SNAKE: MASTER CONTEXT DOCUMENT

## 0. How future chats must work

Read this file and `src/game/HANDOFF.md` first. Then do **only** what the user asked this turn.

- Do **not** rebuild Phase 1–4, the Vite/Phaser shell, or the whole game.
- Do **not** invent extra phases, refactors, or new folders unless asked.
- Change the smallest set of files that implements the request.
- Push those files to **canonical GitHub** `PaulLVogel/lagoon-reef-ocean-bloom` branch **`main`**.
- Vercel project `vampire-snake-o34e` auto-builds from that `main`. Live: https://vampire-snake-o34e.vercel.app/
- Never commit `.vercel/output`. A frozen output folder ships an old build and ignores source.
- Never push new work to `PaulLVogel/vampire-snake` or `vampire-snake.vercel.app`.

If `src/game` is missing in the workspace: copy from GitHub `main`. Do not start over.

Last shipped: **Phase 4** on `main` (`67dba7b`). Next named work is **Phase 5 (shop)**.

## 1. Core Vision
A browser-based arena survival game combining *Vampire Survivors* (auto-firing weapons, hordes of enemies), *Brotato* (30-second timed waves, between-round shop phases), and *Snake* (player is a head with trailing body segments, where weapons are attached to the segments).

## 2. Tech Stack
*   **Engine:** Phaser 3
*   **Environment:** Vite + TypeScript (TanStack Start wrapper in this repo)
*   **Canonical GitHub:** https://github.com/PaulLVogel/lagoon-reef-ocean-bloom
*   **Live Vercel:** https://vampire-snake-o34e.vercel.app/

## 3. Strict Technical Rules (AI Directives)
*   **Segment Movement:** Segments MUST NOT use Arcade Physics velocity, `moveToObject`, or pathfinding to follow the head. They must strictly follow the head using a `positionHistory` array updated every frame. Segment N is N×`HISTORY_STRIDE` frames behind the head. Append history **only while moving**.
*   **Modularity:** `SnakePlayer.ts` for player/segment/weapon logic, `MainScene.ts` for enemy spawns, collisions, and wave/death state.
*   **HUD:** `runtime.ts` → `window.__vsRuntime`. Do not introduce zustand for game state.
*   **Assets:** Phaser geometric shapes only unless PNGs are requested.

## 4. Implementation Roadmap

### [x] Phase 1: Engine & Movement
Vite + Phaser canvas. `SnakePlayer`. WASD 8-way head. `positionHistory` trail.

### [x] Phase 2: Weapons
`Weapon` interface. Seg 0 blaster / 1 turret / 2 blades. Shots originate at that segment.

### [x] Phase 3: Enemy Swarm
`Enemy` class. Spawn outside camera. Chase head. Contact vs head or any segment. Death overlay + Restart (`scene.restart()`).

### [x] Phase 4: Wave Timer
30s HUD clock. Spawn rate ramps 850ms → 280ms. At 00:00 despawn enemies, clear projectiles, pause (`waveClear`). Placeholder overlay + “Run another wave” (full restart) until Phase 5.

### [ ] Phase 5: The Shop Phase
On `hud.waveClear`, replace the pause card with a Shop overlay. Offer 3 randomized upgrades (e.g. “Add new segment with Blaster”, “Increase Turret fire rate”, “Increase snake speed”). **Next Wave** resumes combat in-place (do not `scene.restart()`), resets the 30s timer, resumes spawning, keeps HP/kills/loadout.

### [ ] Phase 6: Economy & EXP
Enemies drop colored EXP gems. Head (not segments) collects. Gems convert to shop currency.

## 5. Phase 4 hook points (for Phase 5)
- Flag: `MainScene.waveClear` / `HudSnap.waveClear`.
- Timer reset: set `waveMs = WAVE_DURATION_MS` (30000) in `constants.ts`.
- Overlay: `src/components/game-overlay.tsx` wave-clear branch.
- Restart today wipes the run (`requestRestart` → `scene.restart()`). Next Wave must be a new runtime method that only unpauses the existing scene.
