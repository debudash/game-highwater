// River Guard simulation. One call to tick() = one 60 ms game tick, resolved in the fixed
// rulebook §9 Tick order:
//   1 input and player movement · 2 timers · 3 threat and shell steps · 4 respawn · 5 hits · 6 crisis spawns
// Pure and deterministic (seeded RNG, no wall clock, no DOM). Section refs: river-guard-rulebook.md (§),
// level-1 script: river-guard-level1.md (L1).

import {
  Band, CENTRE_COL, CHOPPER_ROW, COLS, DifficultyTable, GROUND_ROW, HOOKED_BOAT_ROW, JUMP_ROW,
  LANE_ROW, LAST_ROW, LEFT_BANK, RIGHT_BANK, S, Tunables, bandForScore,
} from './config';
import { TickInput } from './input';
import { RngHolder, randInt, rngNext } from './rng';
import { respawnColumn } from './respawn';
import { Messages, createMessages, raise, trimMessages } from './messages';

export type PlayerMode = 'Tank' | 'TankJump' | 'ChopperFree' | 'ChopperHooked' | 'TankInvuln';
export type Crisis = 'None' | 'Boat' | 'Mine';
export type GameOverReason = 'Lives' | 'DrownedBoats';
type Dir = -1 | 0 | 1;

/** Anything that steps on a timer: shell, jets, bombs, the jet spawner (§9 step accumulators). */
export interface Mover {
  acc: number;
  lastInterval: number;
  bornTick: number;
  /** Held at interval − 1 by a block (ceiling, stagger slot, SkyPolicy spawner). See RG-003. */
  capped?: boolean;
}

export interface Jet extends Mover {
  id: number;
  path: 'dive' | 'cross';
  col: number;
  row: number;
  dir: Dir; // cross jets: +1 flies right, -1 flies left
  opp: number; // drop opportunities used so far (index of the next cell entered)
  bombsDropped: number;
  guaranteedIndex: number | null;
  script: 'l1cross' | 'l1dive' | null;
  stagger: number | null; // return-stampede slot (§9), null when free
  prevCol: number | null;
  prevRow: number | null;
}

export interface Bomb extends Mover {
  id: number;
  col: number;
  row: number;
  dropTick: number;
  river: boolean;
  stagger: number | null;
  prevCol: number | null;
  prevRow: number | null;
}

export interface Shell extends Mover {
  col: number;
  row: number;
  prevRow: number;
}

export interface Boat {
  col: number;
  row: number;
  drownLeft: number;
  drownTotal: number;
  hooked: boolean;
  tutorial: boolean;
  spawnTick: number;
}

export interface Mine {
  col: number;
  lifeLeft: number;
  spawnTick: number;
}

export interface Player {
  mode: 'tank' | 'jump' | 'chopperFree' | 'chopperHooked';
  col: number;
  row: number;
  invulnLeft: number;
  lockLeft: number;
  airLeft: number;
  cooldownLeft: number;
  respawnDue: boolean;
  wreck: null | 'jet' | 'bomb' | 'mine';
  lastHitTick: number | null;
  chopperLastMove: number | null;
  pendingMove: Dir;
}

/** Left/Right press-and-hold state (§7). */
interface Horizontal {
  dir: Dir;
  pressTick: number;
  tie: boolean;
  resetPending: boolean; // held keys act as a new press on the next allowed tick
  prevHeldL: boolean;
  prevHeldR: boolean;
}

export interface Level1 {
  active: boolean;
  scriptSpawner: Mover;
  crossSpawned: boolean;
  crossGoneTick: number | null;
  diveState: 'waiting' | 'pending' | 'active' | 'gone';
  boatConditionTick: number | null; // T_c
  boatDueTick: number | null;
  boatEverSpawned: boolean;
  moved: boolean;
  fired: boolean;
}

export type GameEvent =
  | 'fire' | 'jetKill' | 'tankHit' | 'bombDrop' | 'chopperOn' | 'chopperOff' | 'hook' | 'drop'
  | 'rescue' | 'drown' | 'sink' | 'boatSpawn' | 'mineSpawn' | 'mineClear' | 'mineExpire'
  | 'jump' | 'land' | 'levelClear' | 'gameOver' | 'move' | 'fuelOut';

/** Cosmetic effects. Never read by game logic (§3: impact art occupies no cell). */
export interface Fx {
  kind: 'shellHit' | 'jetHitTank' | 'bombHitTank' | 'drawbridge' | 'mineShrink' | 'splash';
  col: number;
  row: number;
  tick: number;
}

export interface GameOptions {
  seed: number;
  /** Start with the level-1 script (default true). False starts straight in normal play. */
  level1?: boolean;
  /** Tests: disable the normal jet spawner. */
  noSpawns?: boolean;
  score?: number;
}

export interface Game extends RngHolder {
  seed: number;
  tick: number; // index of the next tick to run
  score: number;
  lives: number;
  drowned: number;
  boatsUnlocked: boolean;
  minesUnlocked: boolean;
  firstJetDone: boolean;
  crisis: Crisis;
  schedElapsed: number;
  schedRestartTick: number;
  schedDue: boolean;
  pendingBoat: boolean;
  forceMineNext: boolean;
  lastPick: 'Boat' | 'Mine' | null;
  spawner: Mover & { enabled: boolean };
  jets: Jet[];
  bombs: Bomb[];
  shell: Shell | null;
  boat: Boat | null;
  mine: Mine | null;
  flightBudget: number | null;
  rescueClearUsed: boolean;
  frozenBand: Band | null;
  player: Player;
  hz: Horizontal;
  level1: Level1;
  messages: Messages;
  events: GameEvent[];
  fx: Fx[];
  gameOver: GameOverReason | null;
  nextId: number;
  // Positions for the §4 swap tests: tank at tick start and after step 2.
  tankStart: { col: number; row: number };
  tankAfter2: { col: number; row: number };
}

// ---------------------------------------------------------------------------------------------
// Construction

export function createGame(opts: GameOptions): Game {
  const level1On = opts.level1 ?? true;
  const g: Game = {
    seed: opts.seed,
    rngState: opts.seed | 0,
    tick: 0,
    score: 0,
    lives: Tunables.startLives,
    drowned: 0,
    boatsUnlocked: false,
    minesUnlocked: false,
    firstJetDone: false,
    crisis: 'None',
    schedElapsed: 0,
    schedRestartTick: -1,
    schedDue: false,
    pendingBoat: false,
    forceMineNext: false,
    lastPick: null,
    spawner: { acc: 0, lastInterval: DifficultyTable.A.jetSpawnMs, bornTick: 0, enabled: !level1On && !opts.noSpawns },
    jets: [],
    bombs: [],
    shell: null,
    boat: null,
    mine: null,
    flightBudget: null,
    rescueClearUsed: false,
    frozenBand: null,
    player: {
      mode: 'tank', col: CENTRE_COL, row: LANE_ROW, invulnLeft: 0, lockLeft: 0, airLeft: 0,
      cooldownLeft: 0, respawnDue: false, wreck: null, lastHitTick: null, chopperLastMove: null, pendingMove: 0,
    },
    hz: { dir: 0, pressTick: 0, tie: false, resetPending: false, prevHeldL: false, prevHeldR: false },
    level1: {
      active: level1On,
      scriptSpawner: { acc: 0, lastInterval: DifficultyTable.A.jetSpawnMs, bornTick: 0 },
      crossSpawned: false,
      crossGoneTick: null,
      diveState: 'waiting',
      boatConditionTick: null,
      boatDueTick: null,
      boatEverSpawned: false,
      moved: false,
      fired: false,
    },
    messages: createMessages(),
    events: [],
    fx: [],
    gameOver: null,
    nextId: 1,
    tankStart: { col: CENTRE_COL, row: LANE_ROW },
    tankAfter2: { col: CENTRE_COL, row: LANE_ROW },
  };
  if (opts.score) setScore(g, opts.score);
  g.spawner.lastInterval = DifficultyTable[activeBand(g)].jetSpawnMs;
  return g;
}

// ---------------------------------------------------------------------------------------------
// Derived state

export const isChopper = (g: Game) => g.player.mode === 'chopperFree' || g.player.mode === 'chopperHooked';

export function playerMode(g: Game): PlayerMode {
  const p = g.player;
  if (p.mode === 'chopperFree') return 'ChopperFree';
  if (p.mode === 'chopperHooked') return 'ChopperHooked';
  if (p.invulnLeft > 0) return 'TankInvuln';
  if (p.mode === 'jump') return 'TankJump';
  return 'Tank';
}

/** §8: SkyPolicy active iff PlayerMode ∈ Chopper* ∧ Crisis == Boat. */
export const skyPolicy = (g: Game) => isChopper(g) && g.crisis === 'Boat';

/** §3: soft ceiling 3 cells above the lane (row 6) while mines are locked, 2 cells (row 7) after. */
export const ceilingRow = (g: Game) => (g.minesUnlocked ? LANE_ROW - 2 : LANE_ROW - 3);

/** §6: live from score in Tank modes, frozen while in the chopper. */
export const activeBand = (g: Game): Band => g.frozenBand ?? bandForScore(g.score);

export const lastTick = (g: Game) => g.tick - 1;

/** L1 last-life net: on while lives = 1 before the rescue. */
export const lastLifeNetOn = (g: Game) => g.level1.active && g.lives === 1;

export function jetInterval(g: Game, j: Jet): number {
  const row = DifficultyTable[activeBand(g)];
  const sky = skyPolicy(g);
  if (j.path === 'dive') return sky ? row.rescueJetStepMs : row.jetStepMs;
  return sky ? row.rescueCrossStepMs : row.crossStepMs;
}

export function bombInterval(g: Game): number {
  const row = DifficultyTable[activeBand(g)];
  return skyPolicy(g) ? row.rescueBombStepMs : row.bombStepMs;
}

const spawnerInterval = (g: Game) => DifficultyTable[activeBand(g)].jetSpawnMs;

// ---------------------------------------------------------------------------------------------
// Movers (§9 step accumulators, held-back counters, speed change)

/** Rescale on an interval change: keep the fraction of progress, never owe a step. */
function rescale(m: Mover, newInterval: number): void {
  if (m.lastInterval === newInterval) return;
  m.acc = m.capped
    ? newInterval - 1 // a capped counter stays capped (§9 Held-back counters)
    : Math.min(Math.floor((m.acc * newInterval) / m.lastInterval), newInterval - 1);
  m.lastInterval = newInterval;
}

/** Re-read every mover's interval after a band or SkyPolicy change. Call at each change, in order. */
function syncIntervals(g: Game): void {
  for (const j of g.jets) rescale(j, jetInterval(g, j));
  const bi = bombInterval(g);
  for (const b of g.bombs) rescale(b, bi);
  rescale(g.spawner, spawnerInterval(g));
}

/** One tick of a mover in step 3. Returns true if it takes a step. */
function advance(m: Mover, interval: number, blocked: boolean, t: number): boolean {
  if (m.bornTick === t) return false; // gains nothing on the tick it appears
  if (blocked) {
    m.acc = Math.min(m.acc + S, interval - 1);
    m.capped = m.acc === interval - 1;
    return false;
  }
  // RG-003: "capped" used to be inferred from acc === interval − 1, but a mover that is never held
  // reaches that value naturally when gcd(60, interval) = 1 (band-C cross jet 283, spawner 943), and
  // it then lost its carry and fell a tick behind (invariant 31). Only a real block sets the flag,
  // so only a held-back counter gets the remainder-0 rule.
  const wasCapped = m.capped === true;
  m.capped = false;
  m.acc += S;
  if (m.acc >= interval) {
    m.acc = wasCapped ? 0 : m.acc - interval;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Score, crisis, mode helpers

function setScore(g: Game, value: number): void {
  g.score = Math.min(value, Tunables.scoreMax);
  if (!g.boatsUnlocked && g.score >= Tunables.boatUnlockScore && !g.level1.active) g.boatsUnlocked = true;
  if (!g.minesUnlocked && g.score >= Tunables.mineUnlockScore) {
    g.minesUnlocked = true;
    g.forceMineNext = true; // §6 crisis scheduler: first pick after the unlock is a mine
  }
}

function addScore(g: Game, points: number): void {
  setScore(g, g.score + points);
  syncIntervals(g); // a band change applies after this tick's steps (§9 speed change)
}

function restartScheduler(g: Game): void {
  g.schedElapsed = 0;
  g.schedRestartTick = g.tick;
  g.schedDue = false;
}

/** Crisis → None. Discards the flight budget; river bombs vanish (§4 Boats item 4). */
function endCrisis(g: Game): void {
  g.crisis = 'None';
  g.boat = null;
  g.mine = null;
  g.flightBudget = null;
  g.bombs = g.bombs.filter((b) => !b.river);
  restartScheduler(g);
}

/** §9 Return stampede: threats stacked at the ceiling resume on staggered slots by X. */
function onSkyLift(g: Game): void {
  const ceil = ceilingRow(g);
  const stacked: (Jet | Bomb)[] = [
    ...g.jets.filter((j) => j.path === 'dive' && j.row === ceil),
    ...g.bombs.filter((b) => !b.river && b.row === ceil),
  ];
  stacked.sort((a, b) => a.col - b.col || a.id - b.id);
  stacked.forEach((m, i) => (m.stagger = i % 3));
}

/** §9 SkyPolicy item 0: rescue-start clear once per crisis; later turn-ons remove river bombs only. */
function onSkyOn(g: Game): void {
  const ceil = ceilingRow(g);
  if (!g.rescueClearUsed) {
    g.jets = g.jets.filter((j) => j.row <= ceil);
    g.bombs = g.bombs.filter((b) => b.row <= ceil);
    g.rescueClearUsed = true;
  } else {
    g.bombs = g.bombs.filter((b) => !b.river);
  }
  for (const j of g.jets) j.stagger = null;
  for (const b of g.bombs) b.stagger = null;
}

function enterChopper(g: Game): void {
  const p = g.player;
  g.frozenBand = bandForScore(g.score);
  p.mode = 'chopperFree';
  p.row = CHOPPER_ROW;
  p.chopperLastMove = null;
  p.pendingMove = 0;
  g.hz.resetPending = true;
  onSkyOn(g);
  syncIntervals(g);
  g.events.push('chopperOn');
}

/** Back to Tank at the current column, lane row 9 (Up, rescue, budget out, drowning while flying). */
function returnToTank(g: Game, skyWasOn: boolean): void {
  const p = g.player;
  p.mode = 'tank';
  p.row = LANE_ROW;
  p.pendingMove = 0;
  g.hz.resetPending = true;
  g.frozenBand = null; // band recomputed from the current score (§6 item 3)
  if (skyWasOn) onSkyLift(g);
  syncIntervals(g);
  g.events.push('chopperOff');
}

function rescue(g: Game): void {
  const tutorial = g.boat?.tutorial ?? false;
  const skyWasOn = skyPolicy(g);
  g.fx.push({ kind: 'drawbridge', col: g.player.col, row: HOOKED_BOAT_ROW, tick: g.tick });
  addScore(g, 500);
  raise(g.messages, '+500 RESCUE', g.tick);
  endCrisis(g);
  returnToTank(g, skyWasOn);
  g.events.push('rescue');
  if (tutorial) clearLevel1(g);
}

/** L1 After LEVEL 1 CLEAR: script ends, the normal spawner starts at 0 on the rescue tick. */
function clearLevel1(g: Game): void {
  g.level1.active = false;
  raise(g.messages, 'LEVEL 1 CLEAR', g.tick);
  g.spawner.enabled = true;
  g.spawner.acc = 0;
  g.spawner.bornTick = g.tick;
  g.spawner.lastInterval = spawnerInterval(g);
  if (g.score >= Tunables.boatUnlockScore) g.boatsUnlocked = true;
  g.events.push('levelClear');
}

/** A boat lost to drowning, a bomb sink or (tutorial only) fuel-out. */
function loseBoat(g: Game, cause: 'drown' | 'sink' | 'fuelOut'): void {
  const tutorial = g.boat?.tutorial ?? false;
  const flying = isChopper(g);
  const skyWasOn = skyPolicy(g);
  if (cause === 'sink' && g.boat) g.fx.push({ kind: 'splash', col: g.boat.col, row: g.boat.row, tick: g.tick });
  endCrisis(g);
  if (flying) returnToTank(g, skyWasOn);
  if (tutorial) {
    // L1 SAFE BOAT: replay without counting, 960 ms later.
    raise(g.messages, 'BOAT LOST', g.tick);
    raise(g.messages, 'TRY AGAIN', g.tick);
    g.level1.boatDueTick = g.tick + Tunables.tutorialBeatMs / S;
  } else {
    g.drowned += 1;
    raise(g.messages, cause === 'sink' ? 'BOAT SUNK' : 'BOAT LOST', g.tick);
  }
  g.events.push(cause === 'sink' ? 'sink' : cause === 'fuelOut' ? 'fuelOut' : 'drown');
}

function removeJet(g: Game, j: Jet): void {
  g.jets = g.jets.filter((x) => x !== j);
  const l1 = g.level1;
  if (j.script === 'l1cross') {
    l1.crossGoneTick = g.tick;
    if (l1.diveState === 'waiting') l1.diveState = 'pending';
  } else if (j.script === 'l1dive') {
    l1.diveState = 'gone';
  }
}

// ---------------------------------------------------------------------------------------------
// Spawning

function spawnJet(g: Game, path: 'dive' | 'cross', col: number, dir: Dir, script: Jet['script'] = null): Jet {
  const j: Jet = {
    id: g.nextId++, path, col, row: 0, dir, opp: 0, bombsDropped: 0, guaranteedIndex: null, script,
    stagger: null, prevCol: null, prevRow: null, acc: 0, lastInterval: 0, bornTick: g.tick,
  };
  j.lastInterval = jetInterval(g, j);
  if (!g.firstJetDone) {
    // §4 Bombs: the run's first jet has one guaranteed drop on a uniformly chosen on-screen cell.
    g.firstJetDone = true;
    j.guaranteedIndex = randInt(g, path === 'dive' ? 9 : COLS);
  }
  g.jets.push(j);
  dropOpportunity(g, j); // the spawn cell is a drop opportunity
  return j;
}

function spawnRandomJet(g: Game): void {
  if (rngNext(g) < Tunables.jetCrossChance) {
    const fromLeft = rngNext(g) < 0.5;
    spawnJet(g, 'cross', fromLeft ? 0 : COLS - 1, fromLeft ? 1 : -1);
  } else {
    spawnJet(g, 'dive', randInt(g, COLS), 0);
  }
}

/** §4 Bombs: one opportunity per cell entered on rows 0–8 while on screen. */
function dropOpportunity(g: Game, j: Jet): void {
  if (j.row > JUMP_ROW) return;
  const idx = j.opp++;
  if (skyPolicy(g)) return; // skipped opportunities are lost
  const band = DifficultyTable[activeBand(g)];
  if (j.bombsDropped >= band.bombsPerJetMax) return;
  const drop = j.guaranteedIndex === idx ? true : rngNext(g) < band.bombDropChance;
  if (!drop) return;
  j.bombsDropped += 1;
  addBomb(g, j.col, j.row + 1);
  g.events.push('bombDrop');
}

export function addBomb(g: Game, col: number, row: number): Bomb {
  const b: Bomb = {
    id: g.nextId++, col, row, dropTick: g.tick, river: false, stagger: null, prevCol: null, prevRow: null,
    acc: 0, lastInterval: bombInterval(g), bornTick: g.tick,
  };
  g.bombs.push(b);
  return b;
}

/** Tests and tools: place a jet directly. */
export function addJet(g: Game, path: 'dive' | 'cross', col: number, row = 0, dir: Dir = 0): Jet {
  const j: Jet = {
    id: g.nextId++, path, col, row, dir, opp: row + 1, bombsDropped: 0, guaranteedIndex: null, script: null,
    stagger: null, prevCol: null, prevRow: null, acc: 0, lastInterval: 0, bornTick: g.tick - 1,
  };
  j.lastInterval = jetInterval(g, j);
  g.firstJetDone = true;
  g.jets.push(j);
  return j;
}

/** §4 Boats: bomb-free column = no falling bomb on rows 1–10. */
function columnBombFree(g: Game, col: number): boolean {
  return !g.bombs.some((b) => b.col === col && b.row >= 1 && b.row <= GROUND_ROW);
}

export function startBoatCrisis(g: Game, col: number, row: number, tutorial: boolean): void {
  const band = activeBand(g);
  const drown = DifficultyTable[band].drownTimerMs;
  g.crisis = 'Boat';
  g.mine = null; // Crisis XOR
  g.boat = { col, row, drownLeft: drown, drownTotal: drown, hooked: false, tutorial, spawnTick: g.tick };
  g.flightBudget = Tunables.flightBudgetMs;
  g.rescueClearUsed = false;
  g.events.push('boatSpawn');
}

function trySpawnBoat(g: Game): boolean {
  const cols: number[] = [];
  for (let c = 2; c <= 15; c++) if (columnBombFree(g, c)) cols.push(c);
  if (cols.length === 0) return false;
  const col = cols[randInt(g, cols.length)];
  const row = randInt(g, 2) === 0 ? 12 : 13;
  startBoatCrisis(g, col, row, false);
  return true;
}

function spawnMine(g: Game): void {
  const tankCol = g.player.col;
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) if (Math.abs(c - tankCol) >= Tunables.mineMinGapCols) cols.push(c);
  g.crisis = 'Mine';
  g.mine = { col: cols[randInt(g, cols.length)], lifeLeft: Tunables.mineLifetimeMs, spawnTick: g.tick };
  g.events.push('mineSpawn');
}

// ---------------------------------------------------------------------------------------------
// The tick

/** Mark that the game resumed from a pause: held Left/Right act as a new press on the first tick. */
export function markResumed(g: Game): void {
  g.hz.resetPending = true;
}

export function tick(g: Game, input: TickInput): void {
  if (g.gameOver) return;
  g.events = [];
  const t = g.tick;
  g.tankStart = { col: g.player.col, row: g.player.row };

  step1Input(g, input);
  step2Timers(g);
  g.tankAfter2 = { col: g.player.col, row: g.player.row };
  step3Threats(g);
  step4Respawn(g);
  step5Hits(g);
  step6Spawns(g);

  trimMessages(g.messages, t, pinnedLines(g).length);
  g.fx = g.fx.filter((f) => t - f.tick < 20);
  if (g.lives <= 0) g.gameOver = 'Lives';
  else if (g.drowned >= Tunables.drownedLimit) g.gameOver = 'DrownedBoats';
  if (g.gameOver) g.events.push('gameOver');
  g.tick = t + 1;
}

// ---- Step 1: input and player movement ------------------------------------------------------

/** Resolves this tick's Left/Right into a new press (with direction) or a hold repeat (§7). */
function resolveHorizontal(g: Game, inp: TickInput): { press: Dir; repeatDir: Dir } {
  const hz = g.hz;
  const t = g.tick;
  const heldL = inp.held.left;
  const heldR = inp.held.right;
  let pL = inp.press.left;
  let pR = inp.press.right;
  if (hz.resetPending) {
    // Held through the lock or a mode change: a held key acts as a new press now.
    pL = pL || heldL;
    pR = pR || heldR;
    hz.resetPending = false;
    hz.dir = 0;
    hz.tie = false;
  }
  if (hz.prevHeldL && hz.prevHeldR) {
    // Release with the other key held: the still-held key acts as a new press.
    if (!heldL && heldR) pR = true;
    if (!heldR && heldL) pL = true;
  }
  hz.prevHeldL = heldL;
  hz.prevHeldR = heldR;

  let press: Dir = 0;
  if (pL && pR) {
    const hl = heldL;
    const hr = heldR;
    if (hl && hr) {
      hz.tie = true;
      hz.dir = 0;
    } else if (hl || hr) {
      press = hl ? -1 : 1;
      hz.dir = press;
      hz.pressTick = t;
      hz.tie = false;
    } else {
      hz.dir = 0; // two opposite taps: no move
      hz.tie = false;
    }
    return { press, repeatDir: 0 };
  }
  if (pL || pR) {
    press = pL ? -1 : 1;
    const held = pL ? heldL : heldR;
    const otherHeld = pL ? heldR : heldL;
    hz.tie = false;
    if (held) {
      hz.dir = press;
      hz.pressTick = t;
    } else if (otherHeld) {
      hz.dir = (-press) as Dir; // a tap over a held key: the held key carries on from here
      hz.pressTick = t;
    } else {
      hz.dir = 0;
    }
    return { press, repeatDir: 0 };
  }
  if (hz.tie) {
    if (!(heldL && heldR)) hz.tie = false;
    return { press: 0, repeatDir: 0 };
  }
  if (hz.dir !== 0 && !(hz.dir < 0 ? heldL : heldR)) hz.dir = 0;
  return { press: 0, repeatDir: hz.dir };
}

function moveTankHorizontally(g: Game, inp: TickInput): void {
  const p = g.player;
  const { press, repeatDir } = resolveHorizontal(g, inp);
  let d: Dir = press;
  if (d === 0 && repeatDir !== 0) {
    const since = g.tick - g.hz.pressTick;
    if (since > 0 && since % (Tunables.tankMoveMs / S) === 0) d = repeatDir;
  }
  if (d === 0) return;
  const nc = p.col + d;
  if (nc < 0 || nc >= COLS) return; // walls clip
  p.col = nc;
  g.level1.moved = true;
  g.events.push('move');
}

/** Chopper: at most one column per rate (4 ticks free, 8 hooked), one pending move (§7 Chopper cap). */
function moveChopper(g: Game, inp: TickInput): void {
  const p = g.player;
  const { press, repeatDir } = resolveHorizontal(g, inp);
  if (g.hz.tie) return;
  const rate = (p.mode === 'chopperHooked' ? Tunables.chopperHookedMoveMs : Tunables.chopperFreeMoveMs) / S;
  const canMove = p.chopperLastMove === null || g.tick - p.chopperLastMove >= rate;
  let d: Dir = 0;
  if (press !== 0) {
    if (canMove) d = press;
    else p.pendingMove = press;
  } else if (p.pendingMove !== 0 && canMove) {
    d = p.pendingMove;
  } else if (repeatDir !== 0 && canMove) {
    d = repeatDir;
  }
  if (d === 0) return;
  p.pendingMove = 0;
  const nc = p.col + d;
  if (nc < 0 || nc >= COLS) return;
  p.col = nc;
  p.chopperLastMove = g.tick;
  if (p.mode === 'chopperHooked' && g.boat) {
    g.boat.col = nc;
    if (nc === LEFT_BANK || nc === RIGHT_BANK) rescue(g);
  }
}

function step1Input(g: Game, inp: TickInput): void {
  const p = g.player;
  if (p.lockLeft > 0) {
    // Impact lock: inputs ignored, not buffered. Held Left/Right act as a new press at T_r + 1.
    g.hz.dir = 0;
    g.hz.tie = false;
    g.hz.resetPending = true;
    g.hz.prevHeldL = inp.held.left;
    g.hz.prevHeldR = inp.held.right;
    return;
  }
  const startMode = p.mode;

  if (startMode === 'chopperFree' || startMode === 'chopperHooked') {
    // Chopper order: Left/Right, then Down (hook, at the new column), then Up.
    moveChopper(g, inp);
    if (!isChopper(g)) return; // rescued by the move: this tick's Down and Up do nothing
    let downTookEffect = false;
    if (inp.press.down && startMode === 'chopperFree' && g.boat && g.crisis === 'Boat' && g.boat.col === p.col) {
      p.mode = 'chopperHooked';
      g.boat.hooked = true;
      g.boat.row = HOOKED_BOAT_ROW;
      downTookEffect = true;
      g.events.push('hook');
    }
    if (inp.press.up && !downTookEffect) {
      if (p.mode === 'chopperFree') {
        returnToTank(g, skyPolicy(g));
      } else if (p.mode === 'chopperHooked' && g.boat) {
        p.mode = 'chopperFree';
        g.boat.hooked = false;
        g.boat.row = HOOKED_BOAT_ROW;
        g.boat.col = p.col;
        g.events.push('drop');
      }
    }
    return;
  }

  // Tank order: Left/Right, then Up (Jump), then Fire, then Down.
  moveTankHorizontally(g, inp);
  if (inp.press.up && p.mode === 'tank' && p.row === LANE_ROW && p.invulnLeft <= 0 && p.cooldownLeft <= 0
      && g.minesUnlocked && g.crisis !== 'Boat') {
    p.mode = 'jump';
    p.row = JUMP_ROW;
    p.airLeft = Tunables.jumpAirtimeMs;
    g.events.push('jump');
  }
  if (inp.press.fire && !g.shell) {
    g.shell = { col: p.col, row: p.row, prevRow: p.row, acc: 0, lastInterval: S, bornTick: g.tick };
    g.level1.fired = true;
    g.events.push('fire');
  }
  if (inp.press.down && p.mode !== 'jump' && g.crisis === 'Boat' && (g.flightBudget ?? 0) > 0) {
    enterChopper(g);
  }
}

// ---- Step 2: timers --------------------------------------------------------------------------

function step2Timers(g: Game): void {
  const p = g.player;
  // Pause rule: a timer ticks only if it is running at the end of step 1.
  const budgetRunning = isChopper(g) && g.flightBudget !== null;
  const drownRunning = g.boat !== null && !g.boat.hooked;
  const mineRunning = g.mine !== null;
  const airRunning = p.mode === 'jump';
  const cooldownRunning = p.cooldownLeft > 0;
  const invulnRunning = p.invulnLeft > 0;
  const lockRunning = p.lockLeft > 0;
  const schedRunning = !g.level1.active && g.crisis === 'None' && !g.pendingBoat && g.schedRestartTick !== g.tick;

  if (budgetRunning && g.flightBudget !== null) {
    g.flightBudget -= S;
    if (g.flightBudget <= 0) {
      g.flightBudget = 0;
      if (g.boat?.tutorial) {
        loseBoat(g, 'fuelOut'); // L1 Fuel out: ends the attempt at once
      } else {
        const skyWasOn = skyPolicy(g);
        if (p.mode === 'chopperHooked' && g.boat) {
          g.boat.hooked = false; // dropped in place; its timer resumes next tick
          g.boat.row = HOOKED_BOAT_ROW;
          g.boat.col = p.col;
        }
        returnToTank(g, skyWasOn);
        g.events.push('fuelOut');
      }
    }
  }
  if (drownRunning && g.boat) {
    g.boat.drownLeft -= S;
    if (g.boat.drownLeft <= 0) loseBoat(g, 'drown');
  }
  if (mineRunning && g.mine) {
    g.mine.lifeLeft -= S;
    if (g.mine.lifeLeft <= 0) {
      g.fx.push({ kind: 'mineShrink', col: g.mine.col, row: GROUND_ROW, tick: g.tick });
      endCrisis(g);
      g.events.push('mineExpire');
    }
  }
  if (airRunning && p.mode === 'jump') {
    p.airLeft -= S;
    if (p.airLeft <= 0) {
      p.mode = 'tank';
      p.row = LANE_ROW;
      p.cooldownLeft = Tunables.jumpCooldownMs;
      g.events.push('land');
    }
  }
  if (cooldownRunning) p.cooldownLeft -= S;
  if (invulnRunning) p.invulnLeft = Math.max(0, p.invulnLeft - S);
  if (lockRunning) {
    p.lockLeft -= S;
    if (p.lockLeft <= 0) {
      p.lockLeft = 0;
      p.respawnDue = true;
    }
  }
  if (schedRunning) {
    g.schedElapsed += S;
    if (g.schedElapsed >= DifficultyTable[activeBand(g)].crisisIntervalMs) g.schedDue = true;
  }
}

// ---- Step 3: threat and shell steps ----------------------------------------------------------

function step3Threats(g: Game): void {
  const t = g.tick;
  const sky = skyPolicy(g);
  const ceil = ceilingRow(g);
  const blockedBy = (row: number, stagger: number | null) =>
    (sky && row === ceil) || (stagger !== null && t % 3 !== stagger);

  for (const j of g.jets) {
    j.prevCol = j.col;
    j.prevRow = j.row;
  }
  for (const b of g.bombs) {
    b.prevCol = b.col;
    b.prevRow = b.row;
  }

  // Shell: one row up per 60 ms, never held.
  if (g.shell) {
    const s = g.shell;
    s.prevRow = s.row;
    if (advance(s, S, false, t)) {
      s.row -= 1;
      if (s.row < 0) g.shell = null;
    }
  }

  // Jets
  for (const j of [...g.jets]) {
    const interval = jetInterval(g, j);
    const blocked = j.path === 'dive' && blockedBy(j.row, j.stagger);
    if (!advance(j, interval, blocked, t)) continue;
    j.stagger = null;
    if (j.path === 'dive') {
      j.row += 1;
      if (j.row >= GROUND_ROW) {
        removeJet(g, j); // ground crash: no score
        continue;
      }
    } else {
      j.col += j.dir;
      if (j.col < 0 || j.col >= COLS) {
        removeJet(g, j); // wall exit: no score
        continue;
      }
    }
    dropOpportunity(g, j);
  }

  // Bombs
  const bi = bombInterval(g);
  for (const b of [...g.bombs]) {
    if (!advance(b, bi, !b.river && blockedBy(b.row, b.stagger), t)) continue;
    b.stagger = null;
    b.row += 1;
    if (b.river) {
      if (b.row > LAST_ROW) g.bombs = g.bombs.filter((x) => x !== b);
    } else if (b.row >= GROUND_ROW) {
      const boat = g.boat;
      const intoRiver = g.crisis === 'Boat' && boat !== null && !boat.hooked && b.col === boat.col
        && !isChopper(g) && b.dropTick > boat.spawnTick;
      if (intoRiver) b.river = true;
      else g.bombs = g.bombs.filter((x) => x !== b);
    }
  }

  // Jet spawns
  if (g.spawner.enabled && !g.level1.active) {
    if (advance(g.spawner, spawnerInterval(g), sky, t)) spawnRandomJet(g);
  }
  if (g.level1.active) level1Spawns(g);
}

/** L1 Script: the scripted cross jet (tick 23) and the dive jet down the tank's column. */
function level1Spawns(g: Game): void {
  const l1 = g.level1;
  const t = g.tick;
  if (!l1.crossSpawned) {
    if (advance(l1.scriptSpawner, DifficultyTable.A.jetSpawnMs, false, t)) {
      const fromLeft = rngNext(g) < 0.5;
      spawnJet(g, 'cross', fromLeft ? 0 : COLS - 1, fromLeft ? 1 : -1, 'l1cross');
      l1.crossSpawned = true;
    }
  }
  if (l1.diveState === 'pending' && l1.crossGoneTick !== null && t >= l1.crossGoneTick + 1) {
    const h = g.player.lastHitTick;
    const inLock = h !== null && t <= h + Tunables.impactLockMs / S;
    if (g.lives > 0 && !inLock) {
      spawnJet(g, 'dive', g.player.col, 0, 'l1dive');
      l1.diveState = 'active';
    }
  }
}

// ---- Step 4: respawn -------------------------------------------------------------------------

function step4Respawn(g: Game): void {
  const p = g.player;
  if (!p.respawnDue) return;
  p.respawnDue = false;
  p.col = respawnColumn(g);
  p.row = LANE_ROW;
  p.mode = 'tank';
  p.wreck = null;
}

// ---- Step 5: collisions and hits -------------------------------------------------------------

const sameCell = (a: { col: number; row: number }, c: number, r: number) => a.col === c && a.row === r;

function step5Hits(g: Game): void {
  const p = g.player;

  // (i) shell vs jet: same cell after step 3, or swapped cells in step 3. Earliest-spawned jet wins.
  if (g.shell) {
    const s = g.shell;
    const hit = g.jets
      .filter((j) => sameCell(j, s.col, s.row)
        || (j.prevRow !== null && j.prevCol === s.col && j.prevRow === s.row && j.col === s.col && j.row === s.prevRow))
      .sort((a, b) => a.id - b.id)[0];
    if (hit) {
      g.shell = null;
      g.fx.push({ kind: 'shellHit', col: hit.col, row: hit.row, tick: g.tick });
      removeJet(g, hit);
      addScore(g, 100);
      raise(g.messages, '+100', g.tick);
      g.events.push('jetKill');
    }
  }

  // (ii) tank hits: one per tick, priority mine, then bomb, then jet.
  if (!isChopper(g) && p.invulnLeft <= 0) {
    const swapped = (m: { col: number; row: number; prevCol: number | null; prevRow: number | null }) =>
      m.prevRow !== null && m.prevCol === g.tankAfter2.col && m.prevRow === g.tankAfter2.row
      && m.col === g.tankStart.col && m.row === g.tankStart.row;
    const touches = (m: Jet | Bomb) => sameCell(m, p.col, p.row) || swapped(m);
    const mineHit = g.mine !== null && p.row === LANE_ROW && g.mine.col === p.col;
    const bomb = g.bombs.filter((b) => !b.river && touches(b)).sort((a, b) => a.id - b.id)[0];
    const jet = g.jets.filter((j) => j.path === 'dive' && touches(j)).sort((a, b) => a.id - b.id)[0];
    if (mineHit) {
      endCrisis(g);
      tankHit(g, 'mine');
    } else if (bomb) {
      g.bombs = g.bombs.filter((b) => b !== bomb);
      tankHit(g, 'bomb');
    } else if (jet) {
      removeJet(g, jet);
      tankHit(g, 'jet');
    }
  }

  // (iii) jump clear
  if (p.mode === 'jump' && g.mine && g.mine.col === p.col) {
    endCrisis(g);
    addScore(g, 200);
    raise(g.messages, '+200', g.tick);
    g.events.push('mineClear');
  }

  // (iv) bomb sink
  if (g.boat && !g.boat.hooked) {
    const boat = g.boat;
    const sinker = g.bombs.find((b) => b.river && b.col === boat.col && b.row === boat.row);
    if (sinker) {
      g.bombs = g.bombs.filter((b) => b !== sinker);
      loseBoat(g, 'sink');
    }
  }
}

function tankHit(g: Game, kind: 'mine' | 'bomb' | 'jet'): void {
  const p = g.player;
  const absorbed = lastLifeNetOn(g);
  if (!absorbed) g.lives -= 1;
  if (p.mode === 'jump') {
    p.mode = 'tank'; // the hit ends the jump: no landing, no cooldown; the wreck stays on row 8
    p.airLeft = 0;
  }
  p.invulnLeft = Tunables.invulnMs;
  p.lockLeft = Tunables.impactLockMs;
  p.wreck = kind;
  p.lastHitTick = g.tick;
  g.hz.resetPending = true;
  g.fx.push({ kind: kind === 'bomb' ? 'bombHitTank' : 'jetHitTank', col: p.col, row: p.row, tick: g.tick });
  raise(g.messages, absorbed ? 'LAST LIFE SAFE' : 'LIFE LOST', g.tick);
  g.events.push('tankHit');
}

// ---- Step 6: crisis spawns -------------------------------------------------------------------

function step6Spawns(g: Game): void {
  const l1 = g.level1;
  if (l1.active) {
    const jetsGone = l1.crossGoneTick !== null && l1.diveState === 'gone';
    if (l1.boatConditionTick === null && jetsGone && columnBombFree(g, Tunables.tutorialBoatCol)) {
      l1.boatConditionTick = g.tick;
      l1.boatDueTick = g.tick + Tunables.tutorialBeatMs / S;
    }
    if (l1.boatDueTick === g.tick && g.crisis === 'None') {
      startBoatCrisis(g, Tunables.tutorialBoatCol, Tunables.tutorialBoatRow, true);
      l1.boatEverSpawned = true;
      l1.boatDueTick = null;
    }
    return;
  }

  if (g.pendingBoat) {
    if (trySpawnBoat(g)) {
      g.pendingBoat = false;
      g.schedElapsed = 0;
    }
    return;
  }
  if (!g.schedDue || g.crisis !== 'None') return;
  g.schedDue = false;
  g.schedElapsed = 0;
  let pick: 'Boat' | 'Mine' | null = null;
  if (g.boatsUnlocked && g.minesUnlocked) {
    pick = g.forceMineNext ? 'Mine' : g.lastPick === 'Mine' ? 'Boat' : 'Mine';
  } else if (g.boatsUnlocked) {
    pick = 'Boat';
  } else if (g.minesUnlocked) {
    pick = 'Mine';
  }
  if (pick === null) return;
  if (pick === 'Mine') g.forceMineNext = false;
  g.lastPick = pick;
  if (pick === 'Mine') spawnMine(g);
  else if (!trySpawnBoat(g)) g.pendingBoat = true;
}

// ---------------------------------------------------------------------------------------------
// Panels (read-only views; never change game state)

/** Side-panel pinned lines: crisis label, then the tutorial step prompt (§3, L1 Side message panel). */
export function pinnedLines(g: Game): string[] {
  const l1 = g.level1;
  const lines: string[] = [];
  if (!l1.active) return lines;
  const boat = g.boat;
  if (boat?.tutorial) lines.push('TUTORIAL BOAT');
  if (!l1.boatEverSpawned) {
    if (!l1.fired) lines.push(l1.moved ? 'SPACE: FIRE' : 'MOVE ◀ ▶');
  } else if (boat?.tutorial) {
    const p = g.player;
    if (p.mode === 'chopperHooked') lines.push('FLY TO A BANK');
    else if (p.mode === 'chopperFree') lines.push(p.col === boat.col ? 'PRESS DOWN: HOOK' : 'FLY TO THE BOAT');
    else lines.push('PRESS DOWN: CHOPPER');
  }
  return lines;
}

/** Top panel TUTORIAL field: two fixed slots (L1 Top status panel). */
export function tutorialSlots(g: Game): [string, string] {
  const l1 = g.level1;
  return [
    l1.active && l1.boatEverSpawned ? 'SAFE BOAT' : '',
    lastLifeNetOn(g) ? 'LAST LIFE SAFE' : '',
  ];
}

/** FUEL meter: 8 segments of 1,240 ms, rounded up; null when blank (§3 Top status panel). */
export function fuelSegments(g: Game): number | null {
  if (g.crisis !== 'Boat' || g.flightBudget === null) return null;
  return Math.max(0, Math.ceil(g.flightBudget / (Tunables.flightBudgetMs / 8)));
}
