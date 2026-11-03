// The sprite bank for look B (?look=b). Every image is generated (docs/ART_PROMPTS.md) and built
// into public/art/ by tools/build_art.py, which also writes public/art/sizes.json. The bank is
// table-driven: a sprite listed in sizes.json is drawn from its image; anything not there yet is
// drawn by its code placeholder (placeholders.ts), so new art drops in with no code change.

/** Every sprite the 2D view draws, and the scale it is drawn at (art px per sprite pixel). */
export const SPRITES = {
  tank: { scale: 1.0 },
  chopper: { scale: 1.12 },
  boat: { scale: 1.0 },
  crate: { scale: 1.0 },
  cactus: { scale: 0.95 },
  mine: { scale: 0.75 },
  target: { scale: 0.9 },
  /** The tower art is small (46x119), so it's scaled up until its door is about a tile tall. */
  gate: { scale: 4.0 },
  // Stage art, drawn at their own scales in stagefx.ts and placeholders.ts; listed so this table
  // of what the view draws stays complete.
  jet: { scale: 1 },
  bomb: { scale: 1 },
  bridge: { scale: 1 },
  bomber: { scale: 1 },
  // Tiles are drawn into 96 art px cells by placeholders.ts; their scale here is unused.
  'tile-grass': { scale: 1 },
  'tile-soil': { scale: 1 },
  'tile-stone': { scale: 1 },
  'tile-cracked': { scale: 1 },
  'tile-dock': { scale: 1 },
  'tile-bridge': { scale: 1 },
} as const;

export type SpriteName = keyof typeof SPRITES;

/** Backgrounds, one per stage light (see BG_BY_LIGHT in stagefx.ts). */
export const BACKGROUNDS = ['bg-riverside', 'bg-jetalley', 'bg-floodplain', 'bg-minefield', 'bg-storm', 'bg-dawn'] as const;

export interface Rotor {
  /** The chopper body with the blades cut out. */
  body: HTMLCanvasElement;
  /** Only the blades, the same size as the sprite, so both draw at the same place. */
  blades: HTMLCanvasElement;
  /** The hub's centre column (sprite px), the axis the blades spin about. */
  hubX: number;
}

export class SpriteBank {
  readonly images = new Map<string, HTMLImageElement>();
  rotor: Rotor | null = null;

  /** Loads whatever art exists. Missing art is not an error: the placeholder draws instead. */
  async load(base = 'art/'): Promise<void> {
    let sizes: Record<string, [number, number]> = {};
    try {
      const res = await fetch(`${base}sizes.json`, { cache: 'no-cache' });
      if (res.ok) sizes = await res.json();
    } catch {
      return; // no art built yet: placeholders throughout
    }
    const names = Object.keys(sizes);
    await Promise.all(names.map((name) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { this.images.set(name, img); resolve(); };
      img.onerror = () => resolve();
      img.src = `${base}${name}.${name.startsWith('bg-') ? 'webp' : 'png'}`;
    })));
    const chopper = this.images.get('chopper');
    if (chopper) this.rotor = splitRotor(chopper);
  }

  get(name: string): HTMLImageElement | undefined {
    return this.images.get(name);
  }
}

/**
 * Cut the chopper's rotor blades out of its sprite so the view can spin them. The blades are the
 * run of rows near the top that span most of the sprite's width; the hub is the narrow run just
 * below them, and stays on the body.
 */
export function splitRotor(img: HTMLImageElement): Rotor {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const body = document.createElement('canvas');
  body.width = w;
  body.height = h;
  const bctx = body.getContext('2d')!;
  bctx.drawImage(img, 0, 0);
  const data = bctx.getImageData(0, 0, w, h);
  const alpha = (x: number, y: number) => data.data[(y * w + x) * 4 + 3];
  const span = (y: number) => {
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < w; x++) if (alpha(x, y) > 0) { if (lo < 0) lo = x; hi = x; }
    return { lo, hi, width: lo < 0 ? 0 : hi - lo + 1 };
  };
  let top = -1;
  let end = -1;
  for (let y = 0; y < Math.min(h, Math.floor(h / 2)); y++) {
    const wide = span(y).width > w * 0.6;
    if (wide && top < 0) top = y;
    if (top >= 0) { if (wide) end = y; else break; }
  }
  const blades = document.createElement('canvas');
  blades.width = w;
  blades.height = h;
  if (top < 0) return { body, blades, hubX: w / 2 };
  const hub = span(Math.min(h - 1, end + 1));
  const hubX = hub.width ? (hub.lo + hub.hi + 1) / 2 : w / 2;
  const hubHalf = hub.width ? hub.width / 2 + 1 : 4;
  const bl = blades.getContext('2d')!;
  const cut = bl.createImageData(w, h);
  for (let y = top; y <= end; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.abs(x + 0.5 - hubX) <= hubHalf) continue; // the hub stays on the body
      const i = (y * w + x) * 4;
      for (let k = 0; k < 4; k++) cut.data[i + k] = data.data[i + k];
      data.data[i + 3] = 0;
    }
  }
  bl.putImageData(cut, 0, 0);
  bctx.putImageData(data, 0, 0);
  return { body, blades, hubX };
}
