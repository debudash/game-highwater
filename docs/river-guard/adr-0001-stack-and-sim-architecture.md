# ADR 0001: TypeScript + Canvas, deterministic tick sim

**Status:** accepted (Nov 3, 2026)

## Context
The rulebook is tick-exact: 60 ms ticks, a fixed six-step tick order, step accumulators with
carry, 40 unit-testable hard invariants and per-phase acceptance lists. The display is a fixed
416×248 LCD canvas drawn in three inks. It is a browser game: hidden-tab pause and keyboard input.

## Decision
- **TypeScript, no game engine.** Canvas 2D for drawing, WebAudio for sound, Vite to build,
  Vitest for tests. The bundle is about 34 kB with zero runtime dependencies.
- **`src/sim/` is pure.** No DOM, no wall clock, seeded RNG. `tick(game, input)` runs exactly
  one 60 ms tick in the §9 order. Every rule can be tested headless.
- **`src/view/` only reads the sim.** Cosmetic timers (ripples, flashes, drawbridge) are drawn
  from tick indices and never feed back into play.
- **One `DifficultyTable` (`src/sim/config.ts`)** holds every band-indexed and timer value.
- **Served by nginx in Docker** (`docker compose up --build`, port 8137). The image build runs
  the test suite, so a failing rule blocks the image.

## Consequences
- Rule changes land in `src/sim/` with a test, and need no rendering work.
- A fuzz bot (`tests/fuzz.test.ts`) drives random input through all bands and checks the hard
  invariants after every tick.
