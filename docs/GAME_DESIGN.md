# River Guard: High Water — game design

**Title:** River Guard: High Water. "High Water" is the short name in these docs.

**Genre:** platformer (Game Week option 2), drawn as a 2.5D diorama.

**Base:** built on **River Guard v1** (github.com/debudash/game-rivergauard, commit `f074d69`).
This repo's code and history start from it.

**Requirement:** [ASSIGNMENT.md](ASSIGNMENT.md). Where this doc and the brief disagree, the brief
wins.

**Status:** Debu settled every decision below in the design session on 2026-11-03. The
[decision log](#decision-log) lists them.

## From River Guard to High Water

River Guard is a single-screen LCD arcade game. You strafe a tank along one lane, fire one shell
at a time at diving and crossing jets, jump cactus mines, and drop into a chopper to hook drowning
boats to the bank. It is an endless score chase drawn in three inks.

High Water keeps that hero and its verbs and puts them into a journey.

| River Guard v1 | High Water |
|---|---|
| One lane, grid steps every 60 ms | Free movement at a 60 Hz fixed step, with momentum and a variable jump |
| Endless, score bands A–E | Five stages and a finale, each introducing one idea and then building on it |
| Three lives, game over | Instant respawn at the room entrance, a ghost hint, a skip offer and a saved Continue |
| No ending | A final battle with the Bomber, an ending scene and a results card |
| 2D, three LCD inks | A 2.5D toy diorama: low-poly 3D models built in code, real lighting |
| Tank ⇄ chopper only during a boat crisis | Switching between tank and chopper is the core mechanic |
| Score chase | The score stays, but each room pays once and has a fixed set of jets |

**Kept from River Guard:**
- **Shell:** one at a time, fired straight up.
- **Jets:** cross jets that drop straight-falling bombs, and dive jets.
- **Cacti:** they sprout and are lethal from their first frame.
- **Boats:** drowning boats show a timer bar and are carried by the chopper.
- **Fuel:** the chopper's flight budget becomes fuel.
- **Castles:** the castle towers with drawbridges become the stage gates.
- **Score:** jets +100, mines +200, boats +500.

## Pitch and goal

The river has burst its banks and a bomber squadron is raiding the valley. You are the River
Guard: one small toy tank that folds into a chopper. Drive upriver through five stages, rescue the
stranded boats, and bring down the Bomber over the flood.

**The player's goal:**
- **In each stage:** reach the castle gate at its end. From stage 3, the gate opens only once the
  stage's required boats are rescued.
- **To win:** destroy the Bomber and bring its last boat home.
- **For mastery:** rescue the hidden boats, and finish with a high score, a fast time and few
  deaths.

**The design goal:** a platformer about two bodies with opposite strengths, where the fun is
choosing the right one and, by the end, switching between them mid-jump.

## The core: two bodies, one Action key

| | **Tank** | **Chopper** |
|---|---|---|
| Moves | Drives and jumps | Flies. Fuel lasts about 3 s of thrust and refills only on landing |
| Action (X) | Fires one shell **straight up**, for jets and targets overhead | Drops one charge **straight down**, for things below |
| Carrying | Can't carry | The hook is **automatic**: fly low over a boat or crate (within about 2 tiles) and it's reeled up at once. The crate you just set down is ignored until you fly away from it, so you can land on it to refuel. While carrying, X **sets it down** instead of dropping a charge, so it can't defend what it carries |
| Weakness | Water is fatal | Water is fatal too (it flies over it, never in it); the charge can't hit jets, and gusts push it |

- **Switching:** C or Shift switches body at any time, including in mid-air. It unlocks in stage 3.
- **The rule of thumb:** a threat above means the tank, and a threat below means the chopper.
- **The mastery skill:** the mid-air switch. You fly out over water, drop out as the tank to shoot
  a jet overhead, then fold back into the chopper before you hit the water.
- **Protecting a boat takes both bodies.** Set the boat down on a bank and shoot the jets diving
  at it from the tank. Clear the mines drifting towards it from the chopper.

**What the chopper's charge does:**

| Target | Effect |
|---|---|
| Cacti | Blasts the cactus. It regrows after about 4 s, so blast it and land before it grows back |
| Cracked floors | Breaks the floor to open a way down. Stage 2 taught this with jet bombs you lured into place |
| Floating mines | Clears mines drifting towards a boat |
| The Bomber's top hatch | Finale phase 2: it skims low over the lake, and only a hit from above works |

**Charge and shell rules:**
- One charge at a time, like the shell.
- The charge never hurts boats or you.
- Things the charge can break show a crack or glow on top. Things the shell can hit show a target
  mark underneath.

## Controls (shown on the landing page and pause screen; keyboard only; every key can be rebound)

**Customising keys:**
- Every action can be rebound in Settings, with up to three keys per action.
- Bindings are saved in the browser.
- Settings also has "Reset to defaults".
- **Conflicts:** binding a key that's already in use swaps the two actions.
- **Reserved:** Esc always pauses and can't be rebound, so no one can lock themselves out.
- **Prompts:** in-game prompts show the player's current key, not the default.

The defaults:

- **Move:** ← → (or A D)
- **Jump / Thrust:** Z, Space or ↑. The tank jumps, and holding it jumps higher. The chopper rises
  while it is held.
- **Action:** X. The tank fires up. The chopper drops a charge, or sets down what it carries.
- **Switch:** C or Shift, from stage 3.
- **Pause:** Esc. **Mute:** M

The first time a key matters, a one-line prompt appears in the room, for example "C: switch".

## Landing page (the first thing a player sees)

The landing page gives the intro, holds the settings and sets the theme.
- **It sets the theme:** a live 3D diorama of the valley under the title, with the river rising
  and the main theme playing (after the first click, because browsers block sound until then).
- **The intro:** three lines of story and the goal, in one sentence each: what's happening, who
  you are, and what you must do.
- **How to play:** the keys, shown with the player's current bindings.
- **Buttons:** Play, Continue (when a save exists) and Settings.
- **Settings:**
  - key bindings
  - music and effects volume
  - graphics quality (high/low shadows)
  - camera shake on/off.
  - Settings are saved in the browser and can also be opened from the pause menu.
- The best score and the "Keyboard required" note are on the landing page too.

**Layout:**
- **One scene:** the landing page is the game's own 3D scene, not a separate web page. It is the
  valley at dawn, with the river rising and the toy tank idling on the bank.
- **Menus:** drawn in the game's font on painted wooden plaques, so the page and the game are one
  style.
- **Transitions:** Play slides the camera down into room 1. The same plaques form the pause menu
  and the results card.

## Movement (tuned for feel; every value lives in one config file)

- **Simulation:**
  - Fixed 60 Hz, 2D and deterministic.
  - World units are pixels on a 16 px tile grid. A room is 20×10 tiles, one screen.
  - Driving off a room's edge slides the camera to the next room.
- **Tank:**
  - **Speed:** top speed about 110 px/s, with quick acceleration and a slightly quicker stop.
  - **Jump:** about 3 tiles high. Releasing early cuts it short, and falling is faster than rising.
  - **Forgiveness:** you can still jump 100 ms after driving off a ledge, and a jump pressed up to
    120 ms before landing still happens.
  - **Firing:** one shell on screen at a time, with no other cooldown.
- **Chopper:**
  - **Flight:** it hovers, rises while Thrust is held and drifts down when released, with soft
    acceleration.
  - **Fuel:** more than the main path needs. An empty chopper sinks slowly, and you can still
    switch.
  - **Load:** something it carries hangs below it and slows it down.
- **Switching:** a 150 ms fold animation.
  - Tank → chopper keeps your momentum.
  - Chopper → tank in the air drops you like a stone.
  - Switching to the tank drops whatever the chopper carries.
- **Feel:**
  - squash on landing and stretch on jumping
  - track dust, rotor wash and splashes
  - recoil on each shell
  - a short camera shake on big impacts.

## Stages (one idea each, introduced safely, then built on)

Each new idea first appears in a room where you can't die, then in a room that tests it.

| # | Stage | Light and tone | New idea | How it builds | Rooms |
|---|---|---|---|---|---|
| 1 | **Riverside Road** | Morning, playful | Drive, jump, fire up | Gaps and cacti, then shoot targets to lower drawbridges, then a jump-and-fire to hit a high target before landing. The last room shows one slow, harmless jet overhead, a first taste you can shoot for points | 4 |
| 2 | **Jet Alley** | Noon, playful | Jets and bombs | Cross jets drop straight bombs with ground shadows, then dive jets come at you, then you lure bombs onto cracked floors to open the way | 4 |
| 3 | **Floodplain** | Afternoon, the flood turns serious | Switch, fly, fuel, carry | Water kills the tank. Fly across, land to refuel, drop crates as landing islands, carry 2 boats to the bank | 4 |
| 4 | **Minefield** | Dusk | The chopper's charge | Blast cacti and land before they regrow, break floors from above, clear mines drifting towards a boat | 4 |
| 5 | **Storm Front** | Night, rain, dark and tense | Mid-air switch and wind | Jets chase the chopper, so drop out as the tank to shoot, then fold back before the water. Gusts push the chopper. A boat threatened from above and below at once | 4 |
| F | **The Bomber** | Dawn over the flood, tense, then bright | Everything | Phase 1: shoot its bomb bay from the shore through lines of bombs. Phase 2: it skims the lake, so drop charges on its hatch, then switch to shoot its belly as it climbs. Phase 3: it sheds dive jets as its last engine burns, and the boat it shot down must be carried home before the castle closes | 3 |

**Totals:**
- 23 rooms at roughly 30 s each including retries, plus the story and ending: about 12–14 minutes
  for a new player.
- The difficulty is a gentle main path, with harder optional routes to the hidden boats.

**The ending:** at dawn the water drops, the boats come home, every drawbridge lowers and the
results card appears.

**The vehicles stay toy-like throughout,** so the dark part feels like a storm in a toy box, not a
war game.

## Boats

| Stage | Required (opens the gate) | Hidden (harder route) |
|---|---|---|
| 1–2 | none | 1 each, rescued by touching it |
| 3–5 | 2 each, carried to the bank by the chopper | 1 each |
| Finale | 1, the boat the Bomber shot down | none |
| **Total** | **7** | **5** (12 in all) |

- **HUD:** shows the current stage's required boats, for example "Boats 1/2".
- **Results card:** shows the total, for example "Boats 9/12".
- **Drowning boats:** their timers are generous, and a drowned boat restarts the room.

## Score

- **Points:**
  - jets +100
  - mines cleared +200
  - boats rescued +500
  - a time bonus at each stage's end.
- **Display:** the score is shown in the HUD, with small popups on each hit.
- **No farming:**
  - A room's points are counted once, when you leave it. Points earned before a death don't
    count.
  - Each room has a fixed set of jets, with no endless spawning.
  - A skipped room scores 0.
- **Best score:** saved in the browser and shown on the landing page and the results card.

## Retry and help

- **Death:**
  - What kills you: a cactus, a bomb, a dive jet, a mine, water or falling off the bottom.
  - The vehicle bursts like a toy, and you respawn at the room entrance about 0.4 s later. There
    are no lives.
- **Room reset:** the room resets fully (jets, crates, boats and charges). Deaths are counted and
  never punished beyond that.
- **Ghost hint:** after 5 deaths in one room, a ghost replays the route once (about 3 s), taken
  from the room's recorded solution.
- **Skip offer:** after 10 deaths in one room, the game offers "Skip this room? Y/N". Skipped rooms
  score 0 and are listed on the results card. The hint and skip never apply to hidden-boat routes.
- **Saving:** progress is saved per stage in the browser (localStorage), so the landing page
  offers **Continue**.
- **The Bomber:** each phase is its own checkpoint.
- **Death counts:** the game logs deaths per room, so the playtests show which rooms are hardest.

## Look: generated 2D pixel art (look B)

**Debu chose look B on 2026-11-03** (decision 25), after comparing it with the 3D diorama and a
pixel-rendered 3D prototype. This section supersedes the 3D notes kept below for the record.
- **The reference:** quizcaster.com: detailed, shaded 2D pixel art with dark outlines and a soft
  highlight.
- **How it's made:** Debu generates every image in Gemini (Nano Banana Pro) from the prompts in
  [ART_PROMPTS.md](ART_PROMPTS.md). One fixed style block, with the tank attached as the style
  reference, keeps the set matching. `tools/build_art.py` cleans each image into true pixel art,
  snapping it to its art-pixel grid and palette, and writes `public/art/`.
- **The view:** a 2D Canvas view (`src/view2d/`) over the same sim. One tile is 96 art pixels, and
  the art is drawn at full detail with smooth scaling. Water, the shell and the charge are drawn in
  code in the same style.
- **The 3D view** stays reachable at `?look=3d` for comparison only.

### The earlier 3D direction (superseded)


**Art direction (Debu, 2026-11-03):**
- **Shading:** flat-shaded low-poly, where every face is one colour lit by the sun.
- **Danger outlines:** dark outlines only on dangerous things.
- **Miniature effect:** a slight tilt-shift blur at the top and bottom of the screen.
- **Framing:** the playfield's front edge is a cutaway slice showing soil, rock and water in
  cross-section, while the landscape continues to the horizon behind.
- **Material:** chunky painted wooden toys for everything, including vehicles, scenery and
  effects.

**What that looks like in detail:**
- **Toy details:** the tank has a wind-up key, boat crews are peg people, and edges are slightly
  bevelled. Trees, castles and cacti are wooden toy scenery.
- **Bursts:** they throw out little wooden pieces that bounce and fade, never fire or gore.
- **Camera:** perspective with a narrow lens (field of view about 30°), side-on with about a 12°
  downward tilt. It frames one room plus a strip of the cutaway, and slides between rooms in
  about 0.5 s.
- **Cutaway:** stripes of soil and rock, with roots and pebbles. Water shows in section: clear
  teal at the surface darkening with depth, with shimmering light on the cut face.
  - Floating mines are visible in the water.
  - The tank's danger is the water line, drawn as a bright foam edge.
- **Water surface:** gently animated waves, a foam line and splash droplets. It's a light tint, so
  anything underwater stays readable.
- **Effects:** dust puffs from the treads, rotor wash rippling the water, rain streaks in depth,
  lightning that briefly lights the whole diorama, wooden-piece bursts and paper-confetti on a
  rescue.
- **HUD:** the 5×7 font in cream on small dark wooden plaques along the top: score, stage, boats
  and (in the chopper) a fuel bar. Nothing is drawn over the playfield except prompts and popups.

**Palette** (one set of about 24 colours, kept as values in the config file):

| Group | Colours |
|---|---|
| Hero | Olive tank green, dark olive, cream stripe, brass wind-up key |
| Danger (always with a dark outline) | Signal red, bomb black, jet blue-grey, cactus green, mine dark with a red light |
| Boats | Cream hull, red stripe, three peg-person colours |
| Land | Grass, sand, soil, rock, castle stone, roof red |
| Water | Surface teal, deep teal, foam white |
| Sky | One gradient per time of day |

**Lighting per stage** (the same palette, lit differently):

| Stage | Sky | Sun or moon | Mood |
|---|---|---|---|
| 1 Riverside Road | Pale blue to cream | Warm white, high | Bright, playful |
| 2 Jet Alley | Clear blue | White, overhead, short shadows | Crisp |
| 3 Floodplain | Hazy blue to gold | Warm, lower | The flood arrives |
| 4 Minefield | Orange to violet | Low orange, long shadows | Uneasy |
| 5 Storm Front | Deep navy, rain | Cold blue moon, lightning flashes | Dark, tense |
| F The Bomber | Rose to gold | Rising sun behind the Bomber | Tense, then bright |

**How the look is proven:**
- **Style frame:** the feel-check build includes one fully dressed room with final models,
  lighting and water, next to the plain test room. The Wednesday-morning look check judges that
  room, not boxes.

**Rendering:**
- **Renderer:** Three.js, pinned to an exact version and bundled by Vite. The 2D simulation is
  unchanged underneath; the view only reads it.
- **Models:** every model is low-poly and built in code from simple shapes, with code-defined
  materials. There are no downloaded models or textures. The models:
  - tank, chopper, jets, bombs, boats and crews, cacti, mines, crates, targets
  - castles with drawbridges, cracked floors
  - the Bomber.
- **Animation:** transforms of model parts, such as spinning rotors, rolling treads, turret recoil,
  squash and stretch, and the fold animation for switching.
- **Shadows:** soft shadows from one sun or moon per stage.
- **Readability:** dangerous things always have a dark outline and a warm accent; scenery never
  does. This keeps River Guard's rule that danger is never drawn like scenery.
- **Text:** River Guard's 5×7 pixel font, extruded into blocky voxel letters for the titles and
  drawn flat for the HUD. No fonts from outside.
- **Performance:** 60 fps on built-in laptop graphics in Chrome. If the frame rate drops, shadows
  get lighter automatically.
- **Fallback:** if the 3D look isn't working by Wednesday morning, we switch to code-drawn 2D pixel
  art before building rooms.

## Sound and music (all synthesised live in WebAudio)

- **Music:** a small sequencer plays one main theme, re-arranged per stage (instruments, tempo,
  key), plus title, Bomber and ending versions. Loops of about 32 bars, following the tone arc.
- **Sound effects:**
  - **The base:** River Guard's synth effects, softened and warmed for the toy look: fire, jet
    kill, bomb drop, pickup, rescue, drown, jump and land.
  - **New:** switch, rotor, low fuel, charge, crate thud, floor crack, mine blast, splash, Bomber
    engines and stage clear.
  - **Space:** light reverb, and stereo panning that follows where each sound is on screen.
- **Ambience:** lapping water, wind, rain and thunder.
- **Mix:** one mixer with music and effects levels. Music sits under the effects, levels are set by
  ear, and M mutes.

## Platform

- **Devices:** desktop and laptop browsers, keyboard only. The landing page says "Keyboard
  required".
- **Browsers:** tested in Chrome, Edge and Firefox.
- **Gamepad:** only if there's time on Thursday evening.

## Code: what carries over from River Guard

| Kept | Adapted | Retired |
|---|---|---|
| Pure deterministic sim separate from the view, seeded RNG, Vitest, fuzz bot with per-tick invariants, `tools/e2e.mjs`, the Docker build-and-test image with nginx, WebAudio synth, the 5×7 glyph table | `FrameClock` (60 ms → 16.7 ms steps), `InputCollector` (new keys), entity rules re-expressed in pixels (jets, straight bombs, one shell, cactus sprout, boat timer bar, flight budget → fuel), the RG-001 size test becomes "every model has its declared size" | The Canvas renderer and 16×16 sprites, the band table, score-driven unlocks, Crisis XOR, SkyPolicy, lives and game over, the side message panel |

**Infrastructure:**
- **Local serving:** Docker on port **8138**. River Guard keeps 8137.
- **Public link:** a GitHub Actions workflow runs the tests and the build, then publishes to GitHub
  Pages (`debudash.github.io/game-highwater`).
  - It publishes **only from the `release` branch**. `main` moves freely, and the judges' link
    changes only when Debu merges to `release`.
  - The Vite `base` is `/game-highwater/`.
- **River Guard's specs:** `river-guard-*.md` moves to `docs/river-guard/` as v1 reference.
- **Solvability:** every room has a recorded solution that runs as a test. The same recording feeds
  the ghost hint.

## Playtests

- **Feel check:** you play a single 3D test room as soon as it's ready: tank, chopper, switching,
  fuel and carrying. I send you a localhost:8138 link and a list of things to try and rate.
- **Look check:** Wednesday morning. Keep the 3D look, or fall back to pixel art.
- **First-time player:** a real stranger plays cold on Thursday afternoon while Debu watches
  silently. The backups:
  - a bot that plays from what's on screen
  - a first-time checklist
  - per-room death counts.

## Not doing (polish over size)

- No wall-jump, dash or side-firing. The shell only goes up and the charge only goes down; that is
  the design.
- No touch controls, and no gamepad unless there's time.
- No multiplayer (Debu, 2026-11-03): solo play is what the brief grades and what judges will see.
- No free 3D movement or camera. The play is a 2D plane.
- No level editor; rooms are plain text maps in code.

## Cut order if we fall behind (cut from the top first)

1. Gamepad.
2. The hidden boats in stages 4–5 (leaving 3 hidden boats).
3. Ambience sound. The visual rain stays.
4. One room from each of stages 2–5 (leaving 19 rooms, about 10–11 minutes).
5. The Bomber's phase 3. The rescue of the shot-down boat stays.
6. The 3D look, by switching to pixel art. This only applies before Wednesday morning's check.

**Never cut:**
- the ending scene and results card
- the landing page with intro, instructions and settings, including key rebinding
- retry, the ghost hint and the skip
- music and sound effects
- the public link.

## Build plan to Thursday midnight

| When | Deliverable | Gate |
|---|---|---|
| Tue | The 3D test room: tank drive, jump and fire; chopper flight, fuel, carry and charge; switching. Tests on jump height, forgiveness timings and fuel. | **Your feel check** |
| Wed am | Feel fixes | **Look check:** keep 3D, or fall back |
| Wed | All 23 rooms blocked out, the Bomber, retry, hint, skip, score and every screen. A recorded solution for every room runs as a test. | Bot completes the game |
| Thu day | Models, lighting, music, sound, particles and screen polish. Actions → Pages from `release`. | Stranger playtest in the afternoon, plus the browser bot |
| Thu eve | Fixes only, then the final merge to `release` | Submit the link |

## Assignment checklist

Checked against [ASSIGNMENT.md](ASSIGNMENT.md), the brief that is the requirement.

| Requirement | Where it is met |
|---|---|
| Platformer genre | Drive, jump and fly movement, with switching between tank and chopper as the core mechanic |
| Satisfying movement, mastery as players progress | Tuned run and jump with forgiveness windows; mastery builds towards the mid-air switch |
| Responsive movement; core mechanic fun throughout | One Action key whose meaning follows the body; switching gains a new use in every stage |
| 3+ stages, clear progression | 5 stages plus the Bomber, one idea each |
| Increasing challenge | Each idea is shown safely, then tested, then combined (see Stages) |
| Intentional difficulty | A gentle main path, harder hidden-boat routes, rooms checked by death counts |
| Varied challenges, not a clone or cosmetic repeats | Each stage changes what the player does: aim, dodge, ferry, blast, switch mid-air, fight |
| Reasonable retry | Instant respawn, a ghost hint after 5 deaths, a skip offer after 10, Bomber checkpoints, a saved Continue |
| Final challenge, clear ending | The three-phase Bomber, the dawn ending scene and the results card |
| Beginning, middle, end | Landing page with the intro; five stages; finale, ending and results |
| Clear objective | The landing-page intro says the goal; the HUD shows the boats needed; gates show when they're open |
| 10–15 minutes | 23 rooms at roughly 30 s each, plus story and ending |
| Polished, cohesive look | One style block and one reference image for every generated image, one art-pixel grid, one outline style, the stage lighting arc in the backgrounds |
| Unique, clean design | An up-firing toy tank that folds into a down-firing chopper, in River Guard's world, as a lit diorama |
| Look, sound and feel reinforce the world | The tone arc runs through the lighting, music and weather together |
| Finish the details | One font, a fixed HUD layout, animation on every action, a mixed sound level, feedback on every hit and pickup |
| All assets generated | Every image generated in Gemini from the prompts in ART_PROMPTS.md and cleaned by script; font, music and sound generated in code; the README says how |
| Playable by someone else | An intro and controls on the landing page, rebindable keys, controls on the pause screen, safe teaching rooms, key prompts, a stranger playtest |
| Browser link | GitHub Pages, published from `release` |

## Decision log

All settled by Debu on 2026-11-03.

| # | Decision |
|---|---|
| — | **Game shape:** the "Tank Ops" platformer (tank ⇄ chopper) |
| — | **Repo:** seeded from River Guard's history |
| — | **Title:** River Guard: High Water |
| 1 | **Core mechanic:** the tank fires up and the chopper drops a charge down. Both use X. Pickup is by touch, and X sets the load down. C switches any time, from stage 3. The charge has all four uses (cacti, floors, mines, Bomber hatch) |
| 2 | **Stuck players:** a ghost hint after 5 deaths in a room, a skip offer after 10 |
| 3 | **Rooms:** single-screen rooms, with the camera sliding between them |
| 4 | **Look:** 2.5D toy diorama (Three.js, models built in code), with a pixel-art fallback if it isn't working by Wednesday morning |
| 5 | **Audio:** all synthesised live in WebAudio |
| 6 | **Platform:** desktop keyboard only. Chrome, Edge and Firefox at 60 fps on built-in laptop graphics |
| 7 | **Score:** River Guard's score in the HUD, with room points counted once on leaving, fixed jets and skipped rooms scoring 0 |
| 8 | **Tone:** follows the story (playful → serious at dusk → dark storm → bright dawn ending) |
| 9 | **Feel check:** as soon as the test room is ready |
| 10 | **First-time player:** a real stranger on Thursday afternoon, with bot, checklist and death-count backups |
| 11 | **Stages:** five stages plus the finale, one idea each, 4 rooms each plus 3 for the Bomber |
| 12 | **Boats:** 7 required (stages 3–5 and the finale) plus 5 hidden |
| 13 | **Cut order:** approved as listed |
| 14 | **Publishing:** Actions → Pages from the `release` branch |
| 15 | **First push:** commit and push this design on top of River Guard v1 once the summary is confirmed |
| 16 | **Keys:** every action can be rebound in Settings, saved in the browser |
| 17 | **Landing page:** intro, settings and the theme set before play. It is the game's own 3D scene at dawn, with wooden-plaque menus |
| 18 | **Shading:** flat low-poly, with dark outlines only on danger and the miniature (tilt-shift) effect |
| 19 | **Framing:** a cutaway front showing soil, rock and water in section, with a continuous landscape behind |
| 20 | **Material:** painted wooden toys for everything |
| 21 | **Remaining details:** Debu said "go with your defaults". The palette, stage lighting, camera, water, effects, HUD, landing-page layout, style frame, default keys, story text drafted by Claude for Debu to approve on screen, 5×7 font (voxel titles, flat HUD) and repo housekeeping are as written in this doc |
| 22 | **Multiplayer:** dropped |
| 23 | **Feel build refinements (Claude, for the feel check):** water is fatal to both bodies; up to three keys per action |
| 24 | **Auto-hook (Debu, feel check, HW-001):** hovering to hook was too hard. The hook is automatic within reach; only the crate you just set down is skipped until you fly away |
| 25 | **Look B (Debu, look check, 2026-11-03):** generated 2D pixel art in the style of quizcaster.com, made in Gemini from `docs/ART_PROMPTS.md` and cleaned by `tools/build_art.py`, drawn by a 2D view. It replaces the 3D diorama (decisions 4 and 18–20); the 3D view stays at `?look=3d` for comparison |
| 26 | **Sound (Debu):** effects are modelled on the real thing (cannon crack and boom, rotor chop, splashes, chains, bells, a boat horn), not chiptune, then made "vibrant and energetic": punchy transients, a drive-and-compress master and bright bell flourishes on rewards |
| 27 | **Gates are doors (Claude, for look B):** a gate is two tiles tall at ground level with a castle wall (`W`) above it to the top of the room, so the generated gate tower fits |
| 28 | **A teaser jet in stage 1 (Debu):** Riverside Road's last room has one slow jet that drops no bombs and can't hurt you. Shooting it is optional and scores +100; jets turn dangerous in Jet Alley |
