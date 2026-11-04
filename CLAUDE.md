# River Guard: High Water

A platformer for the Game Week assignment, built on top of River Guard v1. This repo's history
starts from River Guard's commit `f074d69` (local copy `D:\Dev\game-riverguard`, repo
github.com/debudash/game-rivergauard, spelled that way; git remote `riverguard`). River Guard's
single-lane arcade game becomes a platformer with River Guard's own hero: a tank that fires
straight up and folds into a chopper.

## Status (2026-11-04)

- `docs/GAME_DESIGN.md` holds every design decision; its decision log (rows 1–35) lists them. It is
  the source of truth for the design; the brief (`docs/ASSIGNMENT.md`) wins over it.
- The headlines:
  - **Look B** (decision 25): generated 2D pixel art in the style of quizcaster.com, drawn by the
    2D Canvas view in `src/view2d/`. The old 3D diorama is at `?look=3d`, for comparison only.
  - Five stages plus the Bomber finale (F-1 to F-3), 23 single-screen rooms, then the dawn ending,
    the results card and Debu's credits.
  - The tank fires up and the chopper drops a charge down, both on X; Down or S sets a load down; C switches body.
- **Art:** every image is generated in Gemini (Nano Banana Pro) from `docs/ART_PROMPTS.md`, with
  the tank as the style reference. `python tools/gen_art.py <name>` generates through the API (key
  in `.env`, never committed or put in the image); `python tools/build_art.py` cleans
  `art/source/` into `public/art/`. Don't hand-edit `public/art/`.
- **Built:** the whole game. Every room is cleared by a bot in `tests/stagebots.ts`; the rules in
  decisions 29 (the tank can't do the chopper's job) and 30 (attacks are fair) are tested.
  `node tools/e2e.mjs` passes on the Docker build. Debug flags: `?rooms=test`, `?debug`
  (`window.highWaterDebug.goto(id)`). Watch mode: `?autoplay` (or `?autoplay=2` to `4` for speed)
  plays the whole run from the room recordings (`src/sim/autoplay.ts`).
- **Play time (decision 33):** estimated by a simulated new player, `NOVICE=1 npx vitest run tests/novice.report.test.ts`: about 7½ min casual, 12 min non-gamer. Re-run it after any room change.
- **Intro approved** by Debu (2026-11-04). Debu wants it ready to submit on 2026-11-04.
- **Cut for time** (decision 32): the per-stage time bonus, Restart Room keeping the death count,
  landing-page frame-rate work; the Bomber's belly shot and the castle timer (decision 31).
- **Hosting (decision 32):** live at **https://game-highwater.fly.dev/** (Fly app `game-highwater`,
  one always-on machine in iad; `fly deploy` from the repo root, config in `fly.toml`). Redeploy
  after each change Debu wants live. `main` is pushed to GitHub (github.com/debudash/game-highwater,
  remote `origin`) and to the Gauntlet GitLab (labs.gauntletai.com/debudash/game-highwater, remote
  `gitlab`, first pushed 2026-11-04). Push every commit to both. No GitHub Pages.
- Title: **River Guard: High Water** (confirmed by Debu, 2026-11-03). "High Water" is fine as the
  short name in docs.
- Issues are logged in `docs/ISSUE_LOG.md`.

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
