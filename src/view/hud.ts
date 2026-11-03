// The in-play HUD, drawn on a 2D canvas over the game view in River Guard's 5×7 pixel font, on
// small dark wooden plaques (design: HUD). Nothing covers the playfield except prompts and popups.
// The menus and screens (src/ui/screens.ts) draw on this same canvas, in the same style.

import { Chopper } from '../sim/config';
import type { Game, GameEvent } from '../sim/game';
import { Bindings, fillPrompt } from '../settings';
import { drawText, textWidth } from './font';
import { C, css } from './palette';

export interface Popup { text: string; x: number; y: number; t: number }

/** Events whose `n` is points scored (jets come with the stages; their names are guessed here). */
const SCORING = new Set(['rescue', 'mineClear', 'jetDown', 'jetHit', 'jetKill', 'targetScore']);

/** HUD pixels are drawn at a low resolution and scaled up by whole numbers, so the font stays crisp. */
export class Hud {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  scale = 2;
  private popups: { text: string; px: number; py: number; t: number }[] = [];
  /** The room prompts' opacity: they fade while something passes behind them. */
  private promptAlpha = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize(w: number, h: number): void {
    this.scale = Math.max(2, Math.floor(Math.min(w / 400, h / 225)));
    this.canvas.width = Math.ceil(w / this.scale);
    this.canvas.height = Math.ceil(h / this.scale);
    this.canvas.style.width = `${this.canvas.width * this.scale}px`;
    this.canvas.style.height = `${this.canvas.height * this.scale}px`;
  }

  get w() { return this.canvas.width; }
  get h() { return this.canvas.height; }

  /**
   * Scoring events become floating "+500" popups at their place in the world. Only events that
   * carry points: other events use `n` for other things (a room index, a body).
   */
  addPopups(events: GameEvent[]): void {
    for (const e of events) {
      if (e.n && SCORING.has(e.type as string)) this.popups.push({ text: `+${e.n}`, px: e.x, py: e.y, t: 0 });
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  plaque(x: number, y: number, w: number, h: number): void {
    const c = this.ctx;
    c.fillStyle = css(C.plaqueEdge);
    c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = css(C.plaque);
    c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(x, y + h, w + 1, 1);
  }

  text(t: string, x: number, y: number, color: number = C.ink, shadow = true): void {
    if (shadow) drawText(this.ctx, t, x + 1, y + 1, 'rgba(0,0,0,0.45)');
    drawText(this.ctx, t, x, y, css(color));
  }

  label(t: string, x: number, y: number, color: number = C.ink): void {
    const w = textWidth(t) + 5;
    this.plaque(x, y, w, 11);
    this.text(t, x + 3, y + 2, color);
  }

  centred(lines: string[], y: number): void {
    const w = Math.max(...lines.map(textWidth)) + 14;
    const h = lines.length * 11 + 10;
    const x = Math.round((this.w - w) / 2);
    this.plaque(x, y, w, h);
    lines.forEach((l, i) => this.text(l, Math.round((this.w - textWidth(l)) / 2), y + 6 + i * 11, i === 0 ? C.brass : C.ink));
  }

  draw(g: Game, bindings: Bindings, project: (px: number, py: number) => { x: number; y: number }, dt: number, overlay: string[] | null = null, prompts = true): void {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    const s = this.scale;
    const toHud = (px: number, py: number) => {
      const p = project(px, py);
      return { x: Math.round(p.x / s), y: Math.round(p.y / s) };
    };

    // Top bar: room name, score, boats, deaths
    this.label(g.room.def.name, 4, 4);
    const score = `SCORE ${String(g.score + g.roomPoints).padStart(6, ' ')}`;
    this.label(score, Math.round((this.w - textWidth(score)) / 2), 4);
    let rx = this.w - 4;
    const deaths = `DEATHS ${g.deaths}`;
    rx -= textWidth(deaths) + 5;
    this.label(deaths, rx, 4, C.inkDim);
    if (g.room.boatsTotal > 0) {
      const boats = `BOATS ${g.room.boatsHome}/${g.room.boatsTotal}`;
      rx -= textWidth(boats) + 9;
      this.label(boats, rx, 4, g.room.gateOpen ? C.brass : C.ink);
    }

    // Fuel bar while flying
    const p = g.player;
    if (p.body === 'chopper' && p.deadTicks === 0) {
      const x = 4;
      const y = 19;
      const w = 60;
      this.plaque(x, y, w + 30, 9);
      this.text('FUEL', x + 3, y + 1);
      const f = p.fuel / Chopper.fuelTicks;
      c.fillStyle = css(C.plaqueEdge);
      c.fillRect(x + 29, y + 2, w - 2, 5);
      c.fillStyle = css(f < 0.25 ? C.red : C.brass);
      c.fillRect(x + 29, y + 2, Math.round((w - 2) * f), 5);
    }

    // Room prompts, stacked down the left edge under the room name and fuel bar (Debu: "move the
    // messages to one side"), so they never sit over the play. In the room's order; hidden while a
    // menu is open over play.
    // The stack fades to nearly clear whenever a jet, a bomb or the player passes behind it, so a
    // message never hides a danger (jets come in from the left edge at the stack's height).
    const lines = prompts ? g.room.def.prompts.map((pr) => fillPrompt(pr.text, bindings)) : [];
    if (lines.length) {
      const top = 32;
      const right = 4 + Math.max(...lines.map(textWidth)) + 5;
      const bottom = top + lines.length * 14;
      const behind = (b: { x: number; y: number; w: number; h: number }) => {
        const a = toHud(b.x, b.y);
        const z = toHud(b.x + b.w, b.y + b.h);
        return a.x < right + 6 && z.x > 0 && a.y < bottom + 6 && z.y > top - 6;
      };
      const room = g.room as { jets?: { alive: boolean; x: number; y: number; w: number; h: number }[]; bombs?: { x: number; y: number; w: number; h: number }[] };
      const hidden = (room.jets ?? []).some((j) => j.alive && behind(j)) || (room.bombs ?? []).some(behind) || behind(g.player);
      this.promptAlpha += ((hidden ? 0.2 : 1) - this.promptAlpha) * Math.min(1, dt * 12);
      c.globalAlpha = this.promptAlpha;
      lines.forEach((t, i) => this.label(t, 4, top + i * 14));
      c.globalAlpha = 1;
    }

    // Popups float up and fade
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pp = this.popups[i];
      pp.t += dt;
      if (pp.t > 1.1) { this.popups.splice(i, 1); continue; }
      const at = toHud(pp.px, pp.py);
      c.globalAlpha = Math.min(1, (1.1 - pp.t) * 3);
      this.text(pp.text, at.x - textWidth(pp.text) / 2, at.y - 14 - pp.t * 18, C.brass);
      c.globalAlpha = 1;
    }

    if (overlay) this.centred(overlay, Math.round(this.h * 0.36));
  }
}
