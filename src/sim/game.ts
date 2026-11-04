// The pure, deterministic game sim: one tick() = 1/60 s. No DOM, no wall clock, no Math.random.
// The view (src/view) only reads this state and the per-tick events; it never writes back.

import {
  Boat, Bomb, Bomber, Cactus, Charge, Chopper, Crate, DT, Death, Jet, Mine, PLAYER_H, PLAYER_W, Pickup, Points,
  ROOM_H, ROOM_PX_H, ROOM_PX_W, ROOM_W, Shell, Switch, TILE, Tank, Wind,
} from './config';
import type { TickInput } from './input';
import { RoomDef } from './rooms';
import { GAME_ROOMS, STAGES } from './stages';

export type BodyKind = 'tank' | 'chopper';

export type EventType =
  | 'jump' | 'land' | 'fire' | 'shellPoof' | 'targetHit' | 'bridgeDown' | 'drop' | 'blast' | 'splash'
  | 'switch' | 'hook' | 'setDown' | 'rescue' | 'gateOpen' | 'death' | 'respawn' | 'cactusGone'
  | 'cactusSprout' | 'mineClear' | 'boatLost' | 'fuelEmpty' | 'roomEnter' | 'loop' | 'floorBreak'
  | 'jetDown' | 'bombDrop' | 'bombBlast' | 'diveWarn' | 'dive' | 'gust' | 'skip' | 'complete'
  | 'bomberHit' | 'bomberDown';

export interface GameEvent {
  type: EventType;
  x: number;
  y: number;
  /** Extra detail: the new body for 'switch', the room index for 'roomEnter', points for scoring events. */
  n?: number;
  cause?: 'cactus' | 'water' | 'mine' | 'fall' | 'boat' | 'bomb' | 'jet' | 'bomber';
  /** 'rescue' of a hidden boat (found by touch, not needed for the gate). */
  hidden?: boolean;
}

export interface Box { x: number; y: number; w: number; h: number }

export interface Item extends Box {
  id: number;
  kind: 'crate' | 'boat';
  vx: number;
  vy: number;
  carried: boolean;
  floating: boolean;
  onGround: boolean;
  rescued: boolean;
  drownLeft: number;
  /** A hidden boat ('b'): stranded on land off the main path, rescued by touching it. */
  hidden: boolean;
}

export interface CactusState { col: number; row: number; grown: boolean; timer: number; age: number }
export interface MineState extends Box { vx: number; alive: boolean; minX: number; maxX: number }
export interface TargetState { col: number; row: number; hit: boolean }
export interface Projectile extends Box { vy: number }

/** A jet (see config Jet). Cross jets fly level; dive jets warn, dive down a column and climb away. */
export interface JetState extends Box {
  id: number;
  kind: 'cross' | 'dive';
  alive: boolean;
  phase: 'wait' | 'fly' | 'warn' | 'dive' | 'climb';
  /** Ticks left in the 'wait' or 'warn' phase. */
  timer: number;
  /** Direction of flight: cross jets fly this way; a dive jet climbs away this way. */
  dir: 1 | -1;
  /** Cross jets: ticks until it may drop again. */
  bombCd: number;
  /** Dive jets: the column centre (px) it dives down, locked when the warning starts. */
  aimX: number;
  /** Dive jets: the y (px) its bottom levels out at. */
  pullY: number;
  /** Ticks until a shot jet returns, in rooms with jetRespawnTicks. */
  respawn: number;
  /** It has already paid its points once (a returning jet pays nothing). */
  scored: boolean;
  /** Drops nothing and can't hurt you (the harmless jet, 'h'). */
  harmless: boolean;
}

export interface BombState extends Box { vy: number }

/** The Bomber (config Bomber; the finale's three rooms). */
export interface BomberState extends Box {
  mode: 'bay' | 'hatch' | 'flee';
  hp: number;
  maxHp: number;
  /** 'wait' offscreen between passes, 'fly' on a pass, 'down' beaten and flying off, 'gone'. */
  phase: 'wait' | 'fly' | 'down' | 'gone';
  dir: 1 | -1;
  timer: number;
  bombCd: number;
  /** Ticks left of the flash after a hit, when it can't be hit again. */
  hurt: number;
  /** 'hatch' mode: the span (px) it patrols over the lake. */
  minX: number;
  maxX: number;
}

export interface RoomState {
  index: number;
  def: RoomDef;
  tiles: string[][];
  items: Item[];
  cacti: CactusState[];
  mines: MineState[];
  targets: TargetState[];
  bridgesDown: boolean;
  gateOpen: boolean;
  boatsTotal: number;
  boatsHome: number;
  /** Hidden boats in the room (not needed for the gate) and how many were found this attempt. */
  hiddenTotal: number;
  hiddenHome: number;
  jets: JetState[];
  bombs: BombState[];
  bomber: BomberState | null;
  /** Ticks since the room (re)loaded: jets and gusts run on this clock, so a room replays exactly. */
  t: number;
  spawn: { x: number; y: number };
}

export interface Player extends Box {
  vx: number;
  vy: number;
  body: BodyKind;
  onGround: boolean;
  jumping: boolean;
  coyote: number;
  buffer: number;
  fuel: number;
  carrying: Item | null;
  facing: 1 | -1;
  foldTicks: number;
  deadTicks: number;
  /** The item you just set down; the hook ignores it until you fly away from it (HW-001). */
  lastDropped: number | null;
  /** Downward speed at the last landing, for the view's squash. */
  landSpeed: number;
  /** Position before this tick, for drawing between ticks. */
  px: number;
  py: number;
}

export interface Game {
  rooms: RoomDef[];
  room: RoomState;
  player: Player;
  entryBody: BodyKind;
  shell: Projectile | null;
  charge: Projectile | null;
  tick: number;
  score: number;
  /** Points earned in this room; banked only when you leave it (design: no farming). */
  roomPoints: number;
  deaths: number;
  roomDeaths: number;
  loops: number;
  events: GameEvent[];
  /** Index into STAGES of the current room's stage (0 = Riverside Road). Test rooms report 0. */
  stageIndex: number;
  /** Required boats rescued, banked when you leave each room (for the results card). */
  boatsSaved: number;
  /** Hidden boats found, banked when you leave each room. */
  hiddenSaved: number;
  /** Ids of rooms the player skipped (they score 0; listed on the results card). */
  skipped: string[];
  /**
   * The run is over: set when you leave the last room of the game (the Bomber finale's last room). The UI opens the results card on it, and the
   * sim stops ticking. Only the real game list ends; other room lists (tests) loop.
   */
  complete: boolean;
}

export interface GameOptions {
  rooms?: RoomDef[];
  startRoom?: number;
}

// ---------------------------------------------------------------- rooms

function loadRoom(defs: RoomDef[], index: number): RoomState {
  const def = defs[index];
  const tiles = def.rows.map((r) => [...r]);
  const items: Item[] = [];
  const cacti: CactusState[] = [];
  const mines: MineState[] = [];
  const targets: TargetState[] = [];
  const jets: JetState[] = [];
  let spawn = { x: TILE, y: 0 };
  let nextId = 1;
  for (let row = 0; row < ROOM_H; row++) {
    for (let col = 0; col < ROOM_W; col++) {
      const ch = tiles[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (ch === 'P') spawn = { x: x + (TILE - PLAYER_W) / 2, y: y + TILE - PLAYER_H };
      else if (ch === 'K') items.push(newItem(nextId++, 'crate', x, y + TILE - Crate.h));
      else if (ch === 'B') items.push(newItem(nextId++, 'boat', x, y + TILE - Boat.h));
      else if (ch === 'b') items.push({ ...newItem(nextId++, 'boat', x, y + TILE - Boat.h), hidden: true });
      else if (ch === 'J' || ch === 'j') jets.push(crossJet(jets.length + 1, col, row, ch === 'J' ? 1 : -1));
      else if (ch === 'D') jets.push(diveJet(jets.length + 1, col));
      else if (ch === 'h') jets.push({ ...crossJet(jets.length + 1, col, row, 1), harmless: true });
      else if (ch === 'C') cacti.push({ col, row, grown: true, timer: 0, age: Cactus.sproutTicks });
      else if (ch === 'T') targets.push({ col, row, hit: false });
      else if (ch === 'M') mines.push({ x: x + (TILE - Mine.w) / 2, y: y + TILE - Mine.h + 4, w: Mine.w, h: Mine.h, vx: -Mine.speed, alive: true, minX: 0, maxX: 0 });
      else continue;
      if (ch !== 'T') tiles[row][col] = '.';
    }
  }
  const room: RoomState = {
    index, def, tiles, items, cacti, mines, targets, spawn, jets, bombs: [], t: 0, bomber: def.bomber ? newBomber(def.bomber) : null,
    bridgesDown: false, gateOpen: false, boatsHome: 0, hiddenHome: 0,
    boatsTotal: items.filter((i) => i.kind === 'boat' && !i.hidden).length,
    hiddenTotal: items.filter((i) => i.hidden).length,
  };
  room.gateOpen = gateShouldOpen(room);
  // A mine patrols the water surface it starts on: the run of water tiles under it.
  for (const m of mines) {
    const row = Math.floor((m.y + m.h) / TILE);
    let lo = Math.floor((m.x + m.w / 2) / TILE);
    let hi = lo;
    while (lo > 0 && tiles[row]?.[lo - 1] === '~') lo--;
    while (hi < ROOM_W - 1 && tiles[row]?.[hi + 1] === '~') hi++;
    m.minX = lo * TILE;
    m.maxX = (hi + 1) * TILE - m.w;
  }
  return room;
}

/**
 * The gate opens when the room's boats are home (and, in a jets room, every jet is down; in the
 * Bomber's fighting rooms, the Bomber is beaten).
 */
function gateShouldOpen(room: RoomState): boolean {
  const b = room.bomber;
  return room.boatsHome >= room.boatsTotal && !(room.def.gateNeedsJets && room.jets.some((j) => j.alive))
    && !(b && b.mode !== 'flee' && b.hp > 0);
}

function newBomber(d: NonNullable<RoomDef['bomber']>): BomberState {
  const b: BomberState = {
    mode: d.mode, hp: 0, maxHp: 0, phase: 'wait', dir: 1, timer: Bomber.firstPassTicks, bombCd: 0, hurt: 0,
    minX: 0, maxX: ROOM_PX_W, x: -Bomber.w - 4, y: (d.row + 1) * TILE - 2 - Bomber.h, w: Bomber.w, h: Bomber.h,
  };
  b.hp = b.maxHp = d.mode === 'bay' ? Bomber.hpBay : d.mode === 'hatch' ? Bomber.hpHatch : 0;
  // Its first pass over the shore comes from the far side, so you see it coming across the sky
  // before it's over you (you enter on the left).
  if (d.mode === 'bay') b.dir = -1;
  if (d.mode === 'hatch') {
    // Already skimming the lake when you arrive, heading towards you.
    b.minX = (d.from ?? 0) * TILE;
    b.maxX = ((d.to ?? ROOM_W - 1) + 1) * TILE - Bomber.w;
    b.phase = 'fly';
    b.x = b.maxX;
    b.dir = -1;
  }
  return b;
}

function openGateIfDone(g: Game): void {
  const room = g.room;
  if (!room.gateOpen && gateShouldOpen(room)) {
    room.gateOpen = true;
    emit(g, 'gateOpen', ROOM_PX_W - TILE / 2, ROOM_PX_H / 2);
  }
}

function newItem(id: number, kind: Item['kind'], x: number, y: number): Item {
  const s = kind === 'crate' ? Crate : Boat;
  return { id, kind, x, y, w: s.w, h: s.h, vx: 0, vy: 0, carried: false, floating: false, onGround: false, rescued: false, drownLeft: Boat.drownTicks, hidden: false };
}

/** A cross jet at a map cell: it flies at that row; its column staggers its first entry. */
function crossJet(id: number, col: number, row: number, dir: 1 | -1): JetState {
  const j: JetState = {
    // HW-006 — found by the simulated new player in 2-4: a jet in the map's first columns entered
    // at once and was over the entrance half a second after you came in (and after every
    // respawn), so pausing to read the room got you bombed. Root cause: the first entry was only
    // the column stagger, near 0 for a jet drawn at the left. Fix: no first pass before
    // Jet.entryGraceTicks; the stagger still spaces jets drawn further along.
    id, kind: 'cross', alive: true, phase: 'wait', timer: Math.max(Jet.entryGraceTicks, 1 + col * Jet.staggerTicks), dir,
    bombCd: 0, aimX: 0, pullY: 0, respawn: 0, scored: false, harmless: false, x: 0, y: row * TILE + (TILE - Jet.h) / 2, w: Jet.w, h: Jet.h,
  };
  parkJet(j);
  return j;
}

/** A dive jet: its column staggers its first dive. It waits above the top of the room. */
function diveJet(id: number, col: number): JetState {
  return {
    id, kind: 'dive', alive: true, phase: 'wait', timer: Jet.firstDiveTicks + col * Jet.staggerTicks,
    dir: 1, bombCd: 0, aimX: 0, pullY: 0, respawn: 0, scored: false, harmless: false, x: -100, y: -Jet.h - 40, w: Jet.w, h: Jet.h,
  };
}

/** Put a cross jet just off the edge it enters from. */
function parkJet(j: JetState): void {
  j.x = j.dir === 1 ? -j.w - 4 : ROOM_PX_W + 4;
}

export function tileAt(room: RoomState, col: number, row: number): string {
  if (col < 0) return '#'; // the left edge is a wall
  if (col >= ROOM_W || row < 0 || row >= ROOM_H) return '.';
  return room.tiles[row][col];
}

export function isSolidTile(room: RoomState, col: number, row: number): boolean {
  const ch = tileAt(room, col, row);
  if (ch === '#' || ch === 'H' || ch === 'x' || ch === 'W') return true;
  if (ch === '=') return room.bridgesDown;
  if (ch === 'G') return !room.gateOpen;
  return false;
}

const isWaterAt = (room: RoomState, x: number, y: number) =>
  tileAt(room, Math.floor(x / TILE), Math.floor(y / TILE)) === '~';

/** Top of the water column at (x, y), or null if that point isn't in water. */
function waterSurface(room: RoomState, x: number, y: number): number | null {
  const col = Math.floor(x / TILE);
  let row = Math.floor(y / TILE);
  if (tileAt(room, col, row) !== '~') return null;
  while (row > 0 && tileAt(room, col, row - 1) === '~') row--;
  return row * TILE;
}

// ---------------------------------------------------------------- collision

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Crates that are resting in the world act as solid blocks for the player and for other items. */
function solidCrates(room: RoomState, except: Item | null): Item[] {
  return room.items.filter((i) => i.kind === 'crate' && !i.carried && !i.rescued && i !== except);
}

/** How far `box` can move by (dx, dy) along one axis before hitting a solid. */
function sweep(room: RoomState, box: Box, dx: number, dy: number, extras: Box[]): number {
  const b = { x: box.x + dx, y: box.y + dy, w: box.w, h: box.h };
  const c0 = Math.floor(b.x / TILE);
  const c1 = Math.floor((b.x + b.w - 0.001) / TILE);
  const r0 = Math.floor(b.y / TILE);
  const r1 = Math.floor((b.y + b.h - 0.001) / TILE);
  const blockers: Box[] = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (isSolidTile(room, c, r)) blockers.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE });
  }
  for (const e of extras) if (overlaps(b, e) && !overlaps(box, e)) blockers.push(e);
  let move = dx !== 0 ? dx : dy;
  for (const k of blockers) {
    if (!overlaps(b, k)) continue;
    if (dx > 0) move = Math.min(move, k.x - (box.x + box.w));
    else if (dx < 0) move = Math.max(move, k.x + k.w - box.x);
    else if (dy > 0) move = Math.min(move, k.y - (box.y + box.h));
    else if (dy < 0) move = Math.max(move, k.y + k.h - box.y);
  }
  // Never move backwards out of a sweep (a blocker already overlapping is ignored above).
  if (dx > 0 || dy > 0) move = Math.max(0, move);
  else move = Math.min(0, move);
  return move;
}

// ---------------------------------------------------------------- game

/**
 * A new run. With no options it starts the real game: stage 1 (Riverside Road), room 1, through all
 * the stages in STAGES. `rooms` swaps in another room list (tests, the feel-check TEST_ROOMS).
 */
export function createGame(opts: GameOptions = {}): Game {
  const rooms = opts.rooms ?? GAME_ROOMS;
  const room = loadRoom(rooms, opts.startRoom ?? 0);
  const body = room.def.startBody ?? 'tank';
  const g: Game = {
    rooms, room, player: newPlayer(room, body), entryBody: body,
    shell: null, charge: null, tick: 0, score: 0, roomPoints: 0, deaths: 0, roomDeaths: 0, loops: 0,
    events: [], stageIndex: room.def.stage ?? 0, boatsSaved: 0, hiddenSaved: 0, skipped: [], complete: false,
  };
  return g;
}

/** The current stage, for the HUD, saves and the results card. */
export function stageInfo(g: Game): { index: number; name: string; roomInStage: number; roomsInStage: number; stageCount: number } {
  const def = g.room.def;
  const stage = STAGES[g.stageIndex];
  const inThisStage = g.rooms.filter((r) => (r.stage ?? 0) === g.stageIndex);
  return {
    index: g.stageIndex,
    name: def.stage === undefined ? def.name : stage?.name ?? def.name,
    roomInStage: Math.max(0, inThisStage.indexOf(def)) + 1,
    roomsInStage: inThisStage.length,
    stageCount: STAGES.length,
  };
}

/** Index (into g.rooms) of the first room of a stage, for Continue; -1 if that stage isn't in the list. */
export function firstRoomOfStage(g: Game, stage: number): number {
  return g.rooms.findIndex((r) => (r.stage ?? 0) === stage);
}

/**
 * Skip this room (the offer appears after Help.skipDeaths deaths here). Its points are discarded,
 * it is listed in g.skipped, and you start the next room fresh at its entrance.
 */
export function skipRoom(g: Game): void {
  g.skipped.push(g.room.def.id);
  g.roomPoints = 0;
  emit(g, 'skip', cx(g.player), cy(g.player));
  enterRoom(g, g.room.index + 1, false);
}

/** Jump straight to a room (Continue from a saved stage, debug tools): you start fresh at its entrance. */
export function goToRoom(g: Game, index: number): void {
  g.roomPoints = 0;
  enterRoom(g, index, false);
}

/** The wind's push this tick (px/s, + is right): 0 outside a gust or in a room without wind. */
export function windAt(room: RoomState): number {
  const w = room.def.wind;
  if (!w) return 0;
  const phase = (room.t + (w.offset ?? 0)) % w.period;
  if (phase >= w.duty) return 0;
  const env = Math.min(1, phase / Wind.rampTicks, (w.duty - phase) / Wind.rampTicks);
  return w.dir * w.speed * env;
}

function newPlayer(room: RoomState, body: BodyKind): Player {
  const { x, y } = room.spawn;
  return {
    x, y, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, body, onGround: false, jumping: false, coyote: 0, buffer: 0,
    fuel: Chopper.fuelTicks, carrying: null, facing: 1, foldTicks: 0, deadTicks: 0,
    lastDropped: null, landSpeed: 0, px: x, py: y,
  };
}

const emit = (g: Game, type: EventType, x: number, y: number, extra: Partial<GameEvent> = {}) =>
  g.events.push({ type, x, y, ...extra });

const cx = (b: Box) => b.x + b.w / 2;
const cy = (b: Box) => b.y + b.h / 2;

function resetRoom(g: Game): void {
  g.room = loadRoom(g.rooms, g.room.index);
  g.stageIndex = g.room.def.stage ?? 0;
  g.player = newPlayer(g.room, g.entryBody);
  g.shell = null;
  g.charge = null;
  g.roomPoints = 0;
  emit(g, 'respawn', cx(g.player), cy(g.player));
}

/**
 * Enter room `index` (past the last room the game is complete and wraps to the first). With
 * `carry`, the room's points and boats are banked and you arrive in the body and at the speed you
 * left in; without (skip, Continue), you start fresh at the entrance in the room's start body.
 */
function enterRoom(g: Game, index: number, carry = true): void {
  const p = g.player;
  if (carry) {
    g.score += g.roomPoints;
    g.boatsSaved += g.room.boatsHome;
    g.hiddenSaved += g.room.hiddenHome;
  }
  g.roomPoints = 0;
  g.roomDeaths = 0;
  const wrapped = index >= g.rooms.length;
  if (wrapped && g.rooms === GAME_ROOMS) {
    // The end of the run: stay where you are; the UI shows the results card.
    g.complete = true;
    g.player.vx = 0;
    emit(g, 'complete', cx(p), cy(p));
    return;
  }
  const next = wrapped ? 0 : index;
  if (wrapped) g.loops++;
  g.room = loadRoom(g.rooms, next);
  g.stageIndex = g.room.def.stage ?? 0;
  const def = g.room.def;
  // You keep your body into the next room, unless that room doesn't allow switching.
  const body: BodyKind = !carry || !def.canSwitch ? def.startBody ?? 'tank' : p.body;
  g.entryBody = body;
  const np = newPlayer(g.room, body);
  if (carry && body === p.body) {
    np.vx = p.vx;
    np.vy = Math.min(p.vy, 0);
    np.facing = p.facing;
    np.fuel = p.fuel;
  }
  g.player = np;
  g.shell = null;
  g.charge = null;
  emit(g, wrapped ? 'loop' : 'roomEnter', cx(np), cy(np), { n: next });
}

function die(g: Game, cause: GameEvent['cause']): void {
  const p = g.player;
  if (p.deadTicks > 0) return;
  emit(g, 'death', cx(p), cy(p), { cause, n: p.body === 'tank' ? 0 : 1 });
  if (cause === 'water') emit(g, 'splash', cx(p), p.y + p.h);
  if (p.carrying) p.carrying.carried = false;
  p.carrying = null;
  p.deadTicks = Death.respawnTicks;
  p.vx = 0;
  p.vy = 0;
  g.deaths++;
  g.roomDeaths++;
  g.shell = null;
  g.charge = null;
}

function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}

export function tick(g: Game, inp: TickInput): void {
  g.events = [];
  if (g.complete) return; // the run is over
  g.tick++;
  const p = g.player;
  p.px = p.x;
  p.py = p.y;

  if (p.deadTicks > 0) {
    p.deadTicks--;
    if (p.deadTicks === 0) resetRoom(g);
    return;
  }

  g.room.t++;
  const w = g.room.def.wind;
  if (w && (g.room.t + (w.offset ?? 0)) % w.period === 0) emit(g, 'gust', w.dir === 1 ? 0 : ROOM_PX_W, ROOM_PX_H / 2, { n: w.dir });
  updatePlayer(g, inp);
  if (g.player !== p) return; // left the room this tick
  updateProjectiles(g);
  updateJets(g);
  updateBomber(g);
  updateBombs(g);
  updateItems(g);
  updateHazards(g);
}

// ---------------------------------------------------------------- player

function updatePlayer(g: Game, inp: TickInput): void {
  const p = g.player;
  const room = g.room;
  if (p.foldTicks > 0) p.foldTicks--;

  // Switch body (design Q1: any time, including mid-air).
  if (inp.press.switch && room.def.canSwitch && p.foldTicks === 0) {
    if (p.body === 'tank') {
      p.body = 'chopper';
      p.jumping = false;
      p.vy = Math.max(p.vy, -Chopper.maxRise);
    } else {
      p.body = 'tank';
      if (p.carrying) release(g, p.carrying);
      if (!p.onGround) p.vy = Math.max(p.vy, Switch.dropStartSpeed);
    }
    p.foldTicks = Switch.foldTicks;
    emit(g, 'switch', cx(p), cy(p), { n: p.body === 'tank' ? 0 : 1 });
  }

  const dir = (inp.held.right ? 1 : 0) - (inp.held.left ? 1 : 0);
  if (dir !== 0) p.facing = dir as 1 | -1;

  if (p.body === 'tank') {
    const accel = p.onGround ? (dir ? Tank.accelGround : Tank.decelGround) : (dir ? Tank.accelAir : Tank.decelAir);
    p.vx = approach(p.vx, dir * Tank.maxSpeed, accel * DT);
    // Coyote time counts the ticks since you last stood on something: a jump on any of the
    // coyoteTicks ticks after leaving a ledge still works.
    if (p.onGround) p.coyote = Tank.coyoteTicks;
    p.buffer = inp.press.jump ? Tank.bufferTicks : Math.max(0, p.buffer - 1);
    const canJump = p.onGround || p.coyote > 0;
    if (!p.onGround) p.coyote = Math.max(0, p.coyote - 1);
    if (p.buffer > 0 && canJump) {
      p.vy = -Tank.jumpSpeed;
      p.buffer = 0;
      p.coyote = 0;
      p.onGround = false;
      p.jumping = true;
      emit(g, 'jump', cx(p), p.y + p.h);
    }
    if (p.jumping && p.vy < 0 && !inp.held.jump) {
      p.vy *= Tank.jumpCut;
      p.jumping = false;
    }
    if (p.vy >= 0) p.jumping = false;
    p.vy = Math.min(Tank.maxFall, p.vy + (p.vy < 0 ? Tank.gravityUp : Tank.gravityDown) * DT);
  } else {
    const top = p.carrying ? Chopper.maxSpeedCarrying : Chopper.maxSpeed;
    p.vx = approach(p.vx, dir * top, (dir ? Chopper.accel : Chopper.decel) * DT);
    const thrusting = inp.held.jump && p.fuel > 0;
    if (thrusting) {
      p.vy -= Chopper.thrust * DT;
      p.fuel--;
      if (p.fuel === 0) emit(g, 'fuelEmpty', cx(p), cy(p));
    }
    p.vy += Chopper.gravity * DT;
    const maxDown = p.fuel > 0 ? Chopper.maxDrift : Chopper.maxSinkEmpty;
    if (p.vy < -Chopper.maxRise) p.vy = -Chopper.maxRise;
    // A falling tank that folds into the chopper is caught, not stopped dead: that's the mid-air switch.
    if (p.vy > maxDown) p.vy = Math.max(maxDown, p.vy - 900 * DT);
  }

  // Action: the tank fires up; the chopper drops a charge down, or sets down what it carries.
  if (inp.press.action) {
    if (p.body === 'tank') {
      if (!g.shell) {
        g.shell = { x: cx(p) - Shell.w / 2, y: p.y - Shell.h, w: Shell.w, h: Shell.h, vy: -Shell.speed };
        emit(g, 'fire', cx(p), p.y);
      }
    } else if (p.carrying) {
      release(g, p.carrying);
    } else if (!g.charge) {
      g.charge = { x: cx(p) - Charge.w / 2, y: p.y + p.h, w: Charge.w, h: Charge.h, vy: Charge.startSpeed + Math.max(0, p.vy) };
      emit(g, 'drop', cx(p), p.y + p.h);
    }
  }

  movePlayer(g);
  if (g.player !== p) return;

  if (p.body === 'chopper') {
    if (p.onGround) p.fuel = Math.min(Chopper.fuelTicks, p.fuel + Chopper.refillTicksPerTick);
    updateHook(g);
  }
}

function carriedBox(p: Player, item: Item): Box {
  return { x: cx(p) - item.w / 2, y: p.y + p.h + Chopper.hangGap, w: item.w, h: item.h };
}

function movePlayer(g: Game): void {
  const p = g.player;
  const room = g.room;
  const item = p.carrying;
  const extras = solidCrates(room, item);
  const wasOnGround = p.onGround;
  const fallSpeed = p.vy;

  // Horizontal, then vertical. A carried item moves with the chopper and blocks it like part of its body.
  // Gusts push the chopper (not the heavy tank) on top of its own speed.
  const want = (p.vx + (p.body === 'chopper' ? windAt(room) : 0)) * DT;
  let dx = sweep(room, p, want, 0, extras);
  if (item) {
    const ib = carriedBox(p, item);
    const ix = sweep(room, ib, dx, 0, extras);
    if (Math.abs(ix) < Math.abs(dx)) dx = ix;
  }
  if (dx !== want) p.vx = 0;
  p.x += dx;

  let dy = p.vy * DT;
  dy = sweep(room, p, 0, dy, extras);
  if (item) {
    const ib = carriedBox(p, item);
    const iy = sweep(room, ib, 0, dy, extras);
    if (Math.abs(iy) < Math.abs(dy)) dy = iy;
  }
  const blocked = dy !== p.vy * DT;
  p.onGround = blocked && p.vy > 0;
  if (blocked) p.vy = 0;
  p.y += dy;
  if (p.y < 0) {
    p.y = 0;
    if (p.vy < 0) p.vy = 0;
  }
  if (item) {
    const ib = carriedBox(p, item);
    item.x = ib.x;
    item.y = ib.y;
  }

  if (!wasOnGround && p.onGround && fallSpeed > 60) {
    p.landSpeed = fallSpeed;
    emit(g, 'land', cx(p), p.y + p.h, { n: Math.round(fallSpeed) });
  }

  // Exits and edges.
  if (cx(p) > ROOM_PX_W) {
    enterRoom(g, room.index + 1);
    return;
  }
  if (p.y > ROOM_PX_H) die(g, 'fall');
}

function updateHook(g: Game): void {
  const p = g.player;
  const items = g.room.items;
  // HW-001 — found by Debu in the feel check: the hook needed a 0.2 s hover within 10 px of the
  // boat, which was very hard to hold. Root cause: the hover rule existed only so that landing on
  // a crate wouldn't pick it up. Fix: the hook is automatic: fly within reach (about 2 tiles down,
  // a tile either side) and it takes the nearest item at once. The crate you just set down is the
  // one exception until you fly away from it, which keeps "set a crate down, land on it, refuel".
  if (p.lastDropped !== null) {
    const it = items.find((i) => i.id === p.lastDropped);
    if (!it || it.carried || it.rescued || Math.abs(cx(it) - cx(p)) > Pickup.rearmDistance) p.lastDropped = null;
  }
  if (p.carrying || p.onGround || p.foldTicks > 0) return;
  const bottom = p.y + p.h;
  let best: Item | null = null;
  for (const i of items) {
    if (i.carried || i.rescued || i.hidden || i.id === p.lastDropped) continue;
    const gap = i.y - bottom;
    if (Math.abs(cx(i) - cx(p)) > Pickup.reachX || gap < -4 || gap > Pickup.reachDown) continue;
    if (!best || gap < best.y - bottom) best = i;
  }
  if (!best || tileBoxSolid(g.room, carriedBox(p, best))) return;
  best.carried = true;
  best.floating = false;
  best.onGround = false;
  best.vx = 0;
  best.vy = 0;
  p.carrying = best;
  const placed = carriedBox(p, best);
  best.x = placed.x;
  best.y = placed.y;
  emit(g, 'hook', cx(best), best.y);
}

function tileBoxSolid(room: RoomState, b: Box): boolean {
  const c0 = Math.floor(b.x / TILE);
  const c1 = Math.floor((b.x + b.w - 0.001) / TILE);
  const r0 = Math.floor(b.y / TILE);
  const r1 = Math.floor((b.y + b.h - 0.001) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (isSolidTile(room, c, r)) return true;
  return false;
}

function release(g: Game, item: Item): void {
  const p = g.player;
  item.carried = false;
  item.vx = p.vx * 0.5;
  item.vy = Math.max(0, p.vy);
  p.carrying = null;
  p.lastDropped = item.id;
  emit(g, 'setDown', cx(item), item.y + item.h);
}

// ---------------------------------------------------------------- shell and charge

function updateProjectiles(g: Game): void {
  const room = g.room;
  const s = g.shell;
  if (s) {
    s.y += s.vy * DT;
    const t = room.targets.find((t) => !t.hit && overlaps(s, { x: t.col * TILE + 2, y: t.row * TILE + 2, w: 12, h: 12 }));
    const jet = room.jets.find((j) => j.alive && j.phase !== 'wait' && j.phase !== 'warn' && overlaps(s, j));
    const bomber = room.bomber;
    if (bomber && bomber.phase === 'fly' && bomber.mode !== 'flee' && overlaps(s, bomber)) {
      g.shell = null;
      // Only its bomb bay can be shot: in the lake room its belly is armoured (a charge on the hatch).
      if (bomber.mode === 'bay' && bomber.hurt === 0) hitBomber(g, bomber);
      else emit(g, 'shellPoof', cx(s), s.y);
    } else if (jet) {
      jet.alive = false;
      jet.respawn = room.def.jetRespawnTicks ?? 0;
      g.shell = null;
      const pts = jet.scored ? 0 : Points.jet;
      jet.scored = true;
      g.roomPoints += pts;
      emit(g, 'jetDown', cx(jet), cy(jet), { n: pts });
      openGateIfDone(g);
    } else if (t) {
      t.hit = true;
      g.shell = null;
      emit(g, 'targetHit', t.col * TILE + 8, t.row * TILE + 8);
      if (room.targets.every((x) => x.hit) && !room.bridgesDown) {
        room.bridgesDown = true;
        const b = bridgeCentre(room);
        emit(g, 'bridgeDown', b.x, b.y);
      }
    } else if (isSolidTile(room, Math.floor(cx(s) / TILE), Math.floor(s.y / TILE)) && s.y < ROOM_PX_H) {
      emit(g, 'shellPoof', cx(s), s.y);
      g.shell = null;
    } else if (s.y + s.h < -TILE) {
      g.shell = null;
    }
  }

  const c = g.charge;
  if (c) {
    c.vy = Math.min(Charge.maxFall, c.vy + Charge.gravity * DT);
    c.y += c.vy * DT;
    c.x += windAt(room) * Wind.chargeFactor * DT;
    const x = cx(c);
    const bottom = c.y + c.h;
    const surface = waterSurface(room, x, bottom);
    const hitTile = isSolidTile(room, Math.floor(x / TILE), Math.floor(bottom / TILE));
    const hitCactus = room.cacti.some((k) => k.grown && overlaps(c, cactusBox(k)));
    const hitMine = room.mines.some((m) => m.alive && overlaps(c, m));
    const hitCrate = room.items.some((i) => !i.carried && !i.rescued && overlaps(c, i));
    const b = room.bomber;
    if (b && b.phase === 'fly' && b.mode !== 'flee' && overlaps(c, b)) {
      // A charge on its top hatch (it can't be hit again while it flashes).
      if (b.hurt === 0) hitBomber(g, b);
      blast(g, x, b.y);
    } else if (surface !== null) {
      emit(g, 'splash', x, surface);
      blast(g, x, surface);
    } else if (hitTile || hitCactus || hitMine || hitCrate) {
      blast(g, x, Math.min(bottom, Math.floor(bottom / TILE) * TILE));
    } else if (c.y > ROOM_PX_H) {
      g.charge = null;
    }
  }
}

function bridgeCentre(room: RoomState): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  let n = 0;
  room.tiles.forEach((r, row) => r.forEach((ch, col) => {
    if (ch === '=') { sx += col * TILE + 8; sy += row * TILE + 8; n++; }
  }));
  return n ? { x: sx / n, y: sy / n } : { x: 0, y: 0 };
}

export function cactusBox(k: CactusState): Box {
  const i = Cactus.inset;
  return { x: k.col * TILE + i, y: k.row * TILE + i, w: TILE - 2 * i, h: TILE - i };
}

function blast(g: Game, x: number, y: number): void {
  const room = g.room;
  g.charge = null;
  emit(g, 'blast', x, y);
  const r = Charge.blastRadius;
  const near = (bx: number, by: number, extra: number) => Math.hypot(bx - x, by - y) <= r + extra;
  for (const k of room.cacti) {
    if (k.grown && near(k.col * TILE + 8, k.row * TILE + 10, 8)) {
      k.grown = false;
      k.timer = Cactus.regrowTicks;
      emit(g, 'cactusGone', k.col * TILE + 8, k.row * TILE + 8);
    }
  }
  for (let row = 0; row < ROOM_H; row++) for (let col = 0; col < ROOM_W; col++) {
    if (room.tiles[row][col] === 'x' && near(col * TILE + 8, row * TILE + 8, 8)) {
      room.tiles[row][col] = '.';
      emit(g, 'floorBreak', col * TILE + 8, row * TILE + 8);
    }
  }
  for (const m of room.mines) {
    if (m.alive && near(cx(m), cy(m), 6)) {
      m.alive = false;
      g.roomPoints += Points.mine;
      emit(g, 'mineClear', cx(m), cy(m), { n: Points.mine });
    }
  }
}

// ---------------------------------------------------------------- jets and bombs

/** Top of the first solid tile or water surface at or below y in column x (px), or the room bottom. */
function groundBelow(room: RoomState, x: number, y: number): number {
  const col = Math.floor(x / TILE);
  for (let row = Math.max(0, Math.floor(y / TILE)); row < ROOM_H; row++) {
    if (isSolidTile(room, col, row) || tileAt(room, col, row) === '~') return row * TILE;
  }
  return ROOM_PX_H;
}

function updateJets(g: Game): void {
  const room = g.room;
  const p = g.player;
  const alive = p.deadTicks === 0;
  for (const j of room.jets) {
    if (!j.alive) {
      // In a room that needs a jet's bomb, a shot jet comes back (and pays nothing the second time).
      if (j.respawn > 0 && --j.respawn === 0) {
        j.alive = true;
        j.phase = 'wait';
        j.timer = j.kind === 'cross' ? 1 : Jet.diveGapTicks;
        if (j.kind === 'dive') j.y = -j.h - 40;
      }
      continue;
    }
    if (j.kind === 'cross') {
      if (j.phase === 'wait') {
        if (--j.timer <= 0) { j.phase = 'fly'; parkJet(j); }
        continue;
      }
      j.x += j.dir * (j.harmless ? Jet.harmlessSpeed : Jet.crossSpeed) * DT;
      if (j.bombCd > 0) j.bombCd--;
      const onScreen = j.x > 0 && j.x + j.w < ROOM_PX_W;
      // HW-005 — found by the simulated new player in F-3: a cross jet bombed a chopper flying
      // about 40 px below it, and the bomb arrived before a human could react and move. Root cause:
      // the drop rule only asked "is the player below?", and HW-002's fall-time check covered tanks
      // on the ground, never a chopper in the air. Fix: no drop unless you're at least Bomb.minDrop
      // below, which is far enough for the bomb's fall to outlast reacting and moving clear.
      const overYou = alive && p.y - (j.y + j.h) >= Bomb.minDrop && Math.abs(cx(j) - cx(p)) < Jet.dropWindow;
      // Jets attack the boats too, once the room's boat grace is over (config Jet.boatGraceTicks).
      const overBoat = alive && room.t >= Jet.boatGraceTicks && room.items.some((i) => i.kind === 'boat' && !i.hidden && !i.rescued
        && !i.carried && i.y - (j.y + j.h) >= Bomb.minDrop && Math.abs(cx(i) - cx(j)) < Jet.dropWindow);
      if (!j.harmless && onScreen && j.bombCd === 0 && (overYou || overBoat)) {
        room.bombs.push({ x: cx(j) - Bomb.w / 2, y: j.y + j.h, w: Bomb.w, h: Bomb.h, vy: 0 });
        j.bombCd = Jet.bombCooldownTicks;
        emit(g, 'bombDrop', cx(j), j.y + j.h);
      }
      if ((j.dir === 1 && j.x > ROOM_PX_W + 4) || (j.dir === -1 && j.x + j.w < -4)) {
        j.phase = 'wait';
        j.timer = Jet.passGapTicks;
      }
    } else if (j.phase === 'wait') {
      if (--j.timer > 0 || !alive) continue;
      // Lock onto the column you're in, and warn.
      j.phase = 'warn';
      j.timer = Jet.warnTicks;
      j.aimX = Math.max(Jet.w / 2, Math.min(ROOM_PX_W - Jet.w / 2, cx(p)));
      j.x = j.aimX - j.w / 2;
      j.y = -j.h - 2;
      j.pullY = groundBelow(room, j.aimX, 0) - Jet.skim;
      // Over the lake where the Bomber skims, it levels out above the Bomber's line, not through it.
      if (room.bomber?.mode === 'hatch' && room.bomber.phase === 'fly') j.pullY = Math.min(j.pullY, room.bomber.y - Jet.skim);
      j.dir = j.aimX < ROOM_PX_W / 2 ? 1 : -1; // it climbs away towards the far side
      emit(g, 'diveWarn', j.aimX, 0);
    } else if (j.phase === 'warn') {
      if (--j.timer <= 0) { j.phase = 'dive'; emit(g, 'dive', j.aimX, 0); }
    } else if (j.phase === 'dive') {
      j.y += Jet.diveSpeed * DT;
      if (j.y + j.h >= j.pullY) {
        j.y = j.pullY - j.h;
        j.phase = 'climb';
        // HW-003 — found while checking HW-002: the jet pulled out towards the far side of the
        // room, chosen when it locked on, so a player who dodged that way was hit at ground level
        // with no warning. Root cause: the climb ignored where the player went. Fix: it pulls out
        // away from the player, so any dodge out of the warned column is safe.
        j.dir = cx(p) < j.aimX ? 1 : -1;
      }
    } else {
      j.x += j.dir * Jet.climbSpeed * DT;
      j.y -= Jet.climbSpeed * 0.6 * DT;
      if (j.y + j.h < -4 || j.x > ROOM_PX_W + 4 || j.x + j.w < -4) {
        j.phase = 'wait';
        j.timer = Jet.diveGapTicks;
        j.y = -j.h - 40;
      }
    }
  }
}

function hitBomber(g: Game, b: BomberState): void {
  b.hp--;
  b.hurt = Bomber.hurtTicks;
  g.roomPoints += Points.bomberHit;
  emit(g, 'bomberHit', cx(b), cy(b), { n: Points.bomberHit });
  if (b.hp <= 0) {
    b.phase = 'down';
    g.roomPoints += Points.bomberDown;
    emit(g, 'bomberDown', cx(b), cy(b), { n: Points.bomberDown });
    openGateIfDone(g);
  }
}

function updateBomber(g: Game): void {
  const b = g.room.bomber;
  if (!b || b.phase === 'gone') return;
  const p = g.player;
  if (b.hurt > 0) b.hurt--;
  if (b.bombCd > 0) b.bombCd--;
  const offscreen = () => (b.dir === 1 && b.x > ROOM_PX_W + 4) || (b.dir === -1 && b.x + b.w < -4);
  if (b.phase === 'wait') {
    if (--b.timer <= 0) {
      b.phase = 'fly';
      b.x = b.dir === 1 ? -b.w - 4 : ROOM_PX_W + 4;
    }
  } else if (b.phase === 'down') {
    b.x += b.dir * Bomber.fleeSpeed * DT;
    b.y += 10 * DT;
    if (offscreen()) b.phase = 'gone';
  } else if (b.mode === 'hatch') {
    b.x += b.dir * Bomber.speed * DT;
    if (b.x <= b.minX) { b.x = b.minX; b.dir = 1; }
    if (b.x >= b.maxX) { b.x = b.maxX; b.dir = -1; }
  } else {
    b.x += b.dir * (b.mode === 'flee' ? Bomber.limpSpeed : Bomber.speed) * DT;
    const onScreen = b.x > 0 && b.x + b.w < ROOM_PX_W;
    if (b.mode === 'bay' && p.deadTicks === 0 && onScreen && b.bombCd === 0 && p.y - (b.y + b.h) >= Bomb.minDrop && Math.abs(cx(b) - cx(p)) < Bomber.dropWindow) { // HW-005
      g.room.bombs.push({ x: cx(b) - Bomb.w / 2, y: b.y + b.h, w: Bomb.w, h: Bomb.h, vy: 0 });
      b.bombCd = Bomber.bombCooldownTicks;
      emit(g, 'bombDrop', cx(b), b.y + b.h);
    }
    if (offscreen()) {
      if (b.mode === 'flee') b.phase = 'gone';
      else {
        // It turns round offscreen and comes back the other way.
        b.dir = b.dir === 1 ? -1 : 1;
        b.phase = 'wait';
        b.timer = Bomber.passGapTicks;
      }
    }
  }
}

function updateBombs(g: Game): void {
  const room = g.room;
  const p = g.player;
  for (const b of [...room.bombs]) {
    b.vy = Math.min(Bomb.maxFall, b.vy + Bomb.gravity * DT);
    b.y += b.vy * DT;
    const x = cx(b);
    const bottom = b.y + b.h;
    const gone = () => room.bombs.splice(room.bombs.indexOf(b), 1);
    if (p.deadTicks === 0 && overlaps(b, p)) {
      gone();
      emit(g, 'bombBlast', x, bottom);
      die(g, 'bomb');
      return;
    }
    const boat = room.items.find((i) => i.kind === 'boat' && !i.hidden && !i.rescued && overlaps(b, i));
    if (boat) {
      gone();
      emit(g, 'bombBlast', x, bottom);
      emit(g, 'boatLost', cx(boat), cy(boat));
      die(g, 'boat');
      return;
    }
    const surface = waterSurface(room, x, bottom);
    if (surface !== null) {
      gone();
      emit(g, 'splash', x, surface);
      continue;
    }
    const crate = room.items.some((i) => i.kind === 'crate' && !i.rescued && overlaps(b, i));
    if (isSolidTile(room, Math.floor(x / TILE), Math.floor(bottom / TILE)) || crate) {
      gone();
      const y = crate ? bottom : Math.floor(bottom / TILE) * TILE;
      emit(g, 'bombBlast', x, y);
      // A bomb breaks cracked floor where it lands: lure one onto a crack to open the way down.
      for (let row = 0; row < ROOM_H; row++) for (let col = 0; col < ROOM_W; col++) {
        if (room.tiles[row][col] === 'x' && Math.hypot(col * TILE + 8 - x, row * TILE + 8 - y) <= Bomb.blastRadius) {
          room.tiles[row][col] = '.';
          emit(g, 'floorBreak', col * TILE + 8, row * TILE + 8);
        }
      }
      if (p.deadTicks === 0 && Math.hypot(cx(p) - x, cy(p) - y) <= Bomb.killRadius) die(g, 'bomb');
      continue;
    }
    if (b.y > ROOM_PX_H) gone();
  }
}

// ---------------------------------------------------------------- crates and boats

function updateItems(g: Game): void {
  const room = g.room;
  for (const it of room.items) {
    if (it.carried || it.rescued) continue;
    it.vy = Math.min(Charge.maxFall, it.vy + Charge.gravity * DT);
    it.vx = approach(it.vx, 0, 300 * DT);
    // A falling crate or boat lands on the player instead of swallowing them.
    const extras: Box[] = solidCrates(room, it);
    if (g.player.deadTicks === 0) extras.push(g.player);
    const dx = sweep(room, it, it.vx * DT, 0, extras);
    if (dx !== it.vx * DT) it.vx = 0;
    it.x += dx;
    const dy = sweep(room, it, 0, it.vy * DT, extras);
    const blocked = dy !== it.vy * DT;
    it.onGround = blocked && it.vy > 0;
    if (blocked) it.vy = 0;
    it.y += dy;
    // Crates and boats float: they rest a few pixels into the water surface.
    const surface = waterSurface(room, cx(it), it.y + it.h);
    if (surface !== null) {
      if (!it.floating) emit(g, 'splash', cx(it), surface);
      it.floating = true;
      it.y = surface - it.h + 4;
      it.vy = 0;
    } else {
      it.floating = false;
    }
    if (it.y > ROOM_PX_H) it.rescued = true; // fell out of the world; gone for this attempt

    if (it.hidden) {
      // A hidden boat is found by touching it (in either body).
      if (g.player.deadTicks === 0 && overlaps(g.player, it)) {
        it.rescued = true;
        room.hiddenHome++;
        g.roomPoints += Points.boat;
        emit(g, 'rescue', cx(it), cy(it), { n: Points.boat, hidden: true });
      }
      continue;
    }
    if (it.kind === 'boat') {
      if (it.floating) {
        it.drownLeft--;
        if (it.drownLeft <= 0) {
          emit(g, 'boatLost', cx(it), cy(it));
          die(g, 'boat');
          return;
        }
      }
      const under = tileAt(room, Math.floor(cx(it) / TILE), Math.floor((it.y + it.h + 1) / TILE));
      if (it.onGround && under === 'H') {
        it.rescued = true;
        room.boatsHome++;
        g.roomPoints += Points.boat;
        emit(g, 'rescue', cx(it), cy(it), { n: Points.boat });
        openGateIfDone(g);
      }
    }
  }
}

// ---------------------------------------------------------------- hazards

function updateHazards(g: Game): void {
  const room = g.room;
  const p = g.player;

  for (const k of room.cacti) {
    if (k.grown) {
      k.age++;
      continue;
    }
    if (k.timer > 0) k.timer--;
    // A cactus regrows only when the spot is clear, so it never grows into the player.
    if (k.timer === 0 && !overlaps(p, cactusBox(k))) {
      k.grown = true;
      k.age = 0;
      emit(g, 'cactusSprout', k.col * TILE + 8, k.row * TILE + 12);
    }
  }

  for (const m of room.mines) {
    if (!m.alive) continue;
    m.x += m.vx * DT;
    if (m.x <= m.minX) { m.x = m.minX; m.vx = Math.abs(m.vx); }
    if (m.x >= m.maxX) { m.x = m.maxX; m.vx = -Math.abs(m.vx); }
    for (const it of room.items) {
      if (it.carried || it.rescued || !overlaps(m, it)) continue;
      if (it.kind === 'boat') {
        emit(g, 'boatLost', cx(it), cy(it));
        die(g, 'boat');
        return;
      }
      m.vx = cx(m) < cx(it) ? -Math.abs(m.vx) : Math.abs(m.vx); // a crate turns a mine around
    }
  }

  if (p.deadTicks > 0) return;
  const hit = { x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 1 };
  if (room.cacti.some((k) => k.grown && overlaps(hit, cactusBox(k)))) return die(g, 'cactus');
  if (room.mines.some((m) => m.alive && overlaps(hit, m))) return die(g, 'mine');
  if (room.jets.some((j) => j.alive && !j.harmless && (j.phase === 'fly' || j.phase === 'dive' || j.phase === 'climb') && overlaps(hit, j))) return die(g, 'jet');
  const b = room.bomber;
  if (b && b.phase === 'fly' && b.mode !== 'flee' && overlaps(hit, b)) return die(g, 'bomber');
  if (isWaterAt(room, cx(p), p.y + p.h - 3)) return die(g, 'water');
}
