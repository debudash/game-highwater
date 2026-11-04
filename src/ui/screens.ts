// Every screen outside play: the landing page, Settings, the pause menu, the skip offer and the
// results card. All are drawn in the game's 5×7 pixel font on the same dark wooden plaques as the
// HUD, and all are driven from the keyboard: arrows (or W/S) move, Enter or Space selects, Esc goes
// back. Layout is in HUD pixels (about 400×225 or more; see Hud.resize).

import { keyLabel, Settings } from '../settings';
import type { Button } from '../sim/input';
import { Hud } from '../view/hud';
import { drawText, textWidth } from '../view/font';
import { C, css } from '../view/palette';
import { KeyScreen, ROWS } from './keys';

export type Screen = 'title' | 'playing' | 'paused' | 'settings' | 'skip' | 'results';

/** What the screens ask the game shell (main.ts) to do. */
export interface UiActions {
  play(): void;
  continueRun(): void;
  resume(): void;
  restartRoom(): void;
  quitToTitle(): void;
  skip(yes: boolean): void;
  playAgain(): void;
  settingsChanged(): void;
}

/** The figures on the results card. */
export interface Results {
  score: number;
  best: number;
  newBest: boolean;
  boats: number;
  boatsInGame: number;
  deaths: number;
  skipped: string[];
}

interface MenuItem { label: string; run: () => void }

/** The intro on the landing page: what's happening, who you are, what you must do. */
export const INTRO = [
  'THE RIVER HAS BURST ITS BANKS AND THE VALLEY IS FLOODING.',
  'YOU ARE THE RIVER GUARD: A TOY TANK THAT FOLDS INTO A CHOPPER.',
  'CARRY THE BOATS HOME AND REACH THE CASTLE BEFORE DAWN.',
];

/** The ending (design: "The ending"): shown line by line at dawn before the results card. */
export const ENDING = [
  'THE BOMBER IS DOWN AND THE SUN IS UP.',
  'THE WATER IS FALLING AND THE BOATS ARE HOME.',
  'ONE BY ONE, THE DRAWBRIDGES COME DOWN.',
  'THE VALLEY IS SAFE. WELL DONE, RIVER GUARD.',
];

/** The credits, under the results card (Debu's wording). */
export const CREDITS = [
  'A GAME FOR FUN AND ADVENTURE',
  'ART GENERATED WITH NANO BANANA',
  'CODE, SOUND AND MUSIC MADE WITH CLAUDE',
];

/** Seconds per ending line, and the pause on the last one before the card. */
const ENDING_LINE = 2.2;
const ENDING_HOLD = 2;

export class Ui {
  screen: Screen = 'title';
  private sel = 0;
  private keys: KeyScreen;
  /** Where Settings returns to. */
  private settingsFrom: Screen = 'title';
  hasSave = false;
  best = 0;
  results: Results | null = null;
  private time = 0;
  /** Seconds since the results opened: the ending plays first, then the card. */
  private endingT = 0;
  /** Stage title card shown for a moment when a stage begins. */
  private banner: { text: string; sub: string; t: number } | null = null;

  constructor(private hud: Hud, private settings: Settings, private act: UiActions) {
    this.keys = new KeyScreen(settings);
  }

  open(s: Screen): void {
    if (s === 'settings' && this.screen !== 'settings') {
      this.settingsFrom = this.screen;
      this.keys = new KeyScreen(this.settings);
    }
    if (s === 'results') this.endingT = 0;
    this.screen = s;
    this.sel = 0;
  }

  /** The ending is still playing (before the results card). */
  get endingPlaying(): boolean {
    return this.screen === 'results' && this.endingT < ENDING.length * ENDING_LINE + ENDING_HOLD;
  }

  showBanner(text: string, sub: string): void {
    this.banner = { text, sub, t: 0 };
  }

  private menu(): MenuItem[] {
    const a = this.act;
    switch (this.screen) {
      case 'title':
        return [
          { label: 'PLAY', run: () => a.play() },
          ...(this.hasSave ? [{ label: 'CONTINUE', run: () => a.continueRun() }] : []),
          { label: 'SETTINGS', run: () => this.open('settings') },
        ];
      case 'paused':
        return [
          { label: 'RESUME', run: () => a.resume() },
          { label: 'RESTART ROOM', run: () => a.restartRoom() },
          { label: 'SETTINGS', run: () => this.open('settings') },
          { label: 'QUIT TO TITLE', run: () => a.quitToTitle() },
        ];
      case 'skip':
        return [
          { label: 'YES, SKIP IT', run: () => a.skip(true) },
          { label: 'NO, KEEP TRYING', run: () => a.skip(false) },
        ];
      case 'results':
        return [{ label: 'PLAY AGAIN', run: () => a.playAgain() }, { label: 'TITLE', run: () => a.quitToTitle() }];
      default:
        return [];
    }
  }

  /** Handles a key press while a screen is open. Returns true if the screen used it. */
  key(code: string, repeat: boolean): boolean {
    if (this.screen === 'playing') return false;
    if (this.screen === 'settings') {
      if (repeat && this.keys.capturing) return true;
      const r = this.keys.key(code);
      if (r === 'changed') this.act.settingsChanged();
      if (r === 'back') this.screen = this.settingsFrom;
      return true;
    }
    if (repeat && (code === 'Enter' || code === 'Space')) return true;
    // Any key during the ending skips to the results card.
    if (this.endingPlaying) {
      this.endingT = 999;
      return true;
    }
    const items = this.menu();
    if (code === 'ArrowUp' || code === 'KeyW') this.sel = (this.sel + items.length - 1) % items.length;
    else if (code === 'ArrowDown' || code === 'KeyS') this.sel = (this.sel + 1) % items.length;
    else if (code === 'Enter' || code === 'Space') items[this.sel]?.run();
    else if (this.screen === 'skip' && code === 'KeyY') this.act.skip(true);
    else if (this.screen === 'skip' && (code === 'KeyN' || code === 'Escape')) this.act.skip(false);
    else if (this.screen === 'paused' && code === 'Escape') this.act.resume();
    return true;
  }

  // ---------------------------------------------------------------- drawing

  private get c() { return this.hud.ctx; }

  /** Text at a whole-number multiple of the font size. */
  private big(t: string, x: number, y: number, k: number, color: number): void {
    const c = this.c;
    c.save();
    c.translate(x, y);
    c.scale(k, k);
    drawText(c, t, 1, 1, 'rgba(0,0,0,0.5)');
    drawText(c, t, 0, 0, css(color));
    c.restore();
  }

  private centre(t: string, y: number, color: number = C.ink): void {
    this.hud.text(t, Math.round((this.hud.w - textWidth(t)) / 2), y, color);
  }

  private drawMenu(items: MenuItem[], cx: number, y: number, minW = 0): number {
    const w = Math.max(minW, ...items.map((i) => textWidth(i.label) + 24));
    const h = items.length * 13 + 8;
    const x = Math.round(cx - w / 2);
    this.hud.plaque(x, y, w, h);
    items.forEach((it, i) => {
      const iy = y + 6 + i * 13;
      const on = i === this.sel;
      if (on) {
        this.c.fillStyle = css(C.plaqueEdge);
        this.c.fillRect(x + 3, iy - 2, w - 6, 11);
        // a blinking pointer, so the selection reads at a glance
        if (Math.floor(this.time * 2.5) % 2 === 0) this.hud.text('▶', x + 6, iy, C.brass, false);
      }
      this.hud.text(it.label, Math.round(cx - textWidth(it.label) / 2), iy, on ? C.brass : C.ink);
    });
    return y + h;
  }

  /** Two-column "how to play" box with the player's current keys. */
  private drawControls(x: number, y: number): number {
    const b = this.settings.bindings;
    const keys = (a: Button, n = 2) => b[a].slice(0, n).map(keyLabel).join(' ');
    const rows: [string, string][] = [
      ['MOVE', `${keys('left', 1)} ${keys('right', 1)}`],
      ['JUMP / FLY', keys('jump')],
      ['FIRE / CHARGE', keys('action')],
      ['SET DOWN', keys('drop')],
      ['SWITCH', keys('switch')],
      ['PAUSE / MUTE', 'ESC  M'],
    ];
    const w = 150;
    const h = rows.length * 11 + 22;
    this.hud.plaque(x, y, w, h);
    this.hud.text('HOW TO PLAY', x + 6, y + 5, C.brass);
    rows.forEach(([l, k], i) => {
      this.hud.text(l, x + 6, y + 18 + i * 11, C.inkDim);
      this.hud.text(k, x + w - 6 - textWidth(k), y + 18 + i * 11);
    });
    return y + h;
  }

  /** Draws the open screen (and the stage banner during play) over the HUD. */
  draw(dt: number, logoBottomPx: number | null): void {
    this.time += dt;
    if (this.screen === 'results') this.endingT += dt;
    const W = this.hud.w;
    const H = this.hud.h;
    const c = this.c;
    if (this.banner) {
      this.banner.t += dt;
      const b = this.banner;
      if (b.t > 3) this.banner = null;
      else if (this.screen === 'playing') {
        c.globalAlpha = Math.min(1, b.t * 4, (3 - b.t) * 2);
        const w = Math.max(textWidth(b.text) * 2, textWidth(b.sub)) + 24;
        const x = Math.round((W - w) / 2);
        // Below the room messages stacked down the left edge, so the banner never covers them.
        const y = Math.round(H * 0.42);
        this.hud.plaque(x, y, w, 34);
        this.centre(b.sub, y + 5, C.inkDim);
        this.big(b.text, Math.round((W - textWidth(b.text) * 2) / 2), y + 15, 2, C.brass);
        c.globalAlpha = 1;
      }
    }

    switch (this.screen) {
      case 'title': {
        let y: number;
        if (logoBottomPx !== null) {
          y = Math.round(logoBottomPx / this.hud.scale) + 6;
        } else {
          // No generated logo yet: the title in big pixel letters.
          const t1 = 'RIVER GUARD';
          const t2 = 'HIGH WATER';
          const k = Math.max(2, Math.min(4, Math.floor(W / (textWidth(t1) * 1.6))));
          this.big(t1, Math.round((W - textWidth(t1) * k) / 2), 12, k, C.brass);
          this.big(t2, Math.round((W - textWidth(t2) * (k - 1)) / 2), 14 + 8 * k, k - 1, C.ink);
          y = 18 + 8 * k + 8 * (k - 1) + 6;
        }
        // Intro
        const iw = Math.max(...INTRO.map(textWidth)) + 16;
        this.hud.plaque(Math.round((W - iw) / 2), y, iw, INTRO.length * 10 + 8);
        INTRO.forEach((l, i) => this.centre(l, y + 5 + i * 10, i === 2 ? C.brass : C.ink));
        y += INTRO.length * 10 + 16;
        // Menu on the left of centre, the controls on the right
        const gap = 12;
        const menuW = 110;
        const total = menuW + gap + 150;
        const mx = Math.round((W - total) / 2);
        this.drawMenu(this.menu(), mx + menuW / 2, y, menuW);
        this.drawControls(mx + menuW + gap, y);
        // Footer
        const best = `BEST ${this.best}`;
        this.hud.label(best, 4, H - 15, C.brass);
        const kb = 'KEYBOARD REQUIRED';
        this.hud.label(kb, W - textWidth(kb) - 9, H - 15, C.inkDim);
        break;
      }
      case 'paused': {
        this.dim(0.45);
        const y = Math.round(H * 0.18);
        this.big('PAUSED', Math.round((W - textWidth('PAUSED') * 2) / 2), y, 2, C.brass);
        const menuW = 120;
        const total = menuW + 12 + 150;
        const mx = Math.round((W - total) / 2);
        this.drawMenu(this.menu(), mx + menuW / 2, y + 26, menuW);
        this.drawControls(mx + menuW + 12, y + 26);
        break;
      }
      case 'skip': {
        this.dim(0.35);
        const y = Math.round(H * 0.3);
        const lines = ['THIS ROOM IS A TOUGH ONE.', 'SKIP IT? A SKIPPED ROOM SCORES 0.'];
        const w = Math.max(...lines.map(textWidth)) + 20;
        this.hud.plaque(Math.round((W - w) / 2), y, w, 30);
        lines.forEach((l, i) => this.centre(l, y + 6 + i * 11, i ? C.inkDim : C.ink));
        this.drawMenu(this.menu(), W / 2, y + 38, 130);
        this.centre('Y / N', y + 76, C.inkDim);
        break;
      }
      case 'results':
        this.drawResults();
        break;
      case 'settings':
        this.drawSettings();
        break;
    }
  }

  private dim(a: number): void {
    this.c.fillStyle = `rgba(20,14,10,${a})`;
    this.c.fillRect(0, 0, this.hud.w, this.hud.h);
  }

  /** The ending: its lines fade in one by one over the dawn. */
  private drawEnding(): void {
    const H = this.hud.h;
    this.dim(0.18);
    const y0 = Math.round(H * 0.3);
    ENDING.forEach((l, i) => {
      const a = Math.max(0, Math.min(1, (this.endingT - i * ENDING_LINE) / 0.8));
      if (a <= 0) return;
      this.c.globalAlpha = a;
      const w = textWidth(l) + 14;
      this.hud.plaque(Math.round((this.hud.w - w) / 2), y0 + i * 18 - 3, w, 13);
      this.centre(l, y0 + i * 18, i === ENDING.length - 1 ? C.brass : C.ink);
      this.c.globalAlpha = 1;
    });
    if (Math.floor(this.time * 1.5) % 2 === 0) this.centre('PRESS ANY KEY', H - 16, C.inkDim);
  }

  private drawResults(): void {
    if (this.endingPlaying) {
      this.drawEnding();
      return;
    }
    const r = this.results;
    const W = this.hud.w;
    const H = this.hud.h;
    this.dim(0.12); // a light touch: the ending is the bright dawn
    const title = 'THE FLOOD IS OVER';
    const y0 = Math.round(H * 0.1);
    this.big(title, Math.round((W - textWidth(title) * 2) / 2), y0, 2, C.brass);
    if (!r) return;
    const rows: [string, string, number?][] = [
      ['SCORE', String(r.score), C.brass],
      ['BOATS RESCUED', `${r.boats}/${r.boatsInGame}`],
      ['DEATHS', String(r.deaths)],
      ['ROOMS SKIPPED', r.skipped.length ? String(r.skipped.length) : 'NONE'],
      ['BEST SCORE', r.newBest ? `${r.best} NEW BEST!` : String(r.best), r.newBest ? C.brass : undefined],
    ];
    const w = 220;
    const x = Math.round((W - w) / 2);
    const y = y0 + 26;
    const h = rows.length * 13 + 10 + (r.skipped.length ? 12 : 0);
    this.hud.plaque(x, y, w, h);
    rows.forEach(([l, v, col], i) => {
      this.hud.text(l, x + 8, y + 7 + i * 13, C.inkDim);
      this.hud.text(v, x + w - 8 - textWidth(v), y + 7 + i * 13, col ?? C.ink);
    });
    if (r.skipped.length) {
      const list = r.skipped.slice(0, 3).join(', ') + (r.skipped.length > 3 ? '...' : '');
      this.centre(list.slice(0, 34), y + 7 + rows.length * 13, C.inkDim);
    }
    const end = this.drawMenu(this.menu(), W / 2, y + h + 8, 120);
    const top = Math.max(end + 10, H - 10 - CREDITS.length * 10);
    const cw = Math.max(...CREDITS.map(textWidth)) + 16;
    this.hud.plaque(Math.round((W - cw) / 2), top - 5, cw, CREDITS.length * 10 + 7);
    CREDITS.forEach((l, i) => this.centre(l, top + i * 10, i ? C.inkDim : C.brass));
  }

  private drawSettings(): void {
    const W = this.hud.w;
    const H = this.hud.h;
    const s = this.settings;
    const k = this.keys;
    this.dim(0.5);
    const w = Math.min(W - 16, 300);
    const x = Math.round((W - w) / 2);
    const rowH = 12;
    const y0 = Math.max(6, Math.round((H - (ROWS.length * rowH + 44)) / 2));
    this.hud.plaque(x, y0, w, ROWS.length * rowH + 44);
    this.centre('SETTINGS', y0 + 6, C.brass);
    const colKeys = x + 104;
    ROWS.forEach((r, i) => {
      const y = y0 + 22 + i * rowH;
      const on = i === k.row;
      if (on) {
        this.c.fillStyle = css(C.plaqueEdge);
        this.c.fillRect(x + 3, y - 2, w - 6, 11);
      }
      this.hud.text(r.label, x + 8, y, on ? C.brass : C.ink);
      if (r.kind === 'keys') {
        const keys = s.bindings[r.action];
        const n = k.slotsFor(r);
        for (let j = 0; j < n; j++) {
          const sx = colKeys + j * 58;
          const label = k.capturing && on && j === k.slot ? (Math.floor(this.time * 3) % 2 ? '...' : '') : keys[j] ? keyLabel(keys[j]) : '+';
          const picked = on && j === k.slot;
          this.c.fillStyle = css(picked ? C.brass : C.plaqueEdge);
          this.c.fillRect(sx - 2, y - 2, 54, 11);
          this.c.fillStyle = css(C.plaque);
          this.c.fillRect(sx - 1, y - 1, 52, 9);
          this.hud.text(label, sx + Math.round((50 - textWidth(label)) / 2), y, keys[j] ? C.ink : C.inkDim, false);
        }
      } else if (r.kind === 'music' || r.kind === 'sfx') {
        const v = r.kind === 'music' ? s.music : s.sfx;
        this.hud.text('◀', colKeys, y, C.inkDim);
        this.c.fillStyle = css(C.plaqueEdge);
        this.c.fillRect(colKeys + 10, y + 1, 100, 5);
        this.c.fillStyle = css(C.brass);
        this.c.fillRect(colKeys + 10, y + 1, Math.round(100 * v), 5);
        this.hud.text('▶', colKeys + 114, y, C.inkDim);
        this.hud.text(String(Math.round(v * 10)), colKeys + 128, y);
      } else if (r.kind === 'shake') {
        this.hud.text(s.shake ? '◀ ON ▶' : '◀ OFF ▶', colKeys, y, s.shake ? C.ink : C.inkDim);
      }
    });
    const help = k.capturing
      ? 'PRESS A KEY TO BIND IT. ESC CANCELS.'
      : k.note || (k.current.kind === 'keys' ? 'ENTER: REBIND   DEL: REMOVE   ESC: BACK' : 'ARROWS: CHANGE   ENTER: SELECT   ESC: BACK');
    this.centre(help, y0 + 26 + ROWS.length * rowH, k.note && !k.capturing ? C.brass : C.inkDim);
  }
}
