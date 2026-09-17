# Vampire Snake — live handoff

Phases **1 and 2 are done**. Edit `/workspace/src/game` in place.

## Rules
- Segments: `positionHistory` only (`HISTORY_STRIDE = 7`). Append **only while moving**.
- `SnakePlayer` owns player, trail, weapons. `MainScene` owns dummy, bullets, later enemies.
- HUD/input: `runtime.ts` → `window.__vsRuntime` (do not use zustand).
- Phaser: `import * as Phaser from "phaser"`.

## Phase 2 weapons
| Segment | Type | Behavior |
|---|---|---|
| 0 | blaster | fires along segment facing, 280ms, 6 dmg |
| 1 | turret | aims dummy (later nearest enemy), 420ms, 8 dmg |
| 2 | blade | two orbiting rects, 160ms CD, 5 dmg |

Shots spawn at the segment’s `(x, y)`. `Projectiles.ts` pool. Dummy 100 HP at spawn+(260, -30).

## Next
Phase 3: enemies spawn off-camera, seek head, contact with head **or any segment** damages the player. Point the turret at the nearest enemy.
