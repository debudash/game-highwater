# River Guard — Tank Ops

A playful 80s LCD arcade game: hold the lane against diving and crossing jets, dodge bombs,
drop into the chopper to rescue drowning boats, and jump the cactus mines.
The spec lives in `river-guard-rulebook.md` (rules) and `river-guard-level1.md` (tutorial level).

## Play
```
docker compose up --build -d     # serves on http://localhost:8137
```
| Key | Action |
|---|---|
| ◀ ▶ | Move (tank or chopper) |
| Space | Fire (one shell at a time) |
| ▼ | Boat crisis: enter the chopper; over the boat: hook it |
| ▲ | Jump over mines (after 10,000); in the chopper: leave, or drop the boat |
| M | Mute |

## Develop
```
npm install
npm test          # rules, level-1 script, fuzz bot over every band
npm run build     # typecheck + production bundle in dist/
npm run e2e       # bot plays the Docker-served build in headless Chrome; screenshots in e2e-shots/
```

## Layout
```
src/sim/      deterministic game rules: one tick() = one 60 ms tick (rulebook §9 order)
  config.ts     every tunable (DifficultyTable, timers, layout, inks)
  game.ts       state, tick order, entities, SkyPolicy, crisis scheduler, level-1 script
  respawn.ts    §8 respawn safety rule
  messages.ts   §3 side-panel message rules
  input.ts      frame clock (catch-up) and key → tick press rules
src/view/     renderer, LCD font, sprites, sound (reads the sim, never writes it)
src/main.ts   browser loop, hidden-tab pause, best score
tests/        acceptance checks, level-1 script tests, fuzz bot
docs/         ADRs and open questions
```
