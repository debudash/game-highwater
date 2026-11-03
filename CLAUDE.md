# River Guard: High Water

A platformer for the Game Week assignment, built on top of River Guard v1. This repo's history
starts from River Guard's commit `f074d69` (local copy `D:\Dev\game-riverguard`, repo
github.com/debudash/game-rivergauard, spelled that way; git remote `riverguard`). River Guard's
single-lane arcade game becomes a platformer with River Guard's own hero: a tank that fires
straight up and folds into a chopper.

## Status (2026-11-03)

- `docs/GAME_DESIGN.md` holds every design decision, settled by Debu in a grilling session on
  2026-11-03; its decision log lists them. It is the source of truth for the design; the brief
  (`docs/ASSIGNMENT.md`) wins over it.
- The headlines:
  - A 2.5D toy diorama: Three.js renders models built in code, over a 2D sim.
  - Five stages plus the Bomber finale, 23 single-screen rooms.
  - The tank fires up and the chopper drops a charge down, both on X; C switches body.
- Repo: github.com/debudash/game-highwater (public, git remote `origin`). Work on `main`. GitHub
  Pages publishes only from the `release` branch, and Debu decides when to merge to it.
- Title: **River Guard: High Water** (confirmed by Debu, 2026-11-03). "High Water" is fine as the short name in docs.
- Nothing new is built yet; the code is still River Guard v1. The next step is the 3D test room
  (tank drive, jump and fire; chopper flight, fuel, carry and charge; switching) for Debu's feel
  check, sent as soon as it is ready. Wednesday morning is the look check: keep the 3D look, or
  fall back to pixel art.

## Assignment constraints (Game Week; due Thursday 2026-11-05 at midnight)

The requirement is `docs/ASSIGNMENT.md`, the brief transcribed word for word. It wins over this
summary and over the design doc. Check work against it, not against this list.

- **Genre:** platformer.
- **Graphics:** polished, high-quality and cohesive. Mismatched or thrown-together graphics fail the assignment.
- **Substance:** 3+ distinct stages with clear progression; introduce a mechanic, then build on it.
- **Structure:** a reasonable retry system, a final challenge and a clear ending. Beginning, middle and end; about 10–15 minutes for a new player.
- **Assets:** all generated (sprites, environments, sound effects, music). No pre-made assets.
- **Players:** a stranger can play it alone, with brief instructions in the game.
- **Access:** playable in the browser through a public link (plan: GitHub Pages).
- **Priority:** polish over size.

## Reuse from River Guard

The design doc's "Code: what carries over" table says which River Guard code is kept, which is
adapted and which is retired. River Guard's `river-guard-*.md` specs describe the v1 arcade game,
not this one.

- **Patterns:**
  - TypeScript and Vite.
  - A pure deterministic sim, kept separate from the view, with Vitest tests.
  - A random-input fuzz bot with per-tick invariants.
  - `tools/e2e.mjs`, which drives the system Chrome through playwright-core.
- **This game differs:**
  - A 60 Hz fixed step (River Guard used 60 ms ticks).
  - Free movement in pixel units on 16 px tiles, with 20×10-tile rooms.
  - A Three.js view (pinned to an exact version) instead of Canvas 2D.
- **Docker:** a multi-stage Dockerfile runs the tests and the build, and nginx serves the result.
- **Port:** River Guard uses 8137; use 8138 here, after checking `docker ps`.
- **RG-001 lesson:** test that every model has its declared size. In River Guard, the browser bot caught a render crash from a short sprite.

## Conventions

- **Docker:** Docker Desktop, not Rancher Desktop. If the daemon is down, launch `C:\Program Files\Docker\Docker\Docker Desktop.exe`.
- **Bug IDs:** HW-00n, written test-first, with a comment block at the fix site and the global four-part commit format.
- **Feel numbers:** keep the tunables in one config file so tuning never touches logic.
