// Canvas renderer: reads game state, never writes it. Draw order follows rulebook §3:
// scenery → boat/mine → timer bars → player/shell → hit flash/burst → jets and bombs on top → panels.

import { COLS, Inks, Layout, ROWS, Tunables } from '../sim/config';
import {
  Fx, Game, fuelSegments, lastTick, pinnedLines, tutorialSlots,
} from '../sim/game';
import { panelLines } from '../sim/messages';
import { drawText, textWidth } from './font';
import {
  BOAT, BOAT_OUTLINE, BOMB, CACTUS, CHOPPER, JET_DIVE, JET_LEFT, JET_RIGHT, SHELL, Sprite, TANK, TANK_OUTLINE,
  WRECK_BOMB, WRECK_JET,
} from './sprites';

const T = Layout.tilePx;
const cellX = (c: number) => Layout.playX + c * T;
const cellY = (r: number) => Layout.playY + r * T;

function blit(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number): void {
  ctx.fillStyle = Inks.full;
  for (let r = 0; r < 16; r++) {
    const row = s[r];
    for (let c = 0; c < 16; c++) if (row[c]) ctx.fillRect(x + c, y + r, 1, 1);
  }
}

/** Sprite shifted down by `offset` px, clipped at its cell's bottom (cactus sprout/shrink frames). */
function blitRising(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, offset: number): void {
  ctx.fillStyle = Inks.full;
  for (let r = 0; r + offset < 16; r++) {
    for (let c = 0; c < 16; c++) if (s[r][c]) ctx.fillRect(x + c, y + r + offset, 1, 1);
  }
}

// ---------------------------------------------------------------------------------------------
// Scenery (scenery ink only; never dangerous, never moves in the sky)

let sceneryCache: HTMLCanvasElement | null = null;

function drawStaticScenery(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = Inks.scenery;
  const px = (x: number, y: number, w = 1, h = 1) => ctx.fillRect(x, y, w, h);
  // Sun disc, top-right corner
  const sx = cellX(15) + 4;
  const sy = cellY(0) + 6;
  for (let dy = -7; dy <= 7; dy++) {
    for (let dx = -7; dx <= 7; dx++) {
      const d = dx * dx + dy * dy;
      if (d <= 49 && d >= 30) px(sx + dx, sy + dy);
    }
  }
  // Cloud outlines
  const cloud = (x: number, y: number) => {
    const rows = ['....####......', '..##....##.##.', '.#.........#..#', '#..............#', '.##############.'];
    rows.forEach((r, i) => [...r].forEach((ch, j) => ch === '#' && px(x + j, y + i)));
  };
  cloud(cellX(2), cellY(1) + 4);
  cloud(cellX(9), cellY(3) + 2);
  cloud(cellX(5), cellY(6));
  // Road edge under the tank lane
  for (let x = 0; x < Layout.playW; x += 1) if (x % 8 < 6) px(x, cellY(9) + 15);
  // Ground: dirt-and-grass edge with tufts
  const gy = cellY(10);
  px(0, gy + 9, Layout.playW, 1);
  for (let x = 3; x < Layout.playW; x += 11) {
    px(x, gy + 7, 1, 2);
    px(x + 2, gy + 6, 1, 3);
    px(x + 4, gy + 7, 1, 2);
  }
  for (let x = 7; x < Layout.playW; x += 9) px(x, gy + 12, 2, 1);
  for (let x = 1; x < Layout.playW; x += 13) px(x, gy + 14, 1, 1);
  // Reeds at the bank edges
  for (const c of [1, 16]) {
    const bx = cellX(c) + (c === 1 ? 2 : 8);
    for (let i = 0; i < 3; i++) px(bx + i * 3, cellY(11) + 6 - i, 1, 10 + i);
  }
  // Panel separators
  px(Layout.sideX, Layout.playY, 1, Layout.playH);
  px(0, Layout.topPanelH - 1, Layout.canvasW, 1);
}

function drawTower(ctx: CanvasRenderingContext2D, side: 'L' | 'R', bridge: 0 | 1 | 2): void {
  const x0 = cellX(side === 'L' ? 0 : COLS - 1);
  const y0 = cellY(11);
  ctx.fillStyle = Inks.scenery;
  const px = (x: number, y: number, w = 1, h = 1) =>
    ctx.fillRect(side === 'L' ? x0 + x : x0 + 15 - x - (w - 1), y0 + y, w, h);
  // Tower body with battlements, window and gate
  for (let x = 0; x < 10; x += 3) px(x, 0, 2, 2);
  px(0, 2, 11, 1);
  px(0, 2, 1, 30);
  px(10, 2, 1, 30);
  px(4, 6, 3, 4);
  px(5, 22, 6, 1);
  px(5, 22, 1, 10);
  // Drawbridge: 0 raised, 1 half, 2 lowered
  if (bridge === 0) px(11, 18, 2, 14);
  else if (bridge === 1) for (let i = 0; i < 7; i++) px(11 + i, 30 - i * 2, 2, 2);
  else px(11, 30, 10, 2);
}

function drawRipples(ctx: CanvasRenderingContext2D, frame: number): void {
  ctx.fillStyle = Inks.scenery;
  const rows: [number, number][] = [[11, 6], [11, 13], [12, 9], [13, 5], [13, 14]];
  rows.forEach(([r, off], i) => {
    const y = cellY(r) + off;
    const spacing = 18 + i * 4;
    const shift = (frame * 6 + i * 7) % spacing;
    for (let x = shift + 12; x < Layout.playW - 18; x += spacing) {
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x + 2, y - 1, 2, 1);
      ctx.fillRect(x + 4, y, 2, 1);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// Effects (cosmetic; §4 Impact pacing)

function invertCells(ctx: CanvasRenderingContext2D, c0: number, r0: number, w: number, h: number): void {
  const c1 = Math.max(0, c0);
  const r1 = Math.max(0, r0);
  const c2 = Math.min(COLS, c0 + w);
  const r2 = Math.min(ROWS, r0 + h);
  if (c2 <= c1 || r2 <= r1) return;
  const x = cellX(c1);
  const y = cellY(r1);
  const img = ctx.getImageData(x, y, (c2 - c1) * T, (r2 - r1) * T);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const isBg = d[i] > 150; // background (168) vs inks (34 / 138)
    const v = isBg ? [34, 40, 32] : [168, 178, 150];
    d[i] = v[0];
    d[i + 1] = v[1];
    d[i + 2] = v[2];
  }
  ctx.putImageData(img, x, y);
}

function drawRays(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, dirs: [number, number][]): void {
  ctx.fillStyle = Inks.full;
  for (const [dx, dy] of dirs) {
    for (let k = 6; k <= radius; k += 3) {
      const x = Math.round(cx + dx * k);
      const y = Math.round(cy + dy * k);
      if (x >= 0 && x < Layout.playW && y >= Layout.playY && y < Layout.playY + Layout.playH) ctx.fillRect(x, y, 2, 2);
    }
  }
}

const STAR: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
const FAN: [number, number][] = [[0, -1], [0.5, -0.87], [-0.5, -0.87], [0.87, -0.5], [-0.87, -0.5]];

function drawFx(ctx: CanvasRenderingContext2D, fx: Fx, age: number): void {
  const cx = cellX(fx.col) + 8;
  const cy = cellY(fx.row) + 8;
  switch (fx.kind) {
    case 'shellHit':
    case 'jetHitTank':
      if (age === 0) invertCells(ctx, fx.col - 1, fx.row - 1, 3, 3); // 3×3 flash, 60 ms
      else if (age <= 2) drawRays(ctx, cx, cy, 38, STAR); // 5×5 star burst, 120 ms
      break;
    case 'bombHitTank':
      if (age === 0) invertCells(ctx, fx.col, fx.row - 2, 1, 3); // 1×3 vertical flash
      else if (age <= 2) drawRays(ctx, cx, cy - 8, 40, FAN); // upward splash fan
      break;
    case 'splash':
      if (age <= 5) drawRays(ctx, cx, cy, 10 + age * 2, FAN);
      break;
    default:
      break;
  }
}

// ---------------------------------------------------------------------------------------------
// Panels

function drawTopPanel(ctx: CanvasRenderingContext2D, g: Game): void {
  const col = (c: number) => Layout.panelMargin + c * Layout.cellW;
  const y1 = 4;
  const y2 = 12;
  drawText(ctx, `SCORE ${String(g.score).padStart(6, ' ')}`, col(0), y1, Inks.full);
  drawText(ctx, `LIVES ${g.lives}`, col(14), y1, Inks.full);
  drawText(ctx, `DROWNED ${g.drowned}/3`, col(23), y1, Inks.full);
  const fuel = fuelSegments(g);
  if (fuel !== null) {
    drawText(ctx, 'FUEL', col(36), y1, Inks.full);
    ctx.fillStyle = Inks.full;
    for (let i = 0; i < 8; i++) {
      const x = col(41 + i);
      if (i < fuel) ctx.fillRect(x, y1, 5, 7);
      else {
        ctx.fillRect(x, y1, 5, 1);
        ctx.fillRect(x, y1 + 6, 5, 1);
        ctx.fillRect(x, y1, 1, 7);
        ctx.fillRect(x + 4, y1, 1, 7);
      }
    }
  }
  const [s1, s2] = tutorialSlots(g);
  if (s1) drawText(ctx, s1, col(0), y2, Inks.full);
  if (s2) drawText(ctx, s2, col(11), y2, Inks.full);
}

function drawSidePanel(ctx: CanvasRenderingContext2D, g: Game, displayTick: number): void {
  const lines = panelLines(g.messages, pinnedLines(g), displayTick);
  lines.forEach((text, i) => drawText(ctx, text, Layout.sideX + 4, Layout.playY + i * Layout.sideLinePitch + 4, Inks.full));
}

function drawBar(ctx: CanvasRenderingContext2D, c: number, r: number, left: number, total: number): void {
  const w = Math.max(0, Math.min(16, Math.ceil((16 * left) / total)));
  ctx.fillStyle = Inks.full;
  ctx.fillRect(cellX(c), cellY(r), w, 2);
}

// ---------------------------------------------------------------------------------------------

/**
 * RG-002: the sim stops ticking at game over, so a hit effect's age stops advancing and the killing
 * hit's 60 ms flash froze over the wreck. Effects are timed, so once the run is over none are drawn
 * and the final frame shows the wreck.
 */
export function fxToDraw(g: Game): Fx[] {
  return g.gameOver ? [] : g.fx;
}

export interface Overlay {
  lines: string[];
}

export function render(ctx: CanvasRenderingContext2D, g: Game, overlay: Overlay | null): void {
  const t = Math.max(0, lastTick(g));
  ctx.fillStyle = Inks.background;
  ctx.fillRect(0, 0, Layout.canvasW, Layout.canvasH);

  if (!sceneryCache) {
    sceneryCache = document.createElement('canvas');
    sceneryCache.width = Layout.canvasW;
    sceneryCache.height = Layout.canvasH;
    drawStaticScenery(sceneryCache.getContext('2d')!);
  }
  ctx.drawImage(sceneryCache, 0, 0);
  drawRipples(ctx, Math.floor(t / 12) % 2); // 2-frame ripple, 720 ms

  // Drawbridges lower when a hooked boat reaches that bank (2 × 120 ms, visual only).
  let bridgeL: 0 | 1 | 2 = 0;
  let bridgeR: 0 | 1 | 2 = 0;
  for (const f of g.fx) {
    if (f.kind !== 'drawbridge') continue;
    const age = t - f.tick;
    const state: 0 | 1 | 2 = age < 2 ? 1 : age < 16 ? 2 : age < 18 ? 1 : 0;
    if (f.col === 0) bridgeL = state;
    else bridgeR = state;
  }
  drawTower(ctx, 'L', bridgeL);
  drawTower(ctx, 'R', bridgeR);

  // Boat, mine and their timer bars
  const boat = g.boat;
  if (boat) {
    const frames = boat.tutorial ? BOAT_OUTLINE : BOAT;
    const frame = boat.hooked ? frames[0] : frames[Math.floor(t / 8) % 2];
    blit(ctx, frame, cellX(boat.col), cellY(boat.row));
  }
  if (g.mine) {
    const age = t - g.mine.spawnTick;
    blitRising(ctx, CACTUS, cellX(g.mine.col), cellY(10), age < 2 ? 10 : age < 4 ? 5 : 0);
  }
  for (const f of g.fx) {
    if (f.kind !== 'mineShrink') continue;
    const age = t - f.tick;
    if (age < 6) blitRising(ctx, CACTUS, cellX(f.col), cellY(10), age < 2 ? 5 : age < 4 ? 10 : 13);
  }
  if (boat && !boat.hooked) drawBar(ctx, boat.col, boat.row, boat.drownLeft, boat.drownTotal);
  if (g.mine) drawBar(ctx, g.mine.col, 10, g.mine.lifeLeft, Tunables.mineLifetimeMs);

  // Player
  const p = g.player;
  if (p.mode === 'chopperFree' || p.mode === 'chopperHooked') {
    blit(ctx, CHOPPER[Math.floor(t / 2) % 2], cellX(p.col), cellY(p.row));
    if (p.mode === 'chopperHooked') {
      ctx.fillStyle = Inks.full;
      ctx.fillRect(cellX(p.col) + 7, cellY(p.row) + 11, 1, 5 + 3); // cable down to the hooked boat
    }
  } else {
    const blink = p.invulnLeft > 0 && !p.wreck && Math.floor(t / 2) % 2 === 1;
    const sprite = p.wreck === 'bomb' ? WRECK_BOMB : p.wreck ? WRECK_JET : blink ? TANK_OUTLINE : TANK;
    blit(ctx, sprite, cellX(p.col), cellY(p.row));
  }
  if (g.shell) blit(ctx, SHELL, cellX(g.shell.col), cellY(g.shell.row));

  for (const f of fxToDraw(g)) drawFx(ctx, f, t - f.tick);

  // Threats always on top of every flash, burst and splash.
  for (const b of g.bombs) blit(ctx, BOMB, cellX(b.col), cellY(b.row));
  for (const j of g.jets) {
    const s = j.path === 'dive' ? JET_DIVE : j.dir < 0 ? JET_LEFT : JET_RIGHT;
    blit(ctx, s, cellX(j.col), cellY(j.row));
  }

  drawTopPanel(ctx, g);
  drawSidePanel(ctx, g, t);

  if (overlay) {
    const w = Math.max(...overlay.lines.map(textWidth)) + 16;
    const h = overlay.lines.length * 12 + 10;
    const x = Math.floor((Layout.playW - w) / 2);
    const y = Layout.playY + Math.floor((Layout.playH - h) / 2);
    ctx.fillStyle = Inks.background;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = Inks.full;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
    overlay.lines.forEach((line, i) => {
      drawText(ctx, line, x + Math.floor((w - textWidth(line)) / 2), y + 6 + i * 12, Inks.full);
    });
  }
}
