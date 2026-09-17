# PROJECT VAMPIRE SNAKE: MASTER CONTEXT DOCUMENT

## 1. Core Vision
A browser-based arena survival game combining *Vampire Survivors* (auto-firing weapons, hordes of enemies), *Brotato* (30-second timed waves, between-round shop phases), and *Snake* (player is a head with trailing body segments, where weapons are attached to the segments).

## 2. Tech Stack
*   **Engine:** Phaser 3
*   **Environment:** Vite + TypeScript
*   **Deployment:** Vercel (Target)

## 3. Strict Technical Rules (AI Directives)
*   **Segment Movement:** Segments MUST NOT use Arcade Physics velocity, `moveToObject`, or pathfinding to follow the head. They must strictly follow the head using a `positionHistory` array updated every frame. Segment 1 reads `X` frames behind the head, Segment 2 reads `2X` frames behind, etc. This prevents clumping when the player stops moving.
*   **Modularity:** Keep game logic cleanly separated (e.g., `SnakePlayer.ts` for player/segment/weapon logic, `MainScene.ts` for enemy spawns, collisions, and state).
*   **Assets:** Use Phaser's built-in geometric shapes (circles/rectangles with hex colors) for all entities. Do not load external PNGs unless explicitly requested.

## 4. Implementation Roadmap

### [x] Phase 1: Engine & Movement 
*   Setup Vite + Phaser 3 canvas.
*   Implement `SnakePlayer` class.
*   WASD 8-directional movement for the Head.
*   `positionHistory` array implementation for trailing body segments.

### [ ] Phase 2: Weapon Systems & Combat Validation
*   Define a `Weapon` interface (type, fireRate, lastFired).
*   Attach specific weapons to specific segments (e.g., Seg 1 = straight blaster, Seg 2 = auto-aim turret, Seg 3 = orbiting blade).
*   Weapons must originate from their respective segment's `(x, y)` coordinates.
*   Add a stationary target dummy and projectile collision logic to verify damage.

### [ ] Phase 3: Enemy Swarm AI
*   Create an `Enemy` class/group in `MainScene`.
*   Spawn enemies at random coordinates outside the current camera view.
*   Enemies must continuously update their velocity to move toward the player's Head.
*   Implement player damage: If an enemy touches the Head or any Segment, the player takes damage.

### [ ] Phase 4: The Wave Timer (Brotato-style)
*   Implement a 30-second wave timer displayed at the top of the screen.
*   Gradually increase enemy spawn rates as the timer ticks down.
*   When the timer hits 00:00, instantly despawn all remaining enemies, clear projectiles, and pause the game state.

### [ ] Phase 5: The Shop Phase
*   Upon wave completion, transition to a basic Shop UI overlay.
*   Offer 3 randomized upgrades (e.g., "Add new segment with Blaster", "Increase Turret fire rate", "Increase snake speed").
*   Implement a "Next Wave" button to resume combat, reset the 30-second timer, and resume spawning.

### [ ] Phase 6: Economy & EXP
*   Enemies drop colored EXP gems upon death.
*   Head (not segments) must touch gems to collect them.
*   Gems convert to currency for the Shop Phase.