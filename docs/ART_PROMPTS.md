# Art prompts (look B: detailed 2D pixel art)

Every image in the game is generated from the prompts below. The raw images go in `art/source/`
and are cleaned by a script into `public/art/`. These prompts are the record of how each asset was
made (brief: "generate all assets").

## Generating by script

`python tools/gen_art.py --missing` sends each prompt below that has no file yet to Gemini (model
`gemini-3-pro-image` by default, `--model` to change it), with the reference image attached, and
saves the result to `art/source/`. It reads `GEMINI_API_KEY` from `.env` at the repo root, which
git and the Docker build both ignore. `--list-models` shows the image models the key can use.
Images made by hand in the Gemini app go in the same folder; the script never overwrites a file
unless given `--force`, which keeps the old one as `<name>.old.png`.

## Building

`python tools/build_art.py` rebuilds everything in `public/art/` from `art/source/`, using the
list and touch-ups in `art/assets.json`. Previews at 6x land in `art/clean/`.

## Step 1: the look test (4 images, done 2026-11-03)

Generate these four first. If they look right together, the rest follow the same style block.

| File name | Subject |
|---|---|
| `tank.png` | the hero tank |
| `chopper.png` | the hero chopper |
| `boat.png` | the boat to rescue |
| `bg-riverside.png` | the Riverside Road background |

## The style block (paste into every prompt)

> high-detail 16-bit pixel art game sprite, side view, chunky dark brown outlines (not black),
> 4-tone cel shading with a soft highlight, light from the top left, warm saturated colours,
> cute toy-like proportions, painted tin toy look, a single object centred on a plain flat magenta
> background (#FF00FF), no text, no ground, no shadow, no border

Keep the wording identical every time. Changing the style block is how sets end up mismatched,
and mismatched art fails the brief.

**Lessons from the first three images (2026-11-03):**
- **The tank is the style reference.** Attach `art/source/tank.png` to every later prompt and add:
  "Match the reference image exactly: same pixel size, outline colour and thickness, shading, and
  the same slight three-quarter view from the side and a little above. Use the reference only for
  the art style: draw the object described, not the tank." (Without the last sentence, the first
  bomber came back as a copy of the tank.)
- **The view must match.** The tank and the boat came out in a slight three-quarter view; the first
  chopper came out flat side-on, with flatter shading. That mix would read as mismatched.
- **The tank's cannon must point straight up.** It fires vertically. Fix it with an edit:
  "Edit this image: make the cannon point straight up, vertical. Keep everything else the same."

## Prompts

**`tank.png`**
> [style block] — a small olive-green toy tank with cream stripe along its hull, brass road
> wheels in dark tracks, a short round turret whose cannon points STRAIGHT UP, and a brass wind-up
> key sticking out of its back. Facing right.

**`chopper.png`**
> [style block] — a small olive-green toy helicopter with a cream stripe, a round light-blue
> glass canopy at the front, two thin skids underneath, a short tail boom with a small tail rotor,
> and a brass rotor hub. Draw the main rotor blades as one straight horizontal line on top.
> Facing right.

**`boat.png`**
> [style block] — a little toy tugboat: red hull below the waterline, cream topsides, a varnished
> wooden rail, a cream wheelhouse with dark windows and a blue roof, a red funnel, an orange life
> ring, a small yellow pennant on a mast at the bow, and two peg-doll crew (one yellow, one blue)
> standing on the foredeck. Bow facing right.

**`bg-riverside.png`** (wide, 16:9 or wider; no magenta, this one is a full scene)
> high-detail 16-bit pixel art game background, side-scrolling platformer, wide panorama, a calm
> river valley at morning: soft blue sky with puffy clouds, rolling green hills, round and pointed
> trees, a small stone castle far away on a hill, warm sunlight from the top left, gentle
> atmospheric haze in the distance, no characters, no text, no foreground ground

## Step 2: the rest of the chopper room (6 images, done 2026-11-03)

All six cleaned on the same 11.46 px art-pixel grid as step 1. The bridge tile came out as a framed
panel with posts, not a repeating tile, so the view stretches it across the bridge span.

Attach `art/source/tank.png` as the reference to every one, with the reference line from the
lessons above. Sprites on flat magenta as before.

**`tiles.png`** (the ground; this one is a sheet, not a single object)
> [style block] — a tileset sheet for a side-view platformer: a 3 by 2 grid of six square tiles of
> equal size, separated by thin magenta gaps. Top row: (1) grass on top of brown soil, (2) plain
> brown soil, (3) grey stone blocks. Bottom row: (4) cracked grey stone about to crumble, (5) the
> top of a wooden dock made of planks, (6) wooden bridge planks seen from the side. Each tile must
> join seamlessly to a copy of itself on its left and right.

**`crate.png`**
> [style block] — a sturdy wooden cargo crate with darker wooden edges and a diagonal brace on the
> front, the size of a small toy.

**`cactus.png`**
> [style block] — a spiky green cactus with two arms and little red-tipped spines, slightly
> menacing, clearly something you must not touch.

**`mine.png`**
> [style block] — a round black naval sea mine with short spikes all around and a small red
> warning light on top, floating.

**`target.png`**
> [style block] — a round wooden archery target board with red and cream rings, hanging from a
> short rope at its top.

**`gate.png`** (tall, portrait)
> [style block] — a stone castle gate tower with a red pointed roof and battlements, and a closed
> wooden portcullis in its archway at the bottom, tall and narrow.

## Step 3: the rest of the game (10 images, done 2026-11-03 by `tools/gen_art.py`)

Generated through the API with Nano Banana Pro. Two needed a second go: the first bomber came back
as a copy of the reference tank (fixed by the "use the reference only for the art style" line), and
the bomb leaned twice, so the second one was edited in Gemini to hang vertically.

Look B passed the look check (2026-11-03). Sprites: attach `art/source/tank.png` as the reference,
as before. Backgrounds: attach `art/source/bg-riverside.png` instead, and add "Match the reference
image exactly: same pixel size, same painterly pixel style, same composition (sky on top, hills and
trees, a river valley), only the time of day and weather change."

**Sprites**

**`bridge.png`**
> [style block] — a long straight wooden drawbridge deck seen exactly from the side: a thick
> horizontal beam of planks with iron bands and rivets, about six times as wide as it is tall,
> with a small iron ring at each end for the chains. No posts, no railings.

**`jet.png`**
> [style block] — a small toy fighter jet, painted grey-blue with a red nose cone and a red
> stripe, a bubble cockpit, short swept wings and a glowing orange exhaust at the back, slightly
> menacing but still a toy. Flying right.

**`bomb.png`**
> [style block] — a small round-nosed toy bomb with tail fins, dark grey with a red band, falling
> perfectly vertically: the round nose at the bottom, the fins at the top, not tilted at all.

**`bomber.png`** (wide; the final boss)
> [style block] — an AIRPLANE, not a tank: a huge toy bomber plane, much bigger and heavier than a fighter jet: dark
> grey-green with red markings, four propeller engines on long straight wings, a glass nose, an
> open bomb bay underneath, and a round red hatch on top of its back that looks like a weak spot.
> Flying right.

**`logo.png`** (wide; the title)
> high-detail 16-bit pixel art game title logo reading "RIVER GUARD" on the first line and
> "HIGH WATER" on the second, chunky gold serif letters with dark brown outlines and a bright
> highlight, a small wave of blue water curling under the second line, on a plain flat magenta
> background (#FF00FF), no other text

**Backgrounds** (wide, 16:9 or wider, no magenta; one per stage, following the tone arc)

**`bg-jetalley.png`** — Stage 2, Jet Alley, noon
> high-detail 16-bit pixel art game background, side-scrolling platformer, wide panorama, the
> same river valley at bright noon: deep blue sky, high white clouds with thin jet contrails
> crossing them, sharp sunlight, rolling green hills and trees, the stone castle far away, no
> characters, no text

**`bg-floodplain.png`** — Stage 3, Floodplain, afternoon, the flood turns serious
> high-detail 16-bit pixel art game background, side-scrolling platformer, wide panorama, the
> same valley in warm late afternoon light, but flooded: the river has burst its banks into wide
> brown-green water, half-drowned trees and fences, heavy clouds building, the castle on its hill
> above the flood, no characters, no text

**`bg-minefield.png`** — Stage 4, Minefield, dusk
> high-detail 16-bit pixel art game background, side-scrolling platformer, wide panorama, the
> flooded valley at dusk: orange and purple sky, the sun low behind the hills, long shadows,
> dark flood water reflecting the sunset, the castle in silhouette with a few lit windows, no
> characters, no text

**`bg-storm.png`** — Stage 5, Storm Front, night
> high-detail 16-bit pixel art game background, side-scrolling platformer, wide panorama, the
> flooded valley at night in a storm: dark blue-black sky, heavy rain, a fork of lightning lighting
> the clouds, wind-bent trees, black flood water, the castle's windows glowing, no characters, no
> text

**`bg-dawn.png`** — The Bomber and the ending, dawn over the flood
> high-detail 16-bit pixel art game background, side-scrolling platformer, wide panorama, the
> valley at dawn after the storm: pink and gold sky, the storm clouds breaking up, the sun rising
> over the hills, the flood water calm and shining, the castle bright on its hill, no characters,
> no text

## Specs (what the cleanup script assumes)

- **Size:** any; the script scales down. Square images work best for sprites.
- **Background:** flat magenta (#FF00FF) for sprites, so it can be keyed out. Generators rarely
  give real transparency.
- **Facing:** everything faces right. The game mirrors sprites when needed.
- **Which generator:** a pixel-art-specific one, such as PixelLab or Retro Diffusion, gives clean
  pixel grids. General ones, such as ChatGPT, Gemini or Midjourney, give images that only look
  pixelated; the cleanup step snaps them to a real grid and to one shared palette.
