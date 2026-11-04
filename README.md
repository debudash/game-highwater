# River Guard: High Water

A 2D pixel-art platformer for Game Week, built on top of River Guard v1. You play the River
Guard, a toy tank that fires straight up and folds into a chopper that drops charges straight
down. The design is in [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md), and the brief it answers is
in [docs/ASSIGNMENT.md](docs/ASSIGNMENT.md).

**Status:** the whole game is built. A landing page with the story, five stages and the
three-room Bomber finale (23 rooms), then a dawn ending, the results card and the credits.

## Play

```
docker compose up --build -d     # serves on http://localhost:8138
```

| Key | Action |
|---|---|
| ← → or A D | Move |
| Z, Space or ↑ | Tank: jump (hold for higher). Chopper: rise |
| X | Tank: fire up. Chopper: drop a charge, or set down what you carry |
| C or Shift | Switch between tank and chopper |
| Esc | Pause |
| M | Mute |

The chopper's hook is automatic: fly low over a crate or boat and it's reeled up. Fuel refills
when you land.

## Develop

```
npm install
npm test          # sim rules, room solvability bots, fuzz bot, model sizes
npm run build     # typecheck + production bundle in dist/
npm run e2e       # bot plays the Docker-served build in headless Chrome; screenshots in e2e-shots/
```

## Layout

```
src/sim/        deterministic game rules, one tick() = 1/60 s, no DOM
  config.ts       every feel number (speeds, jump, fuel, timers)
  rooms.ts        rooms as plain text maps
  game.ts         state, physics, tank, chopper, switching, hazards, boats, scoring
  input.ts        frame clock and key → tick input
src/view2d/     the game's view: 2D Canvas, draws the generated art (reads the sim, never writes it)
  world2d.ts      camera, rooms, player, items, effects
  sprites.ts      loads public/art/ (sizes from sizes.json); cuts the chopper's rotor out to spin it
  placeholders.ts terrain from the tile art; code-drawn water, shell, charge, portcullis
src/view/       HUD, font, sound, and the old 3D view (?look=3d, comparison only)
  scene.ts        the old Three.js diorama (?look=3d)
  models.ts       its models, built in code
  fx.ts           particles
  hud.ts          HUD and prompts in the 5×7 pixel font
  audio.ts        synthesised sound effects
src/settings.ts key bindings (rebindable), volumes, graphics
src/main.ts     browser loop, pause, quality fallback
tests/          sim tests, bots that solve every room, fuzz bot, art and model size tests
tools/          build_art.py (art pipeline), clean_sprite.py, e2e.mjs (browser bot)
art/            source/ (generated images), assets.json (asset list and touch-ups)
docs/           design, the brief, and River Guard v1's specs (docs/river-guard/)
```

## How every asset is generated

- **Images:** every sprite, tile and background was generated in Google Gemini (Nano Banana Pro)
  from the prompts in [docs/ART_PROMPTS.md](docs/ART_PROMPTS.md). One fixed style block and one
  reference image (the tank) keep the set matching. The raw images are in `art/source/`. The
  first ten were made in the Gemini app; the rest by `python tools/gen_art.py`, which sends the
  same prompts to the Gemini API (key in `.env`, never committed).
- **Cleanup:** `python tools/build_art.py` keys out the background, snaps each image to its true
  art-pixel grid and palette, cuts the tile sheet apart and writes `public/art/`. Hand touch-ups
  (such as painting out a generator glitch) are listed in `art/assets.json`.
- **Water, shell and charge:** drawn in code in the same style.
- **Text:** the 5×7 pixel font is a glyph table in `src/view/font.ts`.
- **Sound:** every effect is synthesised in WebAudio from oscillators and noise
  (`src/view/audio.ts`), modelled on the real thing: a cannon's crack and boom, a rotor's chop,
  splashes, chains, bells and a boat horn.
