"""Turn a generated sprite image into a clean game sprite.

Image generators draw "pixel art" at about 1024 px with each art pixel a soft block of several
real pixels, on a flat magenta background. This script:
  1. keys out the magenta background (and the pink fringe it leaves on edges),
  2. crops to the sprite,
  3. finds the art-pixel grid (block size and offset) from where the colour edges fall,
  4. samples one colour per block (the block's most common colour), giving true pixel art,
  5. snaps the colours to a small palette,
  6. writes the sprite at its true size plus a 6x preview.

Usage: python tools/clean_sprite.py art/source/tank.png public/art/tank.png [--colors 32]
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def key_background(rgb: np.ndarray) -> np.ndarray:
    """Alpha mask: False where the pixel is the magenta background or its fringe.

    Only magenta connected to the image border counts as background (a flood fill), so a stray
    magenta-tinted pixel inside the sprite, such as a window, is kept rather than punched out.
    """
    corners = np.array([rgb[2, 2], rgb[2, -3], rgb[-3, 2], rgb[-3, -3]], dtype=float)
    bg = np.median(corners, axis=0)
    dist = np.linalg.norm(rgb.astype(float) - bg, axis=2)
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    magenta_ish = (dist < 90) | ((r - g > 110) & (b - g > 110))  # incl. the anti-aliased fringe
    # Seeds: the border, plus any pixel that is clearly the background colour. The second catches
    # gaps the sprite encloses (between the chopper's skids, under the tank's tracks).
    outside = dist < 60
    outside[0, :], outside[-1, :], outside[:, 0], outside[:, -1] = magenta_ish[0, :], magenta_ish[-1, :], magenta_ish[:, 0], magenta_ish[:, -1]
    while True:  # grow the border region through magenta pixels until it stops changing
        grown = outside.copy()
        grown[1:, :] |= outside[:-1, :]
        grown[:-1, :] |= outside[1:, :]
        grown[:, 1:] |= outside[:, :-1]
        grown[:, :-1] |= outside[:, 1:]
        grown &= magenta_ish
        if (grown == outside).all():
            break
        outside = grown
    return ~outside


def find_grid(rgb: np.ndarray, mask: np.ndarray, axis: int) -> tuple[float, float]:
    """Art-pixel size and offset along one axis.

    Generators often draw at a small size and scale up by a fraction (240 px wide art scaled to
    1024 px gives 4.27 px blocks), so the block size is found as the strongest frequency in the
    positions of colour edges, not as a whole number. The phase of that frequency is the offset of
    the block boundaries.
    """
    diff = np.abs(np.diff(rgb.astype(int), axis=axis)).sum(axis=2) > 40
    m = mask[1:, :] & mask[:-1, :] if axis == 0 else mask[:, 1:] & mask[:, :-1]
    edges = (diff & m).sum(axis=1 - axis).astype(float)
    x = np.arange(len(edges)) + 1.0  # an edge at diff index i lies between pixels i and i+1
    best = (0.0, 4.0, 0.0)
    for period in np.arange(3.0, 16.0, 0.005):
        z = (edges * np.exp(-2j * np.pi * x / period)).sum()
        # Weight by period so a harmonic (half the true period) doesn't win.
        score = abs(z) * (1 + period / 40)
        if score > best[0]:
            best = (score, period, (np.angle(z) / (2 * np.pi) * period) % period)
    return best[1], best[2]


def downsample(rgba: np.ndarray, px: float, ox: float, py: float, oy: float) -> np.ndarray:
    """One colour per art pixel: the most common colour near the centre of each block."""
    h, w = rgba.shape[:2]
    nx, ny = int((w - ox) // px), int((h - oy) // py)
    out = np.zeros((ny, nx, 4), dtype=np.uint8)
    rx, ry = max(1, int(px * 0.3)), max(1, int(py * 0.3))
    for j in range(ny):
        cy = int(oy + (j + 0.5) * py)
        for i in range(nx):
            cx = int(ox + (i + 0.5) * px)
            cell = rgba[max(0, cy - ry):cy + ry + 1, max(0, cx - rx):cx + rx + 1].reshape(-1, 4)
            opaque = cell[cell[:, 3] > 0]
            if len(opaque) * 2 < len(cell):
                continue
            q = (opaque[:, :3] // 8).astype(np.int32)  # round off generator noise
            keys = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]
            vals, counts = np.unique(keys, return_counts=True)
            pick = opaque[keys == vals[counts.argmax()]][:, :3].mean(axis=0)
            out[j, i, :3] = pick.round().astype(np.uint8)
            out[j, i, 3] = 255
    return out


def clean(src: str, colors: int = 32) -> tuple[Image.Image, str]:
    """The cleaned sprite at its true size, and a one-line report."""
    rgb = np.array(Image.open(src).convert("RGB"))
    mask = key_background(rgb)
    sx, ox = find_grid(rgb, mask, axis=1)
    sy, oy = find_grid(rgb, mask, axis=0)
    rgba = np.dstack([rgb, mask.astype(np.uint8) * 255])
    small = downsample(rgba, sx, ox, sy, oy)
    ys, xs = np.where(small[..., 3] > 0)  # crop to the sprite
    small = small[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

    img = Image.fromarray(small, "RGBA")
    alpha = img.getchannel("A")
    pal = img.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    img = pal.convert("RGBA")
    img.putalpha(alpha)
    return img, f"{src}: art pixel {sx:.3f}x{sy:.3f} px (offset {ox:.2f},{oy:.2f}) -> {img.width}x{img.height} art px, {colors} colours"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--colors", type=int, default=32)
    a = ap.parse_args()
    img, report = clean(a.src, a.colors)
    Path(a.dst).parent.mkdir(parents=True, exist_ok=True)
    img.save(a.dst)
    preview = Path(a.dst).with_name(Path(a.dst).stem + "@6x.png")
    img.resize((img.width * 6, img.height * 6), Image.Resampling.NEAREST).save(preview)
    print(f"{report} -> {a.dst}")


if __name__ == "__main__":
    main()
