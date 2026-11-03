// Code-drawn stand-ins for look B (?look=b): everything that has no generated art yet. Each one is
// a small, separate function, so it is replaced by its sprite (sprites.ts) the moment the art is
// built. They use the game palette, a dark brown outline and two or three tones of shading, so the
// preview can be judged as a whole. Units: art px (one tile = 96).

import { ROOM_H, ROOM_W } from '../sim/config';
import { C } from '../view/palette';

export const T = 96; // art px per tile
export const OUTLINE = '#2e1e16';
const LINE = 4; // outline thickness, art px

export const css = (hex: number, a = 1) => {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
};
/** Multiply a colour's brightness: k < 1 darker, k > 1 lighter. */
export const shade = (hex: number, k: number) => {
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return (f((hex >> 16) & 255) << 16) | (f((hex >> 8) & 255) << 8) | f(hex & 255);
};
export function hash(a: number, b: number, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type Ctx = CanvasRenderingContext2D;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
/** Fill a path with a colour, a top-left highlight band and a dark outline. */
function solid(ctx: Ctx, fill: number, line = LINE): void {
  ctx.fillStyle = css(fill);
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

// ---------------------------------------------------------------- terrain

const isSolidCh = (ch: string | undefined) => ch === '#' || ch === 'H' || ch === 'x' || ch === 'W';

/** Generated tile art (public/art/tile-*.png), when it exists. */
export interface TileArt { grass?: HTMLImageElement; soil?: HTMLImageElement; stone?: HTMLImageElement; dock?: HTMLImageElement }

interface TilePattern { pattern: CanvasPattern; blades: number }

/**
 * A tile image as a repeating pattern, scaled uniformly. Tiles are drawn as patterns anchored to
 * the room, so a run of the same tile stays continuous (the art tiles left to right) and nothing
 * is stretched unevenly. With fillHeight, the solid part (below any transparent top, such as grass
 * blades) is scaled to fill the cell, and the blades stick up into the cell above.
 */
function tilePattern(ctx: Ctx, img: HTMLImageElement, fillHeight: boolean): TilePattern {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const probe = document.createElement('canvas');
  probe.width = w;
  probe.height = h;
  const pc = probe.getContext('2d')!;
  pc.drawImage(img, 0, 0);
  const a = pc.getImageData(0, 0, w, h).data;
  let body = 0; // the first (nearly) fully opaque row: where the solid part starts
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 0) n++;
    if (n >= w * 0.95) { body = y; break; }
  }
  const k = fillHeight ? T / (h - body) : T / h;
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * k);
  cv.height = Math.round(h * k);
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, 0, 0, cv.width, cv.height);
  return { pattern: ctx.createPattern(cv, 'repeat')!, blades: fillHeight ? Math.round(body * k) : 0 };
}

function fillTile(ctx: Ctx, tp: TilePattern, x: number, y: number): void {
  tp.pattern.setTransform(new DOMMatrix().translate(0, y - tp.blades));
  ctx.fillStyle = tp.pattern;
  ctx.fillRect(x, y - tp.blades, T, T + tp.blades);
}

/**
 * The room's static ground (soil, rock, grass caps, docks) drawn once into its own canvas, plus
 * three tiles of bedrock below the room under solid ground and water (not under pits, which you
 * fall out of).
 */
export function drawTerrain(tiles: string[][], tileArt: TileArt = {}): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = ROOM_W * T;
  cv.height = (ROOM_H + 3) * T;
  const ctx = cv.getContext('2d')!;
  const pat = {
    grass: tileArt.grass && tilePattern(ctx, tileArt.grass, true),
    soil: tileArt.soil && tilePattern(ctx, tileArt.soil, false),
    stone: tileArt.stone && tilePattern(ctx, tileArt.stone, false),
    dock: tileArt.dock && tilePattern(ctx, tileArt.dock, false),
  };
  const grassCells: [number, number][] = [];
  const at = (c: number, r: number) => {
    if (c < 0) c = 0;
    if (c >= ROOM_W) c = ROOM_W - 1; // the room continues past its edges
    if (r >= ROOM_H) return tiles[ROOM_H - 1][c] === '.' ? '.' : '#';
    return r < 0 ? '.' : tiles[r][c];
  };
  for (let col = 0; col < ROOM_W; col++) {
    let depth = -1;
    for (let row = 0; row < ROOM_H + 3; row++) {
      const ch = at(col, row);
      const x = col * T;
      const y = row * T;
      if (ch === '#') {
        depth = isSolidCh(at(col, row - 1)) || at(col, row - 1) === '~' ? depth + 1 : 0;
        const top = !isSolidCh(at(col, row - 1)) && at(col, row - 1) !== '~';
        const rocky = depth >= 2 || row >= ROOM_H; // horizontal layers: grass, soil, then stone
        const tp = top ? pat.grass : rocky ? pat.stone : pat.soil;
        if (top && tp) grassCells.push([x, y]); // drawn last, so the blades lie over the cell above
        else if (tp) fillTile(ctx, tp, x, y);
        else soilTile(ctx, x, y, col, row, depth, top);
      } else if (ch === 'W') {
        // Castle wall: solid stone from the gate tower up to the top of the room.
        depth = 2;
        if (pat.stone) fillTile(ctx, pat.stone, x, y);
        else soilTile(ctx, x, y, col, row, 3, false);
      } else if (ch === 'H') {
        depth = 0;
        if (pat.dock) fillTile(ctx, pat.dock, x, y);
        else dockTile(ctx, x, y, col);
      } else if (ch !== 'x') {
        depth = -1;
      }
    }
  }
  for (const [x, y] of grassCells) fillTile(ctx, pat.grass!, x, y);
  // Outline wherever ground meets air or water, with a darker inside edge on the right faces. With
  // tile art the top edge is the art itself (grass blades), so only sides and bottoms get lines.
  const hasArt = !!pat.grass;
  ctx.fillStyle = OUTLINE;
  for (let col = 0; col < ROOM_W; col++) {
    for (let row = 0; row < ROOM_H + 3; row++) {
      const ch = at(col, row);
      if (ch !== '#' && ch !== 'H' && ch !== 'W') continue;
      const x = col * T;
      const y = row * T;
      const open = (c: number, r: number) => !isSolidCh(at(c, r));
      if (open(col, row - 1) && !hasArt) ctx.fillRect(x, y, T, LINE);
      if (row < ROOM_H && open(col - 1, row) && col > 0) ctx.fillRect(x, y, LINE, T);
      if (row < ROOM_H && open(col + 1, row) && col < ROOM_W - 1) {
        ctx.fillStyle = css(C.soilDark, 0.6);
        ctx.fillRect(x + T - 14, y + (open(col, row - 1) ? 22 : 0), 10, T);
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x + T - LINE, y, LINE, T);
      }
      if (row < ROOM_H - 1 && open(col, row + 1) && at(col, row + 1) !== '~') ctx.fillRect(x, y + T - LINE, T, LINE);
    }
  }
  return cv;
}

function soilTile(ctx: Ctx, x: number, y: number, col: number, row: number, depth: number, top: boolean): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - 16, T, T + 16); // keep stones inside the tile (tufts may poke up above it)
  ctx.clip();
  soilTileInner(ctx, x, y, col, row, depth, top);
  ctx.restore();
}

function soilTileInner(ctx: Ctx, x: number, y: number, col: number, row: number, depth: number, top: boolean): void {
  const rocky = depth >= 3 || (depth === 2 && hash(col, row) > 0.5);
  const base = depth <= 1 ? C.soil : rocky ? C.rock : C.soilDark;
  ctx.fillStyle = css(base);
  ctx.fillRect(x, y, T, T);
  if (rocky) {
    // Stone blocks with mortar lines and a lit top edge on each block.
    const off = row % 2 ? T / 2 : 0;
    for (let i = -1; i < 2; i++) {
      const bx = x + off + i * (T / 2) * 2;
      ctx.fillStyle = css(shade(base, 1.08 + hash(col, row, i) * 0.06));
      ctx.fillRect(bx + 3, y + 3, T - 6, T / 2 - 6);
      ctx.fillRect(bx + 3 - T / 2, y + T / 2 + 3, T - 6, T / 2 - 6);
    }
    ctx.fillStyle = css(C.rockDark);
    ctx.fillRect(x, y + T / 2 - 2, T, 4);
  } else {
    // Clods, pebbles and roots.
    for (let i = 0; i < 4; i++) {
      const h = hash(col, row, i + 3);
      const px = x + 8 + hash(col, row, i + 11) * (T - 28);
      const py = y + (top ? 30 : 8) + hash(col, row, i + 19) * (T - (top ? 44 : 24));
      roundRect(ctx, px, py, 10 + h * 14, 6 + h * 6, 4);
      ctx.fillStyle = css(h > 0.7 ? shade(C.stone, 0.95) : shade(base, 0.82));
      ctx.fill();
      if (h > 0.7) { ctx.fillStyle = css(shade(C.stone, 1.25)); ctx.fillRect(px + 3, py + 1, 6, 2); }
    }
  }
  if (top) {
    // Grass cap: a lit top, a scalloped lower edge, tufts and the odd flower.
    ctx.fillStyle = css(C.grassDark);
    ctx.fillRect(x, y, T, 24);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x + 12 + i * 24, y + 24, 9 + hash(col, row, i) * 4, 0, Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = css(C.grass);
    ctx.fillRect(x, y, T, 18);
    ctx.fillStyle = css(shade(C.grass, 1.25));
    ctx.fillRect(x, y + 2, T, 6);
    ctx.fillStyle = css(shade(C.soil, 0.7));
    ctx.fillRect(x, y + 30, T, 4);
    for (let i = 0; i < 3; i++) {
      const h = hash(col, row, i + 7);
      if (h < 0.5) continue;
      const tx = x + 14 + i * 30 + h * 8;
      ctx.beginPath();
      ctx.moveTo(tx - 6, y + 2);
      ctx.lineTo(tx - 2, y - 10 - h * 6);
      ctx.lineTo(tx + 1, y + 2);
      ctx.lineTo(tx + 5, y - 7 - h * 5);
      ctx.lineTo(tx + 8, y + 2);
      ctx.closePath();
      ctx.fillStyle = css(h > 0.92 ? C.peg1 : C.grassDark);
      ctx.fill();
    }
  }
}

function dockTile(ctx: Ctx, x: number, y: number, col: number): void {
  ctx.fillStyle = css(shade(C.soilDark, 0.8));
  ctx.fillRect(x, y + 20, T, T - 20);
  // Posts
  for (const px of [14, T - 30]) {
    ctx.fillStyle = css(C.woodDark);
    ctx.fillRect(x + px, y + 18, 16, T - 18);
    ctx.fillStyle = css(shade(C.woodDark, 1.2));
    ctx.fillRect(x + px + 2, y + 18, 4, T - 18);
  }
  // Plank deck with seams and a lit top
  ctx.fillStyle = css(C.wood);
  ctx.fillRect(x, y, T, 22);
  ctx.fillStyle = css(shade(C.wood, 1.25));
  ctx.fillRect(x, y + 3, T, 4);
  ctx.fillStyle = OUTLINE;
  for (let i = 1; i < 3; i++) ctx.fillRect(x + i * 32 + (col % 2) * 8, y, 3, 22);
  ctx.fillRect(x, y + 20, T, 4);
}

/** A cracked floor tile that crumbles once you stand on it: grey stone, dark cracks, a glow. */
export function cracked(ctx: Ctx, x: number, y: number): void {
  roundRect(ctx, x + 2, y + 2, T - 4, T - 4, 6);
  solid(ctx, C.stone);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 18, y + 8); ctx.lineTo(x + 40, y + 40); ctx.lineTo(x + 30, y + 70);
  ctx.moveTo(x + 40, y + 40); ctx.lineTo(x + 72, y + 52); ctx.lineTo(x + 84, y + 84);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,161,74,0.9)';
  ctx.fillRect(x + 8, y + 4, T - 16, 4);
}

/** The generated cracked tile, cropped to a square and scaled into the cell. */
export function crackedArt(ctx: Ctx, img: HTMLImageElement, x: number, y: number): void {
  const h = img.naturalHeight;
  ctx.drawImage(img, (img.naturalWidth - h) / 2, 0, h, h, x, y, T, T);
}

/**
 * The generated bridge. Its tile is a framed plank panel between two posts, not a repeating tile,
 * so the span is built from the left post, the plank section repeated, and the right post. It
 * pivots at its left end like the placeholder; raise 0 = down, 1 = up.
 */
export function bridgeArt(ctx: Ctx, img: HTMLImageElement, x: number, y: number, len: number, raise: number): void {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const k = T / h;
  const post = Math.round(w * 0.14); // the posts are the outer 14% on each side
  const mid = w - 2 * post;
  const L = len * T;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-raise * 1.35);
  const top = -Math.round(h * 0.13) * k; // the panel's top beam sits on the walking surface
  ctx.drawImage(img, 0, 0, post, h, 0, top, post * k, h * k);
  const end = L - post * k;
  const step = mid * k;
  for (let px = post * k; px < end - 0.5; px += step) {
    const dw = Math.min(step, end - px);
    ctx.drawImage(img, post, 0, (dw / step) * mid, h, px, top, dw, h * k);
  }
  ctx.drawImage(img, w - post, 0, post, h, end, top, post * k, h * k);
  ctx.restore();
}

/**
 * The generated drawbridge deck (bridge.png: a long plank beam with iron bands and a chain ring at
 * each end): its ends are drawn once and its middle repeated along the span. Hinged at its left end,
 * it stands up as a raised drawbridge until the target is hit, and lies flat as a deck once lowered.
 */
export function bridgeDeckArt(ctx: Ctx, img: HTMLImageElement, x: number, y: number, len: number, raise: number): void {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const k = (T * 0.62) / h; // the beam is a little over half a tile thick
  const end = Math.round(w * 0.12); // a ring and the first band at each end
  const mid = w - 2 * end;
  const L = len * T;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-raise * 1.35);
  const top = -h * k * 0.12; // the rings stick up a little above the walking surface
  ctx.drawImage(img, 0, 0, end, h, 0, top, end * k, h * k);
  const stop = L - end * k;
  const step = mid * k;
  for (let px = end * k; px < stop - 0.5; px += step) {
    const dw = Math.min(step, stop - px);
    ctx.drawImage(img, end, 0, (dw / step) * mid, h, px, top, dw, h * k);
  }
  ctx.drawImage(img, w - end, 0, end, h, stop, top, end * k, h * k);
  ctx.restore();
}

/** Water: a translucent body from the surface down, a moving wavy top, foam and glints. */
export function water(ctx: Ctx, x: number, w: number, surface: number, bottom: number, t: number): void {
  const wave = (px: number) => surface + Math.sin(px * 0.045 + t * 2.1) * 3 + Math.sin(px * 0.11 - t * 1.4) * 2;
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  for (let px = x; px <= x + w; px += 8) ctx.lineTo(px, wave(px));
  ctx.lineTo(x + w, bottom);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, surface, 0, bottom);
  g.addColorStop(0, css(C.water, 0.62));
  g.addColorStop(1, css(C.waterDeep, 0.85));
  ctx.fillStyle = g;
  ctx.fill();
  // Foam line along the top
  ctx.beginPath();
  for (let px = x; px <= x + w; px += 8) (px === x ? ctx.moveTo(px, wave(px)) : ctx.lineTo(px, wave(px)));
  ctx.strokeStyle = css(C.foam, 0.95);
  ctx.lineWidth = 4;
  ctx.stroke();
  // Glints drifting along
  ctx.fillStyle = css(C.foam, 0.55);
  for (let i = 0; i < w / 60; i++) {
    const gx = x + ((i * 60 + t * 18) % w);
    ctx.fillRect(gx, wave(gx) + 14 + (i % 3) * 18, 16, 3);
  }
}

/** The drawbridge: planks pivoting at their left end; `raise` 0 = down, 1 = up. */
export function bridge(ctx: Ctx, x: number, y: number, len: number, raise: number): void {
  ctx.fillStyle = css(C.woodDark);
  roundRect(ctx, x - 22, y - 2 * T, 16, 2 * T + 20, 4);
  solid(ctx, C.woodDark);
  const L = len * T;
  const a = raise * 1.35;
  // The chain from the bridge's far end up to the post top
  ctx.strokeStyle = '#8a8a90';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(x + (L - 6) * Math.cos(a), y - (L - 6) * Math.sin(a));
  ctx.lineTo(x - 14, y - 2 * T + 6);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-a);
  for (let i = 0; i < len * 3; i++) {
    roundRect(ctx, i * 32 + 1, 0, 30, 20, 3);
    solid(ctx, i % 2 ? C.wood : shade(C.wood, 0.9), 3);
  }
  ctx.fillStyle = css(C.woodDark);
  ctx.fillRect(0, 20, L, 6);
  ctx.restore();
}

/** The castle tower behind a gate, with its dark archway. */
export function gateTower(ctx: Ctx, x: number, top: number, bottom: number, archTop: number): void {
  const w = 1.45 * T;
  const left = x - w / 2;
  ctx.beginPath();
  ctx.rect(left, top, w, bottom - top);
  solid(ctx, C.stone);
  ctx.fillStyle = css(C.stoneDark);
  for (let y = top + 40; y < bottom; y += 48) {
    ctx.fillRect(left + LINE, y, w - 2 * LINE, 4);
    for (let bx = left + ((y / 48) % 2 ? 24 : 48); bx < left + w - 8; bx += 48) ctx.fillRect(bx, y - 44, 4, 44);
  }
  // Battlements and roof above
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.rect(left + 6 + i * 46, top - 30, 34, 34); solid(ctx, C.stone); }
  ctx.beginPath();
  ctx.moveTo(left - 10, top - 30); ctx.lineTo(x, top - 30 - 1.1 * T); ctx.lineTo(left + w + 10, top - 30); ctx.closePath();
  solid(ctx, C.roof);
  // Archway
  ctx.beginPath();
  ctx.moveTo(x - 44, bottom);
  ctx.lineTo(x - 44, archTop + 30);
  ctx.arc(x, archTop + 30, 44, Math.PI, 0);
  ctx.lineTo(x + 44, bottom);
  ctx.closePath();
  ctx.fillStyle = '#1e1612';
  ctx.fill();
}

/** The portcullis grille, drawn from its top edge down `h` art px. */
export function portcullis(ctx: Ctx, x: number, top: number, h: number): void {
  ctx.fillStyle = OUTLINE;
  for (let i = 0; i < 4; i++) ctx.fillRect(x - 40 + i * 25, top, 9, h);
  for (let y = top + 18; y < top + h; y += 40) ctx.fillRect(x - 44, y, 88, 8);
  ctx.fillStyle = css(C.woodDark);
  for (let i = 0; i < 4; i++) ctx.fillRect(x - 38 + i * 25, top, 4, h);
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 40 + i * 25, top + h); ctx.lineTo(x - 35.5 + i * 25, top + h + 12); ctx.lineTo(x - 31 + i * 25, top + h); ctx.fill(); }
}

// ---------------------------------------------------------------- things (origin: bottom centre)

export function crate(ctx: Ctx, w: number, h: number): void {
  roundRect(ctx, -w / 2, -h, w, h, 6);
  solid(ctx, C.wood);
  ctx.fillStyle = css(C.woodDark);
  ctx.fillRect(-w / 2 + 4, -h + 4, w - 8, 12);
  ctx.fillRect(-w / 2 + 4, -16, w - 8, 12);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2 + 16, -h + 16, w - 32, h - 32);
  ctx.clip();
  ctx.strokeStyle = css(C.woodDark);
  ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, -h); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = css(shade(C.wood, 1.25));
  ctx.fillRect(-w / 2 + 8, -h + 6, w - 16, 3);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = LINE;
  roundRect(ctx, -w / 2, -h, w, h, 6);
  ctx.stroke();
}

export function cactus(ctx: Ctx): void {
  const lobe = (x: number, y: number, w: number, h: number) => { roundRect(ctx, x - w / 2, y - h, w, h, w / 2); solid(ctx, C.cactus); };
  lobe(-28, -34, 18, 34); // left arm
  ctx.beginPath(); ctx.rect(-28, -30, 20, 12); solid(ctx, C.cactus);
  lobe(26, -46, 18, 30); // right arm
  ctx.beginPath(); ctx.rect(8, -42, 20, 12); solid(ctx, C.cactus);
  lobe(0, 0, 30, 88); // trunk
  ctx.fillStyle = css(shade(C.cactus, 1.3));
  ctx.fillRect(-8, -80, 5, 70);
  ctx.fillStyle = css(shade(C.cactus, 0.75));
  ctx.fillRect(5, -78, 5, 72);
  ctx.fillStyle = css(C.red);
  for (const [x, y] of [[0, -90], [-28, -70], [26, -78], [-14, -50], [14, -26], [-14, -16]]) {
    ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x, y - 6); ctx.lineTo(x + 4, y + 4); ctx.fill();
  }
}

export function mine(ctx: Ctx, blink: boolean): void {
  const r = 28;
  ctx.fillStyle = css(C.mine);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(0, -r - 2);
    ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-5, -r + 2); ctx.lineTo(0, -r - 12); ctx.lineTo(5, -r + 2); ctx.closePath();
    solid(ctx, C.mine, 3);
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, -r - 2, r, 0, Math.PI * 2);
  solid(ctx, C.mine);
  ctx.fillStyle = css(shade(C.mine, 1.6));
  ctx.beginPath(); ctx.arc(-10, -r - 12, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = blink ? css(C.red) : css(shade(C.red, 0.45));
  ctx.beginPath(); ctx.arc(0, -2 * r - 6, 7, 0, Math.PI * 2); ctx.fill();
}

/** The target: a rope from above and a ringed board hanging from its top edge (origin: pivot). */
export function target(ctx: Ctx, swing: number): void {
  ctx.fillStyle = css(C.woodDark);
  ctx.fillRect(-2, -3 * T, 4, 3 * T);
  const k = Math.cos(swing); // the board turning up towards the viewer flattens it
  ctx.save();
  ctx.scale(1, Math.max(0.12, Math.abs(k)));
  ctx.translate(0, 42 * Math.sign(k || 1));
  const rings: [number, number][] = [[40, C.wood], [34, C.cream], [25, C.red], [15, C.cream], [7, C.red]];
  rings.forEach(([r, col], i) => { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); i === 0 ? solid(ctx, col) : (ctx.fillStyle = css(col), ctx.fill()); });
  ctx.restore();
}

export function shell(ctx: Ctx): void {
  roundRect(ctx, -9, -30, 18, 30, 4);
  solid(ctx, C.brass, 3);
  ctx.beginPath(); ctx.moveTo(-9, -28); ctx.lineTo(0, -44); ctx.lineTo(9, -28); ctx.closePath();
  solid(ctx, C.red, 3);
}

export function charge(ctx: Ctx, spin: number): void {
  ctx.save();
  ctx.translate(0, -18);
  ctx.rotate(spin);
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2);
  solid(ctx, C.bomb);
  ctx.fillStyle = css(C.red);
  ctx.fillRect(-18, -4, 36, 8);
  ctx.restore();
}

/** A stand-in for a hero or boat sprite that hasn't loaded: a shaded rounded block. */
export function blob(ctx: Ctx, w: number, h: number, fill: number): void {
  roundRect(ctx, -w / 2, -h, w, h, 14);
  solid(ctx, fill);
  ctx.fillStyle = css(shade(fill, 1.3));
  ctx.fillRect(-w / 2 + 10, -h + 8, w - 20, 6);
}

/** The stand-in for each sprite in SPRITES (sprites.ts), checked by tests/art.test.ts. */
export const PLACEHOLDERS: Record<string, (...args: never[]) => void> = {
  tank: blob, chopper: blob, boat: blob, crate, cactus, mine, target, gate: gateTower,
  'tile-grass': soilTile, 'tile-soil': soilTile, 'tile-stone': soilTile, 'tile-cracked': cracked,
  'tile-dock': dockTile, 'tile-bridge': bridge,
};
