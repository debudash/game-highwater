// Look B (?look=b): the game drawn in 2D with the generated pixel-art sprites (docs/ART_PROMPTS.md).
// It offers the same surface as the 3D World (src/view/scene.ts), so main.ts picks one by the flag.
// Like the 3D view, it only reads the sim.
//
// Units: art px. One tile = 96 art px, so one sim px = 6 art px. Sprites are drawn at their full
// detail and scaled smoothly to the screen (shrinking them to a coarse grid turned them to mush).
// Rooms sit side by side in slots, and the camera slides between them, as in the 3D view.

import { Boat, Cactus, Chopper, Help, ROOM_H, ROOM_W, Switch, TILE } from '../sim/config';
import { createGame, goToRoom, tick, windAt } from '../sim/game';
import { TEST_ROOMS } from '../sim/rooms';
import { GAME_ROOMS } from '../sim/stages';
import type { Game, GameEvent, Item, Player, RoomState } from '../sim/game';
import { ghostInputs } from '../sim/ghost';
import type { TickInput } from '../sim/input';
import { C } from '../view/palette';
import type { Quality } from '../view/scene';
import { Fx2D } from './fx2d';
import * as P from './placeholders';
import { SPRITES, SpriteBank, SpriteName } from './sprites';
import { BG_BY_LIGHT, drawBomber, drawBombs, drawJets, drawRain, drawWind } from './stagefx';

/** The ghost hint: a private copy of the room replaying its recorded solution (see src/sim/ghost.ts). */
interface Ghost { g: Game; inputs: TickInput[]; i: number; acc: number; fade: number }
/** The ghost plays a little faster than real time, so the hint is short. */
const GHOST_SPEED = 1.5;

/**
 * Debug and browser-check hooks, only behind URL flags: ?rooms=test plays the feel-check test rooms
 * instead of the stages, and ?debug adds window.highWaterDebug.goto(room) to jump to any room. The
 * view never writes the sim otherwise.
 */
const FLAGS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const DEBUG = FLAGS.has('debug');
const TEST_ROOMS_FLAG = FLAGS.get('rooms') === 'test';

const T = P.T;
const S = T / TILE; // art px per sim px
const SLIDE_S = 0.5;
/** The part of the room the camera fits to the screen, in tiles (room plus margins for the HUD). */
const VIEW = { left: -0.3, right: ROOM_W + 0.3, top: -0.9, bottom: ROOM_H + 0.35 };

/** Where an item is drawn: x, y (bottom centre, art px), reel-in state, and how far below its
 *  hitbox it hangs on the rope while carried (view only). */
interface ItemView { x: number; y: number; reel: boolean; hang: number }

/** Art px of visible rope between the skids and a carried item's top. */
const ROPE = 20;

interface RoomView {
  slot: number;
  x0: number; // art px
  state: RoomState;
  terrain: HTMLCanvasElement;
  bridgeRaise: number;
  gateLift: number;
  items: Map<number, ItemView>;
  swing: number[];
  /** The art version the terrain was drawn with. */
  art: number;
  /** The terrain pre-scaled to the screen, so a frame copies it 1:1 instead of resampling. */
  scaled: { canvas: HTMLCanvasElement; scale: number } | null;
}

export class World2D {
  private ctx: CanvasRenderingContext2D;
  private bank = new SpriteBank();
  private fx = new Fx2D();
  private quality: Quality = 'high';
  private dpr = 1;

  private room: RoomView | null = null;
  private leaving: RoomView | null = null;
  private lastRoom: RoomState | null = null;
  private slot = 0;
  private camX = (ROOM_W * T) / 2;
  private slideFrom = 0;
  private slideT = 1;
  private shake = 0;

  private game: Game | null = null;
  private alpha = 1;
  private time = 0;
  private squash = 0;
  private squashV = 0;
  private bodyShown: 'tank' | 'chopper' = 'tank';
  private rotorPhase = 0;
  private washT = 0;
  private ghost: Ghost | null = null;

  /** Camera shake can be turned off in Settings. */
  shakeOn = true;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    // When the art arrives, rooms already built redraw their terrain with it.
    void this.bank.load().then(() => { this.artVersion++; });
  }

  private artVersion = 0;

  private terrainFor(state: RoomState): HTMLCanvasElement {
    const b = this.bank;
    return P.drawTerrain(state.tiles, { grass: b.get('tile-grass'), soil: b.get('tile-soil'), stone: b.get('tile-stone'), dock: b.get('tile-dock') });
  }

  setQuality(q: Quality): void {
    if (q === this.quality) return;
    this.quality = q;
    this.resize(window.innerWidth, window.innerHeight);
  }

  get currentQuality(): Quality { return this.quality; }

  resize(w: number, h: number): void {
    this.dpr = this.quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
  }

  /** Device px per art px. */
  private get scale(): number {
    return Math.min(this.canvas.width / ((VIEW.right - VIEW.left) * T), this.canvas.height / ((VIEW.bottom - VIEW.top) * T));
  }

  private get camY(): number {
    return ((VIEW.top + VIEW.bottom) / 2) * T;
  }

  /** Screen position (CSS px) of a sim point, for HUD prompts and popups. */
  project(px: number, py: number, w: number, h: number): { x: number; y: number } {
    const s = this.scale / this.dpr;
    const ax = (this.room?.x0 ?? 0) + px * S;
    return { x: (ax - this.camX) * s + w / 2, y: (py * S - this.camY) * s + h / 2 };
  }

  // ---------------------------------------------------------------- per frame

  private debugged = new WeakSet<Game>();

  /** The URL-flag hooks (see FLAGS above). */
  private debugHooks(g: Game): void {
    if (TEST_ROOMS_FLAG && !this.debugged.has(g)) {
      this.debugged.add(g);
      g.rooms = TEST_ROOMS;
      goToRoom(g, 0);
    }
    if (DEBUG) {
      (window as unknown as { highWaterDebug: object }).highWaterDebug = {
        /** Jump to a room by index or id (e.g. '3-2'). */
        goto: (room: number | string) => {
          const i = typeof room === 'number' ? room : g.rooms.findIndex((r) => r.id === room);
          if (i >= 0) goToRoom(g, i);
          return i;
        },
        rooms: () => g.rooms.map((r) => r.id),
        /** Back to the real stage list (after ?rooms=test), at its first room. */
        stages: () => { g.rooms = GAME_ROOMS; goToRoom(g, 0); },
      };
    }
  }

  update(g: Game, events: GameEvent[], alpha: number, dt: number): void {
    if (TEST_ROOMS_FLAG || DEBUG) this.debugHooks(g);
    this.game = g;
    this.alpha = alpha;
    this.time += dt;
    const entered = events.some((e) => e.type === 'roomEnter' || e.type === 'loop');
    if (g.room !== this.lastRoom) {
      if (entered || !this.room) {
        this.leaving = this.room;
        if (this.room) this.slot++;
        this.room = this.buildRoom(g.room, this.slot);
        if (this.leaving) { this.slideFrom = this.camX; this.slideT = 0; }
        else this.camX = this.room.x0 + (ROOM_W * T) / 2;
      } else {
        this.room = this.buildRoom(g.room, this.slot); // respawn: the room resets in place
      }
      this.lastRoom = g.room;
    }
    const rv = this.room!;
    if (this.slideT < 1) {
      this.slideT = Math.min(1, this.slideT + dt / SLIDE_S);
      const t = this.slideT < 0.5 ? 2 * this.slideT ** 2 : 1 - (-2 * this.slideT + 2) ** 2 / 2;
      this.camX = this.slideFrom + (rv.x0 + (ROOM_W * T) / 2 - this.slideFrom) * t;
      if (this.slideT === 1) this.leaving = null;
    } else {
      this.camX = rv.x0 + (ROOM_W * T) / 2;
    }
    this.handleEvents(g, events, rv);
    this.updateRoom(rv, dt);
    this.updateGhost(g, events, dt);

    // Squash and stretch: a spring driven by landings and jumps (as in the 3D view).
    this.squashV += (-this.squash * 220 - this.squashV * 16) * dt;
    this.squash += this.squashV * dt;
    const p = g.player;
    if (p.body !== this.bodyShown && p.foldTicks === 0) this.bodyShown = p.body;
    const thrust = p.body === 'chopper' && p.fuel > 0 && p.vy < 20;
    this.rotorPhase += dt * (thrust ? 34 : p.body === 'chopper' ? 22 : 3);
    if (p.body === 'chopper' && p.deadTicks === 0) {
      this.washT -= dt;
      const below = waterBelow(g.room, p.x + p.w / 2, p.y + p.h);
      if (below !== null && below - (p.y + p.h) < 40 && this.washT <= 0) {
        this.washT = 0.06;
        this.fx.rotorWash(rv.x0 + (p.x + p.w / 2) * S, below * S);
      }
    }
    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt * 2.5);
  }

  /**
   * The ghost hint: on the respawn after the Help.hintDeaths-th death in a room, a translucent
   * ghost replays the room's recorded route once, in its own copy of the room.
   */
  private updateGhost(g: Game, events: GameEvent[], dt: number): void {
    if (events.some((e) => e.type === 'roomEnter' || e.type === 'loop' || e.type === 'skip')) this.ghost = null;
    if (events.some((e) => e.type === 'respawn') && g.roomDeaths === Help.hintDeaths) {
      const inputs = ghostInputs(g.room.def.id);
      if (inputs) this.ghost = { g: createGame({ rooms: [g.room.def], startRoom: 0 }), inputs, i: 0, acc: 0, fade: 0 };
    }
    const gh = this.ghost;
    if (!gh) return;
    gh.acc += dt * 60 * GHOST_SPEED;
    while (gh.acc >= 1 && gh.i < gh.inputs.length && gh.g.loops === 0) {
      tick(gh.g, gh.inputs[gh.i++]);
      gh.acc--;
    }
    const done = gh.i >= gh.inputs.length || gh.g.loops > 0;
    gh.fade = Math.max(0, Math.min(1, gh.fade + (done ? -dt * 3 : dt * 3)));
    if (done && gh.fade === 0) this.ghost = null;
  }

  private buildRoom(state: RoomState, slot: number): RoomView {
    return {
      slot, x0: slot * ROOM_W * T, state, terrain: this.terrainFor(state), art: this.artVersion,
      bridgeRaise: state.bridgesDown ? 0 : 1, gateLift: state.gateOpen ? 1 : 0,
      items: new Map(), swing: state.targets.map(() => 0), scaled: null,
    };
  }

  private updateRoom(rv: RoomView, dt: number): void {
    const room = rv.state;
    rv.bridgeRaise += ((room.bridgesDown ? 0 : 1) - rv.bridgeRaise) * Math.min(1, dt * 5);
    rv.gateLift += ((room.gateOpen ? 1 : 0) - rv.gateLift) * Math.min(1, dt * 2);
    room.targets.forEach((tg, i) => {
      const want = tg.hit ? -1.4 : Math.sin(this.time * 1.3 + i) * 0.05;
      rv.swing[i] += (want - rv.swing[i]) * Math.min(1, dt * 6);
    });
    for (const it of room.items) {
      const tx = (it.x + it.w / 2) * S;
      const ty = (it.y + it.h) * S;
      let v = rv.items.get(it.id);
      if (!v) { v = { x: tx, y: ty, reel: true, hang: 0 }; rv.items.set(it.id, v); }
      // A freshly hooked item is reeled up to the chopper over a moment instead of snapping (HW-001).
      if (it.carried && v.reel) {
        v.x += (tx - v.x) * Math.min(1, dt * 20);
        v.y += (ty - v.y) * Math.min(1, dt * 12);
        if (Math.abs(ty - v.y) < 2) v.reel = false;
      } else {
        v.x = tx;
        v.y = ty;
        if (!it.carried) v.reel = true;
      }
      // Item art is taller than its hitbox, so a carried item would sit against the skids. It
      // hangs lower on a short rope instead, and eases back up when it's set down.
      const want = it.carried ? Math.max(0, this.itemHeight(it) - it.h * S) + ROPE : 0;
      v.hang += (want - v.hang) * Math.min(1, dt * 10);
    }
  }

  /** The drawn height of an item (art px): its sprite's, or its hitbox's for the placeholder. */
  private itemHeight(it: Item): number {
    const img = this.bank.get(it.kind);
    return img ? img.naturalHeight * SPRITES[it.kind].scale : it.h * S;
  }

  shakeBy(amount: number): void {
    if (!this.shakeOn) return;
    this.shake = Math.min(1, Math.max(this.shake, amount));
  }

  private handleEvents(g: Game, events: GameEvent[], rv: RoomView): void {
    for (const e of events) {
      const x = rv.x0 + e.x * S;
      const y = e.y * S;
      switch (e.type) {
        case 'jump': this.squash = -0.18; this.squashV = 0; this.fx.dust(x, y, 4); break;
        case 'land': {
          const k = Math.min(1, (e.n ?? 0) / 400);
          this.squash = 0.12 + 0.2 * k;
          this.squashV = 0;
          this.fx.dust(x, y, 3 + Math.round(k * 6));
          if (k > 0.7) this.shakeBy(0.35);
          break;
        }
        case 'fire': this.squash = 0.1; this.fx.sparks(x, y - 60); break;
        case 'shellPoof': case 'targetHit': this.fx.chips(x, y, [C.wood, C.cream, C.red], 8); break;
        case 'bridgeDown': this.shakeBy(0.25); break;
        case 'blast': this.fx.chips(x, y, [C.woodDark, C.brass, C.red, C.bomb], 16); this.fx.sparks(x, y); this.shakeBy(0.45); break;
        case 'cactusGone': this.fx.chips(x, y, [C.cactus, C.grassDark, C.red], 12); break;
        case 'cactusSprout': this.fx.dust(x, y, 4); break;
        case 'mineClear': this.fx.chips(x, y, [C.mine, C.red, C.bomb], 14); this.fx.splash(x, y, 10); break;
        case 'floorBreak': this.fx.chips(x, y, [C.stone, C.stoneDark], 16); this.shakeBy(0.4); break;
        case 'splash': this.fx.splash(x, y, 14); break;
        case 'switch': this.fx.sparks(x, y - 30); this.fx.dust(x, y, 5); break;
        case 'hook': case 'setDown': this.fx.dust(x, y, 3); break;
        case 'rescue': this.fx.confetti(x, y - 40); break;
        case 'gateOpen': this.shakeBy(0.3); break;
        case 'death': this.fx.chips(x, y, [C.olive, C.oliveDark, C.brass, C.cream], 22); this.shakeBy(0.6); break;
        case 'boatLost': this.fx.chips(x, y, [C.hull, C.stripe, C.wood], 18); this.fx.splash(x, y, 12); break;
        case 'respawn': this.fx.sparks(x, y); break;
        case 'jetDown': this.fx.chips(x, y, [C.jet, C.red, C.cream, C.bomb], 20); this.fx.sparks(x, y); this.fx.smoke(x, y, 8); this.shakeBy(0.3); break;
        case 'bombBlast': this.fx.chips(x, y, [C.soil, C.soilDark, C.bomb, C.red], 18); this.fx.sparks(x, y); this.fx.smoke(x, y - 20, 10); this.shakeBy(0.5); break;
        case 'bombDrop': this.fx.sparks(x, y); break;
        case 'bomberHit': this.fx.chips(x, y, [C.jet, C.red, C.cream, C.bomb], 24); this.fx.sparks(x, y); this.fx.smoke(x, y, 10); this.shakeBy(0.45); break;
        case 'bomberDown': this.fx.chips(x, y, [C.jet, C.red, C.brass, C.bomb], 40); this.fx.sparks(x, y); this.fx.smoke(x, y, 18); this.shakeBy(0.8); break;
        case 'gust': this.fx.dust(x, ROOM_H * T - 40, 3); break;
      }
    }
    void g;
  }

  // ---------------------------------------------------------------- drawing

  render(): void {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    this.drawBackground(cw, ch);
    const s = this.scale;
    const k = this.shake * this.shake * 30;
    const jx = (Math.random() - 0.5) * k;
    const jy = (Math.random() - 0.5) * k;
    ctx.setTransform(s, 0, 0, s, cw / 2 - (this.camX + jx) * s, ch / 2 - (this.camY + jy) * s);
    if (this.leaving) this.drawRoom(this.leaving, false);
    if (this.room) this.drawRoom(this.room, true);
    this.fx.draw(ctx);
    if (this.room?.state.def.light === 'night') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawRain(ctx, cw, ch, windAt(this.room.state), this.time);
    }
  }

  private bgCache: { canvas: HTMLCanvasElement; key: string } | null = null;

  /**
   * The backdrop: the stage's generated background, covering the screen and scrolling slowly with
   * the camera (parallax), mirrored so no seam shows as the rooms go by. Hazed and set low, so the
   * playfield reads first and the image's own foreground sits below the ground line. Cached, since
   * it only changes while the camera slides.
   */
  private drawBackground(cw: number, ch: number): void {
    const name = BG_BY_LIGHT[this.room?.state.def.light ?? 'morning'] ?? 'bg-riverside';
    const from = this.leaving ? BG_BY_LIGHT[this.leaving.state.def.light] ?? name : name;
    if (from !== name && this.slideT < 1) {
      // Sliding into a new stage: the old stage's sky fades into the new one.
      this.ctx.drawImage(this.bgCanvas(from, cw, ch), 0, 0);
      this.ctx.globalAlpha = this.slideT;
      this.ctx.drawImage(this.bgCanvas(name, cw, ch), 0, 0);
      this.ctx.globalAlpha = 1;
    } else {
      this.ctx.drawImage(this.bgCanvas(name, cw, ch), 0, 0);
    }
  }

  private bgCaches = new Map<string, { canvas: HTMLCanvasElement; key: string }>();

  private bgCanvas(name: string, cw: number, ch: number): HTMLCanvasElement {
    const bg = this.bank.get(name) ?? this.bank.get('bg-riverside');
    const off = Math.round(this.camX * this.scale * 0.06);
    const key = `${cw}x${ch}:${off}:${bg ? bg.src : 0}`;
    this.bgCache = this.bgCaches.get(name) ?? null;
    if (!this.bgCache || this.bgCache.key !== key) {
      const cv = this.bgCache?.canvas ?? document.createElement('canvas');
      cv.width = cw;
      cv.height = ch;
      const ctx = cv.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, P.css(0x8ccbe8));
      g.addColorStop(1, P.css(0xf6ecd2));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
      if (bg) {
        const bs = Math.max(cw / bg.naturalWidth, ch / bg.naturalHeight) * 1.15;
        const bw = bg.naturalWidth * bs;
        const bh = bg.naturalHeight * bs;
        const y = ch - bh * 0.86; // the image's foreground drops below the screen
        const o = off % (2 * bw);
        for (let i = -1; i < Math.ceil(cw / bw) + 2; i++) {
          const x = i * bw - o;
          if (x > cw || x + bw < 0) continue;
          if (((i % 2) + 2) % 2 === 0) ctx.drawImage(bg, x, y, bw, bh);
          else { ctx.save(); ctx.translate(x + bw, y); ctx.scale(-1, 1); ctx.drawImage(bg, 0, 0, bw, bh); ctx.restore(); }
        }
        ctx.fillStyle = 'rgba(240,236,222,0.32)';
        ctx.fillRect(0, 0, cw, ch);
      }
      this.bgCache = { canvas: cv, key };
      this.bgCaches.set(name, this.bgCache);
    }
    return this.bgCache.canvas;
  }

  private drawRoom(rv: RoomView, current: boolean): void {
    const ctx = this.ctx;
    const room = rv.state;
    const t = this.time;
    ctx.save();
    ctx.translate(rv.x0, 0);

    // The burning Bomber limps across in the distance, behind the land (the last room).
    if (room.bomber) drawBomber(ctx, room, room.bomber, this.bank.get('bomber'), t, true);
    this.drawTerrain(rv);

    // Gate tower: drawn over the terrain so it stands in front of the castle wall ('W') that
    // rises above the gate, with its archway at the gate rows.
    const gate = gateCells(room);
    if (gate) {
      const img = this.bank.get('gate');
      if (img) {
        // Generated tower: stands on the ground under the gate, with its archway at the gate rows.
        ctx.save();
        ctx.translate((gate.col + 0.5) * T, (gate.top + gate.rows) * T);
        this.sprite('gate', () => undefined);
        ctx.restore();
      } else {
        P.gateTower(ctx, (gate.col + 0.5) * T, -1.2 * T, (ROOM_H + 3) * T, gate.top * T);
      }
    }

    room.targets.forEach((tg, i) => {
      ctx.save();
      ctx.translate((tg.col + 0.5) * T, tg.row * T - 4 + Math.sin(t * 1.5 + i) * 3);
      const img = this.bank.get('target');
      if (img) this.targetArt(img, rv.swing[i]);
      else P.target(ctx, rv.swing[i]);
      ctx.restore();
    });
    const crackedImg = this.bank.get('tile-cracked');
    room.tiles.forEach((r, row) => r.forEach((ch, col) => {
      if (ch !== 'x') return;
      if (crackedImg) P.crackedArt(ctx, crackedImg, col * T, row * T);
      else P.cracked(ctx, col * T, row * T);
    }));
    const br = bridgeCells(room);
    const deckImg = this.bank.get('bridge');
    const bridgeImg = this.bank.get('tile-bridge');
    if (br && deckImg) P.bridgeDeckArt(ctx, deckImg, br.c0 * T, br.row * T, br.len, rv.bridgeRaise);
    else if (br && bridgeImg) P.bridgeArt(ctx, bridgeImg, br.c0 * T, br.row * T, br.len, rv.bridgeRaise);
    else if (br) P.bridge(ctx, br.c0 * T, br.row * T, br.len, rv.bridgeRaise);

    room.cacti.forEach((c, i) => {
      if (!c.grown) return;
      const grow = Math.min(1, c.age / Cactus.sproutTicks);
      const sc = 0.35 + 0.65 * (1 - (1 - grow) ** 3);
      ctx.save();
      ctx.translate((c.col + 0.5) * T, (c.row + 1) * T);
      ctx.scale(sc * (1 + Math.sin(t * 3 + i) * 0.02), sc);
      this.sprite('cactus', () => P.cactus(ctx));
      ctx.restore();
    });
    room.mines.forEach((m, i) => {
      if (!m.alive) return;
      ctx.save();
      ctx.translate((m.x + m.w / 2) * S, (m.y + m.h) * S + Math.sin(t * 2 + i) * 4);
      const blink = Math.floor(t * 3) % 2 === 0;
      const img = this.bank.get('mine');
      if (!img) P.mine(ctx, blink);
      else {
        this.sprite('mine', () => undefined);
        const k = SPRITES.mine.scale;
        if (blink) {
          const y = -img.naturalHeight * k + 7 * k;
          ctx.fillStyle = 'rgba(255,90,60,0.35)';
          ctx.beginPath(); ctx.arc(0, y, 13 * k, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = P.css(0xff4a2a);
          ctx.beginPath(); ctx.arc(0, y, 6 * k, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffd0b0';
          ctx.beginPath(); ctx.arc(-2 * k, y - 2 * k, 2 * k, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    });
    for (const it of room.items) if (!it.rescued && !it.carried) this.drawItem(rv, it);
    drawBombs(ctx, room, room.bombs, this.bank.get('bomb'));

    // Water goes over what floats in it, so hulls sit in the water.
    for (const w of waterRuns(room)) P.water(ctx, w.c0 * T, w.len * T, w.row * T + 6, w.bottom * T, t);

    if (gate) {
      ctx.save();
      ctx.beginPath();
      ctx.rect((gate.col + 0.5) * T - 50, gate.top * T, 100, gate.rows * T);
      ctx.clip();
      P.portcullis(ctx, (gate.col + 0.5) * T, gate.top * T - rv.gateLift * (gate.rows + 1) * T, gate.rows * T);
      ctx.restore();
    }

    if (current && this.ghost && this.ghost.fade > 0) this.drawGhost(this.ghost);
    if (current && this.game) {
      for (const it of room.items) if (!it.rescued && it.carried) this.drawItem(rv, it);
      this.drawPlayer(this.game, rv);
      this.drawProjectiles(this.game);
    }
    drawJets(ctx, room, room.jets, this.bank.get('jet'), t);
    if (room.bomber) drawBomber(ctx, room, room.bomber, this.bank.get('bomber'), t, false);
    if (current) drawWind(ctx, windAt(room), room.def.wind?.speed ?? 1, t);
    ctx.restore();
  }

  /** The ghost: the body it's in, and anything it carries, translucent and pale. */
  private drawGhost(gh: Ghost): void {
    const ctx = this.ctx;
    const p: Player = gh.g.player;
    if (p.deadTicks > 0) return;
    ctx.save();
    ctx.globalAlpha = 0.45 * gh.fade;
    ctx.filter = 'brightness(1.6) saturate(0.3)';
    if (p.carrying) {
      const it = p.carrying;
      ctx.save();
      ctx.translate((it.x + it.w / 2) * S, (it.y + it.h) * S + ROPE);
      this.sprite(it.kind, () => P.blob(ctx, 120, 70, C.hull));
      ctx.restore();
    }
    ctx.translate((p.x + p.w / 2) * S, (p.y + p.h) * S);
    ctx.scale(p.facing, 1);
    if (p.body === 'tank') this.sprite('tank', () => P.blob(ctx, 110, 90, C.olive));
    else this.drawChopper();
    ctx.restore();
  }

  private drawTerrain(rv: RoomView): void {
    const s = this.scale;
    if (rv.art !== this.artVersion) {
      rv.terrain = this.terrainFor(rv.state);
      rv.art = this.artVersion;
      rv.scaled = null;
    }
    if (!rv.scaled || rv.scaled.scale !== s) {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(rv.terrain.width * s);
      cv.height = Math.ceil(rv.terrain.height * s);
      const c = cv.getContext('2d')!;
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = 'high';
      c.drawImage(rv.terrain, 0, 0, cv.width, cv.height);
      rv.scaled = { canvas: cv, scale: s };
    }
    this.ctx.drawImage(rv.scaled.canvas, 0, 0, rv.scaled.canvas.width / s, rv.scaled.canvas.height / s);
  }

  /**
   * The generated target, origin at its pivot. The art's short rope ends in a knot above the board;
   * the knot is the pivot, the rope above it is drawn in code up out of the room, and the board
   * swings up (flattening towards the viewer) when hit.
   */
  private targetArt(img: HTMLImageElement, swing: number): void {
    const ctx = this.ctx;
    const k = SPRITES.target.scale;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const knot = Math.round(h * 0.09);
    ctx.fillStyle = P.css(0x9a7a4a);
    ctx.fillRect(-3, -4 * T, 6, 4 * T + 2);
    ctx.save();
    ctx.scale(1, Math.max(0.12, Math.cos(swing)));
    ctx.drawImage(img, 0, knot, w, h - knot, (-w * k) / 2, 0, w * k, (h - knot) * k);
    ctx.restore();
  }

  /** Draw a sprite at the current origin (bottom centre), or its placeholder if there's no art. */
  private sprite(name: SpriteName, placeholder: () => void, _arg?: number): void {
    const img = this.bank.get(name);
    if (!img) { placeholder(); return; }
    const k = SPRITES[name].scale;
    this.ctx.drawImage(img, (-img.naturalWidth * k) / 2, -img.naturalHeight * k, img.naturalWidth * k, img.naturalHeight * k);
  }

  private drawItem(rv: RoomView, it: Item): void {
    const ctx = this.ctx;
    const v = rv.items.get(it.id);
    if (!v) return;
    const t = this.time;
    ctx.save();
    if (it.carried) {
      // Swing like a pendulum from the hook at the item's top.
      const h = this.itemHeight(it);
      ctx.translate(v.x, v.y + v.hang - h);
      ctx.rotate(Math.sin(t * 3) * 0.06);
      ctx.translate(0, h);
    } else {
      const bob = it.floating ? Math.sin(t * 2.4 + it.id) * 3 : 0;
      ctx.translate(v.x, v.y + v.hang + bob);
      if (it.floating) ctx.rotate(Math.sin(t * 1.7 + it.id) * 0.05);
    }
    if (it.kind === 'boat') this.sprite('boat', () => P.blob(ctx, 130, 80, C.hull));
    else this.sprite('crate', () => P.crate(ctx, it.w * S, it.h * S));
    ctx.restore();
    if (it.kind === 'boat' && it.floating && !it.carried) {
      // Drowning timer (River Guard's boat timer bar) above the boat while it's in the water.
      const frac = Math.max(0, it.drownLeft / Boat.drownTicks);
      const top = v.y - (this.bank.get('boat')?.naturalHeight ?? 80) - 22;
      ctx.fillStyle = P.css(C.plaque);
      ctx.fillRect(v.x - 44, top, 88, 12);
      ctx.fillStyle = P.css(frac < 0.3 ? C.red : C.foam);
      ctx.fillRect(v.x - 41, top + 3, 82 * frac, 6);
    }
  }

  private drawPlayer(g: Game, rv: RoomView): void {
    const p = g.player;
    if (p.deadTicks > 0) return;
    const ctx = this.ctx;
    const a = this.alpha;
    const x = p.px + (p.x - p.px) * a;
    const y = p.py + (p.y - p.py) * a;
    const ax = (x + p.w / 2) * S;
    const ay = (y + p.h) * S;
    const t = this.time;

    // Hook line from the skids down to the load's (reeling) top.
    if (p.carrying) {
      const v = rv.items.get(p.carrying.id);
      if (v) {
        const top = v.y + v.hang - this.itemHeight(p.carrying);
        const lineTop = ay - 4;
        if (top > lineTop) {
          ctx.strokeStyle = P.css(C.woodDark);
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(ax, lineTop); ctx.lineTo(v.x, top + 4); ctx.stroke();
        }
        ctx.fillStyle = P.css(C.brass);
        ctx.strokeStyle = P.OUTLINE;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.rect(v.x - 7, top - 6, 14, 10); ctx.fill(); ctx.stroke();
      }
    }

    const fold = p.foldTicks > 0 ? p.foldTicks / Switch.foldTicks : 0;
    const grow = 1 - fold;
    const sq = Math.max(-0.35, Math.min(0.35, this.squash));
    const stretch = p.body === 'tank' && p.vy < -60 ? 0.08 : 0;
    const bodies: ['tank' | 'chopper', number, boolean][] = [[p.body, grow, true]];
    if (fold > 0.02) bodies.unshift([p.body === 'tank' ? 'chopper' : 'tank', fold, false]);
    for (const [body, size, live] of bodies) {
      ctx.save();
      if (body === 'tank') {
        const rumble = p.onGround && Math.abs(p.vx) > 10 ? -Math.abs(Math.sin(t * 28)) * 2 : 0;
        ctx.translate(ax, ay + rumble);
        const sx = live ? (1 + sq * 0.8 - stretch * 0.5) * size : size;
        const sy = live ? (1 - sq + stretch) * Math.max(0.05, size) : size;
        ctx.scale(p.facing * sx, sy);
        this.sprite('tank', () => P.blob(ctx, 110, 90, C.olive));
      } else {
        ctx.translate(ax, ay + Math.sin(t * 6) * 2);
        ctx.rotate((p.vx / Chopper.maxSpeed) * 0.22);
        const sx = live ? (1 + sq * 0.5) * size : size;
        const sy = live ? (1 - sq * 0.5) * Math.max(0.05, size) : size;
        ctx.scale(p.facing * sx, sy);
        this.drawChopper();
      }
      ctx.restore();
    }
  }

  /** The chopper with its blades spinning: the blade strip squeezed about the hub. */
  private drawChopper(): void {
    const ctx = this.ctx;
    const r = this.bank.rotor;
    if (!r) { P.blob(ctx, 120, 70, C.olive); return; }
    const k = SPRITES.chopper.scale;
    const w = r.body.width * k;
    const h = r.body.height * k;
    ctx.drawImage(r.body, -w / 2, -h, w, h);
    const f = Math.max(0.06, Math.abs(Math.cos(this.rotorPhase)));
    const hub = (r.hubX - r.body.width / 2) * k;
    // A faint disc of motion blur under the moving blades.
    ctx.fillStyle = 'rgba(60,50,40,0.13)';
    ctx.beginPath();
    ctx.ellipse(hub, -h + 7 * k, w * 0.47, 5 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(hub, 0);
    ctx.scale(f, 1);
    ctx.drawImage(r.blades, -r.hubX * k, -h, w, h);
    ctx.restore();
  }

  private drawProjectiles(g: Game): void {
    const ctx = this.ctx;
    if (g.shell) {
      ctx.save();
      ctx.translate((g.shell.x + g.shell.w / 2) * S, (g.shell.y + g.shell.h) * S);
      P.shell(ctx);
      ctx.restore();
    }
    if (g.charge) {
      ctx.save();
      ctx.translate((g.charge.x + g.charge.w / 2) * S, (g.charge.y + g.charge.h) * S);
      P.charge(ctx, this.time * 12);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- room geometry helpers

function gateCells(room: RoomState): { col: number; top: number; rows: number } | null {
  let col = -1;
  let top = ROOM_H;
  let bottom = -1;
  room.tiles.forEach((r, row) => r.forEach((ch, c) => { if (ch === 'G') { col = c; top = Math.min(top, row); bottom = Math.max(bottom, row); } }));
  return col < 0 ? null : { col, top, rows: bottom - top + 1 };
}

function bridgeCells(room: RoomState): { c0: number; row: number; len: number } | null {
  let c0 = ROOM_W;
  let c1 = -1;
  let row = 0;
  room.tiles.forEach((r, rw) => r.forEach((ch, c) => { if (ch === '=') { c0 = Math.min(c0, c); c1 = Math.max(c1, c); row = rw; } }));
  return c1 < 0 ? null : { c0, row, len: c1 - c0 + 1 };
}

/** Each stretch of water surface: its columns, its surface row and how deep it goes. */
function waterRuns(room: RoomState): { c0: number; len: number; row: number; bottom: number }[] {
  const T_ = room.tiles;
  const runs: { c0: number; len: number; row: number; bottom: number }[] = [];
  for (let row = 0; row < ROOM_H; row++) {
    let col = 0;
    while (col < ROOM_W) {
      if (T_[row][col] !== '~' || T_[row - 1]?.[col] === '~') { col++; continue; }
      const c0 = col;
      let bottom = row + 1;
      while (col < ROOM_W && T_[row][col] === '~' && T_[row - 1]?.[col] !== '~') {
        let r = row;
        while (r < ROOM_H && T_[r][col] === '~') r++;
        bottom = Math.max(bottom, r);
        col++;
      }
      runs.push({ c0, len: col - c0, row, bottom });
    }
  }
  return runs;
}

function waterBelow(room: RoomState, x: number, y: number): number | null {
  const col = Math.floor(x / TILE);
  for (let row = Math.max(0, Math.floor(y / TILE)); row < ROOM_H; row++) {
    const ch = room.tiles[row]?.[col];
    if (ch === '~') return row * TILE;
    if (ch && ch !== '.') return null;
  }
  return null;
}
