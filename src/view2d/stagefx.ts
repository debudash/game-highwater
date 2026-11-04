// Stage things for the 2D view: jets, bombs and their ground shadows, the dive warning, wind
// streaks, night rain and lightning, and the ghost hint. All in art px (1 tile = 96), drawn in the
// room's coordinates. Generated art is used where it exists (jet, bomb), with code fallbacks.

import { Bomb, Bomber, Jet, ROOM_H, ROOM_PX_H, ROOM_PX_W, ROOM_W, TILE } from '../sim/config';
import type { BombState, BomberState, JetState, RoomState } from '../sim/game';
import { isSolidTile, tileAt } from '../sim/game';
import { C } from '../view/palette';
import { OUTLINE, T, css } from './placeholders';

type Ctx = CanvasRenderingContext2D;
const S = T / TILE;

/** Stage background by the room's light preset (decision: map, don't tint). */
export const BG_BY_LIGHT: Record<string, string> = {
  morning: 'bg-riverside', noon: 'bg-jetalley', afternoon: 'bg-floodplain',
  dusk: 'bg-minefield', night: 'bg-storm', dawn: 'bg-dawn',
};

/** Art px scale for the jet and bomb sprites. */
const JET_SCALE = (Jet.w * S * 1.05) / 106;
const BOMB_SCALE = (Bomb.h * S * 1.15) / 114;

/** Top of the ground or water under x (sim px), searching down from y; the room bottom if none. */
export function groundUnder(room: RoomState, x: number, y: number): number {
  if (x < 0 || x >= ROOM_PX_W) return ROOM_PX_H; // off the room's edge: no ground (the sim's wall at x < 0 isn't ground)
  const col = Math.floor(x / TILE);
  for (let row = Math.max(0, Math.floor(y / TILE)); row < ROOM_H; row++) {
    if (isSolidTile(room, col, row) || tileAt(room, col, row) === '~') return row * TILE;
  }
  return ROOM_PX_H;
}

/** A soft dark ellipse on the ground: bigger and darker the closer the thing above it is. */
function shadow(ctx: Ctx, x: number, groundY: number, height: number, size: number): void {
  const k = Math.max(0, Math.min(1, 1 - height / (ROOM_PX_H * S)));
  ctx.fillStyle = `rgba(30,20,15,${0.15 + 0.35 * k})`;
  ctx.beginPath();
  ctx.ellipse(x, groundY - 2, size * (0.5 + 0.6 * k), size * 0.18 * (0.6 + 0.5 * k), 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBombs(ctx: Ctx, room: RoomState, bombs: BombState[], img: HTMLImageElement | undefined): void {
  for (const b of bombs) {
    const x = (b.x + b.w / 2) * S;
    const ground = groundUnder(room, b.x + b.w / 2, b.y + b.h) * S;
    shadow(ctx, x, ground, ground - (b.y + b.h) * S, 60);
  }
  for (const b of bombs) {
    const x = (b.x + b.w / 2) * S;
    const bottom = (b.y + b.h) * S;
    if (img) {
      const w = img.naturalWidth * BOMB_SCALE;
      const h = img.naturalHeight * BOMB_SCALE;
      ctx.drawImage(img, x - w / 2, bottom - h, w, h);
    } else {
      ctx.fillStyle = css(C.bomb);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x, bottom - 26, 16, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = css(C.red);
      ctx.fillRect(x - 16, bottom - 30, 32, 8);
    }
  }
}

/** The jet sprite (or a placeholder) at the current origin, nose along +x, centred. */
function jetBody(ctx: Ctx, img: HTMLImageElement | undefined, t: number): void {
  const w = img ? img.naturalWidth * JET_SCALE : Jet.w * S;
  const h = img ? img.naturalHeight * JET_SCALE : Jet.h * S;
  // A flickering exhaust flame behind it (the art's own glow is faint).
  const f = 0.8 + Math.sin(t * 40) * 0.2;
  const g = ctx.createRadialGradient(-w * 0.5, h * 0.05, 2, -w * 0.5, h * 0.05, 34 * f);
  g.addColorStop(0, 'rgba(255,240,180,0.95)');
  g.addColorStop(0.4, 'rgba(255,150,60,0.75)');
  g.addColorStop(1, 'rgba(255,90,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(-w * 0.55, h * 0.05, 34 * f, 12 * f, 0, 0, Math.PI * 2);
  ctx.fill();
  if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
  else {
    ctx.fillStyle = css(C.jet);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = css(C.red);
    ctx.beginPath();
    ctx.ellipse(w * 0.35, 0, w * 0.15, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawJets(ctx: Ctx, room: RoomState, jets: JetState[], img: HTMLImageElement | undefined, t: number): void {
  for (const j of jets) {
    if (!j.alive || j.phase === 'wait') continue;
    const x = (j.x + j.w / 2) * S;
    const y = (j.y + j.h / 2) * S;
    if (j.phase === 'warn') {
      drawWarning(ctx, j.aimX * S, j.timer / Jet.warnTicks, t);
      continue;
    }
    // Shadow on the ground below it.
    const ground = groundUnder(room, j.x + j.w / 2, j.y + j.h) * S;
    if (ground < ROOM_PX_H * S) shadow(ctx, x, ground, ground - y, 110);
    ctx.save();
    ctx.translate(x, y);
    if (j.kind === 'cross') {
      ctx.scale(j.dir, 1);
      ctx.rotate(Math.sin(t * 3 + j.id) * 0.03);
    } else if (j.phase === 'dive') {
      ctx.rotate(Math.PI / 2); // nose straight down
    } else {
      ctx.scale(j.dir, 1);
      ctx.rotate(-0.55); // climbing away
    }
    // The harmless jet (stage 1's taste) is a different colour from the ones that bomb you.
    if (j.harmless) ctx.filter = 'hue-rotate(150deg) saturate(1.2) brightness(1.1)';
    jetBody(ctx, img, t);
    ctx.filter = 'none';
    ctx.restore();
  }
}

/**
 * The dive warning: a red marker at the top of the room over the column it will dive down, and a
 * faint red band down that column, pulsing faster as the dive nears.
 */
function drawWarning(ctx: Ctx, x: number, left: number, t: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(t * (10 + (1 - left) * 18));
  const g = ctx.createLinearGradient(0, 0, 0, ROOM_PX_H * S);
  g.addColorStop(0, `rgba(230,60,40,${0.22 + 0.18 * pulse})`);
  g.addColorStop(1, 'rgba(230,60,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 60, 0, 120, ROOM_PX_H * S);
  // A chevron pointing down with an exclamation mark.
  ctx.save();
  ctx.translate(x, 30);
  ctx.fillStyle = css(C.red);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-34, -20); ctx.lineTo(34, -20); ctx.lineTo(0, 32); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = css(C.cream);
  ctx.fillRect(-5, -14, 10, 22);
  ctx.fillRect(-5, 12, 10, 8);
  ctx.restore();
}

/** Wind streaks blowing across the room while a gust is on (wind in sim px/s, + is right). */
export function drawWind(ctx: Ctx, wind: number, maxWind: number, t: number): void {
  if (!wind) return;
  const a = Math.min(1, Math.abs(wind) / Math.max(1, maxWind));
  const W = ROOM_W * T;
  ctx.strokeStyle = `rgba(235,240,245,${0.35 * a})`;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const y = ((i * 197) % (ROOM_H * T - 60)) + 20;
    const speed = 900 + (i % 5) * 160;
    const len = 80 + (i % 4) * 40;
    let x = ((i * 389 + t * speed) % (W + 400)) - 200;
    if (wind < 0) x = W - x;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.sign(wind) * len, y + Math.sin(t * 3 + i) * 6);
    ctx.stroke();
  }
}

/** Night rain in screen space, slanted by the wind, with a rare lightning flash. */
export function drawRain(ctx: Ctx, cw: number, ch: number, wind: number, t: number): void {
  const slant = 0.25 + wind * 0.006;
  ctx.strokeStyle = 'rgba(190,210,240,0.35)';
  ctx.lineWidth = Math.max(1, cw / 900);
  ctx.beginPath();
  const n = 140;
  for (let i = 0; i < n; i++) {
    const sx = (i * 7919) % cw;
    const speed = ch * (1.6 + (i % 7) * 0.08);
    const y = ((i * 3571) % ch + t * speed) % (ch + 40) - 20;
    const x = (sx + y * slant) % cw;
    const len = ch * 0.03;
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * slant, y - len);
  }
  ctx.stroke();
  // Lightning: two quick flashes every ~7 s.
  const phase = t % 7.3;
  const flash = phase < 0.08 || (phase > 0.16 && phase < 0.22) ? 0.35 : 0;
  if (flash) {
    ctx.fillStyle = `rgba(230,235,255,${flash})`;
    ctx.fillRect(0, 0, cw, ch);
  }
}

/** Art px scale for the Bomber sprite (225 px wide art over a 44 px sim box, drawn a little larger). */
const BOMBER_SCALE = (Bomber.w * S * 1.3) / 225;

/**
 * The Bomber. In its fighting rooms it flies in front of everything, flashing white after a hit, its
 * hatch glowing in the lake room (that's where to hit it). Beaten, it noses down trailing smoke. In
 * the last room (`far`) it limps across in the distance behind the terrain, an engine on fire.
 */
export function drawBomber(ctx: Ctx, room: RoomState, b: BomberState, img: HTMLImageElement | undefined, t: number, far: boolean): void {
  if (b.phase === 'wait' || b.phase === 'gone' || far !== (b.mode === 'flee')) return;
  const x = (b.x + b.w / 2) * S;
  const y = (b.y + b.h / 2) * S;
  const k = far ? 0.6 : 1;
  const w = (img ? img.naturalWidth * BOMBER_SCALE : b.w * S * 1.3) * k;
  const h = (img ? img.naturalHeight * BOMBER_SCALE : b.h * S * 1.3) * k;
  const burning = far || b.phase === 'down';
  if (!far) {
    const ground = groundUnder(room, b.x + b.w / 2, b.y + b.h) * S;
    if (ground < ROOM_PX_H * S) shadow(ctx, x, ground, ground - y, 260);
  }
  // A smoke trail behind it when it's burning: puffs that drift up and fade.
  if (burning) {
    for (let i = 0; i < 9; i++) {
      const age = (t * 1.6 + i / 9) % 1;
      const px = x - b.dir * (w * 0.2 + age * 260 * k);
      const py = y - h * 0.05 - age * 70 * k;
      ctx.fillStyle = `rgba(60,52,50,${0.45 * (1 - age)})`;
      ctx.beginPath();
      ctx.arc(px, py, (16 + age * 34) * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(b.dir, 1);
  ctx.rotate(b.phase === 'down' ? 0.18 : Math.sin(t * 1.7) * 0.02);
  if (far) ctx.filter = 'brightness(0.85) saturate(0.7)';
  else if (b.hurt > 0 && Math.floor(b.hurt / 4) % 2 === 0) ctx.filter = 'brightness(2.2) saturate(0.4)';
  if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h);
  else {
    ctx.fillStyle = css(C.jet);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.filter = 'none';
  // Engine fire on the burning wing.
  if (burning) {
    const f = 0.75 + Math.sin(t * 31) * 0.25;
    const g = ctx.createRadialGradient(w * 0.05, -h * 0.05, 2, w * 0.05, -h * 0.05, 40 * f * k);
    g.addColorStop(0, 'rgba(255,240,170,0.95)');
    g.addColorStop(0.45, 'rgba(255,140,40,0.8)');
    g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w * 0.05, -h * 0.05, 40 * f * k, 0, Math.PI * 2);
    ctx.fill();
  }
  // The hatch: in the lake room it glows, pulsing, to show where a charge has to land.
  if (b.mode === 'hatch' && b.phase === 'fly' && b.hurt === 0) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    const hx = (130 / 225 - 0.5) * w;
    const hy = (47 / 114 - 0.5) * h;
    const g = ctx.createRadialGradient(hx, hy, 2, hx, hy, 30 + pulse * 10);
    g.addColorStop(0, `rgba(255,230,120,${0.55 + 0.35 * pulse})`);
    g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, 30 + pulse * 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
