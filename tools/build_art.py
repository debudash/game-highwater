"""Build every game image in public/art/ from the generated sources in art/source/.

The list of assets and any hand touch-ups live in art/assets.json, so the whole set can be rebuilt
from the sources in one command:

    python tools/build_art.py

Sprites go through tools/clean_sprite.py (background out, snapped to the art-pixel grid, palette
snapped). Backgrounds are resized and saved as WebP. Previews at 6x go to art/clean/ (not shipped).
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from clean_sprite import clean  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "source"
OUT = ROOT / "public" / "art"
PREVIEW = ROOT / "art" / "clean"


def runs(filled: list[bool], min_len: int = 8) -> list[tuple[int, int]]:
    """[start, end) of each run of True at least min_len long."""
    out, start = [], None
    for i, f in enumerate(filled + [False]):
        if f and start is None:
            start = i
        elif not f and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    return out


def split_sheet(img: Image.Image) -> list[Image.Image]:
    """Cut a sheet of tiles apart along its transparent gaps: rows first, then columns in each row."""
    a = img.getchannel("A").load()
    w, h = img.size
    tiles = []
    for y0, y1 in runs([any(a[x, y] for x in range(w)) for y in range(h)]):
        for x0, x1 in runs([any(a[x, y] for y in range(y0, y1)) for x in range(w)]):
            tiles.append(img.crop((x0, y0, x1, y1)))
    return tiles


def main() -> None:
    spec = json.loads((ROOT / "art" / "assets.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    sizes = {}
    for name, opts in spec["sprites"].items():
        img, report = clean(str(SRC / f"{name}.png"), opts.get("colors", 32))
        px = img.load()
        for p in opts.get("patches", []):
            x0, y0, x1, y1 = p["box"]
            colour = px[p["from"][0], p["from"][1]]
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    px[x, y] = colour
        img.save(OUT / f"{name}.png")
        img.resize((img.width * 6, img.height * 6), Image.Resampling.NEAREST).save(PREVIEW / f"{name}@6x.png")
        sizes[name] = [img.width, img.height]
        print(report)
    for name, opts in spec.get("sheets", {}).items():
        img, report = clean(str(SRC / f"{name}.png"), opts.get("colors", 48))
        print(report)
        for tile_name, tile in zip(opts["names"], split_sheet(img)):
            tile.save(OUT / f"{tile_name}.png")
            tile.resize((tile.width * 6, tile.height * 6), Image.Resampling.NEAREST).save(PREVIEW / f"{tile_name}@6x.png")
            sizes[tile_name] = [tile.width, tile.height]
            print(f"  {tile_name}: {tile.width}x{tile.height}")
    for name, opts in spec.get("backgrounds", {}).items():
        img = Image.open(SRC / f"{name}.png").convert("RGB")
        w = opts["width"]
        img = img.resize((w, round(img.height * w / img.width)), Image.Resampling.LANCZOS)
        img.save(OUT / f"{name}.webp", quality=88)
        sizes[name] = [img.width, img.height]
        print(f"{name}: background -> {img.width}x{img.height}")
    # The view reads sizes from here, so a regenerated sprite never needs a code change.
    (OUT / "sizes.json").write_text(json.dumps(sizes, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
