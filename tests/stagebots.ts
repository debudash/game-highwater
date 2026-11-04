// A bot solution for every stage room, written as a short script of steps (drive here, fire, fold
// into the chopper, fly there, hook, set down...). Each step reads the sim the way a player reads
// the screen. tests/solutions.test.ts runs them all, and tests/ghosts.test.ts records their inputs
// into src/sim/ghosts.json for the ghost hint.
import { Chopper, Jet, PLAYER_W, Shell, TILE } from '../src/sim/config';
import { Game, isSolidTile, Item } from '../src/sim/game';
import { Button } from '../src/sim/input';
import type { Policy } from './bots';

interface Keys { held: Button[]; press: Button[] }
/** One step of a script: push keys for this tick and return false, or return true when done. */
type Step = (g: Game, k: Keys) => boolean;

/** Run steps in order; a finished step hands over to the next one in the same tick. */
export function script(...steps: Step[]): Policy {
  let i = 0;
  return (g) => {
    for (let guard = 0; guard < 8 && i < steps.length; guard++) {
      const k: Keys = { held: [], press: [] };
      if (!steps[i](g, k)) return k;
      i++;
      if (k.press.length || k.held.length) return k; // a step that acts as it finishes (fire, charge)
    }
    return { held: [] };
  };
}

const cx = (g: Game) => g.player.x + g.player.w / 2;
const col = (c: number) => c * TILE + TILE / 2;

/** A gap, a wall or a cactus just ahead along the ground, in direction dir. */
function obstacleAhead(g: Game, dir: 1 | -1, reach = 10): boolean {
  const p = g.player;
  const ahead = dir === 1 ? p.x + p.w + reach : p.x - reach;
  const c = Math.floor(ahead / TILE);
  const feet = Math.floor((p.y + p.h - 1) / TILE);
  const floor = isSolidTile(g.room, c, feet + 1);
  const wall = isSolidTile(g.room, c, feet);
  const cactus = g.room.cacti.some((k) => k.grown && k.col === c && (k.row === feet || k.row === feet + 1));
  return !floor || wall || cactus;
}

/** Tank: drive one way, jumping whatever is ahead, holding the jump to the top of the arc. */
function driveKeys(g: Game, k: Keys, dir: 1 | -1): void {
  const p = g.player;
  k.held.push(dir === 1 ? 'right' : 'left');
  if ((p.onGround && obstacleAhead(g, dir)) || (!p.onGround && p.vy < 0 && p.jumping)) k.held.push('jump');
}

// ---------------------------------------------------------------- steps

/** Drive (tank) to x, jumping obstacles; done when stopped there on the ground. */
export const driveTo = (x: number, tol = 3): Step => (g, k) => {
  const p = g.player;
  const d = x - cx(g);
  if (Math.abs(d) <= tol && p.onGround && Math.abs(p.vx) < 20) return true;
  if (Math.abs(d) > tol) {
    // Ease off near the mark so the tank stops on it.
    const brake = (p.vx * p.vx) / (2 * 1300);
    if (Math.abs(d) > brake + tol || Math.sign(p.vx) !== Math.sign(d)) driveKeys(g, k, d > 0 ? 1 : -1);
  }
  return false;
};

/** Drive right (tank) until something is true, jumping obstacles. */
export const driveRightUntil = (done: (g: Game) => boolean): Step => (g, k) => {
  if (done(g)) return true;
  driveKeys(g, k, 1);
  return false;
};

/** Drive left a little (tank). */
export const backOff = (px: number): Step => {
  let from: number | null = null;
  return (g, k) => {
    from ??= cx(g);
    if (cx(g) <= from - px) return true;
    driveKeys(g, k, -1);
    return false;
  };
};

/** Hold one direction with no jumping (to drop into a hole) until something is true. */
export const rollUntil = (dir: 1 | -1, done: (g: Game) => boolean): Step => (g, k) => {
  if (done(g)) return true;
  k.held.push(dir === 1 ? 'right' : 'left');
  return false;
};

/** Fire one shell (tank), when none is in the air. */
export const fire = (): Step => (g, k) => {
  if (g.shell) return false;
  k.press.push('action');
  return true;
};

export const waitFor = (pred: (g: Game) => boolean): Step => (g) => pred(g);
export const wait = (ticks: number): Step => {
  let n = 0;
  return () => ++n > ticks;
};

/** Fold into the other body (switch), and wait for the fold to finish. */
export const become = (body: 'tank' | 'chopper'): Step => (g, k) => {
  const p = g.player;
  if (p.body === body) return p.foldTicks === 0;
  if (p.foldTicks === 0) k.press.push('switch');
  return false;
};

/** Chopper keys to head for (x, y): steer with braking, thrust to hold the height. */
function flyKeys(g: Game, k: Keys, x: number, y: number, tol: number): void {
  const p = g.player;
  const d = x - cx(g);
  const brake = (p.vx * p.vx) / (2 * Chopper.decel) + 1;
  if (d > tol && (d > brake || p.vx < 0)) k.held.push('right');
  else if (d < -tol && (-d > brake || p.vx > 0)) k.held.push('left');
  // Thrust when below the line or falling fast; ease off near it.
  if (p.y > y + 1 || (p.y > y - 8 && p.vy > 40)) k.held.push('jump');
}

/** Fly (chopper) to (x, y): done when close and nearly still. */
export const flyTo = (x: number, y: number, tol = 3): Step => (g, k) => {
  const p = g.player;
  if (Math.abs(x - cx(g)) <= tol && Math.abs(p.y - y) <= 6 && Math.abs(p.vx) < 25) return true;
  flyKeys(g, k, x, y, tol);
  return false;
};

/** Fly right at height y until something is true (or forever: out of the room). */
export const flyRightUntil = (y: number, done: (g: Game) => boolean = () => false): Step => (g, k) => {
  if (done(g)) return true;
  flyKeys(g, k, 99999, y, 3);
  return false;
};

/** Sink straight down (chopper, no thrust), holding x, until done. */
export const sinkUntil = (x: number, done: (g: Game) => boolean): Step => (g, k) => {
  if (done(g)) return true;
  const d = x - cx(g);
  if (d > 2) k.held.push('right');
  else if (d < -2) k.held.push('left');
  return false;
};

/** Drop a charge (chopper, not carrying). */
export const charge = (): Step => (g, k) => {
  if (g.charge) return false;
  k.press.push('action');
  return true;
};

const boatOf = (g: Game, which = 0): Item | undefined => g.room.items.filter((i) => i.kind === 'boat' && !i.hidden && !i.rescued)[which];

/** Fly low over the room's first boat still out there until the hook takes it. */
export const hookBoat = (): Step => (g, k) => {
  if (g.player.carrying) return true;
  const b = boatOf(g);
  if (!b) return true;
  flyKeys(g, k, b.x + b.w / 2, b.y - g.player.h - 18, 2);
  return false;
};

/**
 * Carry the load over to x, lower it until it is just above the surface at surfaceY, and set it
 * down. Done once it's released.
 */
export const deliver = (x: number, surfaceY: number, cruise: number): Step => {
  let stage = 0;
  return (g, k) => {
    const p = g.player;
    const it = p.carrying;
    if (!it) return true;
    if (stage === 0) {
      flyKeys(g, k, x, cruise, 3);
      if (Math.abs(x - cx(g)) < 4 && Math.abs(p.vx) < 15) stage = 1;
      return false;
    }
    // Lower it: hold x, sink until its bottom is a few px above the dock, then let go.
    const bottom = it.y + it.h;
    flyKeys(g, k, x, surfaceY - it.h - Chopper.hangGap - p.h - 3, 2);
    if (bottom >= surfaceY - 5 && Math.abs(p.vx) < 10) k.press.push('action');
    return false;
  };
};

// ---------------------------------------------------------------- the rooms

const never = () => false;

/** Tank under a target: line up under its column and fire until it's hit. */
const shootTarget = (c: number): Step[] => [
  driveTo(col(c), 2),
  (g, k) => {
    const t = g.room.targets.find((t) => t.col === c);
    if (!t || t.hit) return true;
    if (!g.shell) k.press.push('action');
    return false;
  },
];


export const STAGE_BOTS: Record<string, () => Policy> = {
  '1-1': () => script(driveRightUntil(never)),
  '1-2': () => script(driveRightUntil(never)),
  '1-3': () => script(...shootTarget(6), driveRightUntil(never)),
  '1-4': () => script((g, k) => {
    // Jump the first gap and fire as you pass under the target.
    const t = g.room.targets[0];
    if (!t.hit && !g.player.onGround && Math.abs(cx(g) - col(t.col)) < 6 && !g.shell) k.press.push('action');
    driveKeys(g, k, 1);
    return false;
  }),
  '2-1': () => script(shootAllJets(col(4)), skiesClear(), tankDodging(driveRightUntil(never))),
  '2-2': () => script(tankDodging(driveTo(col(4))), ...shootTarget(10).map(tankDodging), tankDodging(driveRightUntil(never))),
  '2-3': () => script(driveRightUntil(never)),
  '2-4': () => script(lureOntoCrack(10 * TILE), tankDodging(dropInto(10 * TILE, 7 * TILE)), driveRightUntil(never)),
  '3-1': () => script(become('chopper'), flyTo(col(8), 20), flyRightUntil(20)),
  '3-2': () => script(become('chopper'), flyRightUntil(60)),
  '3-3': () => script(become('tank'), shootAllJets(col(2)), skiesClear(), become('chopper'), hookBoat(), deliver(col(17) + 8, 7 * TILE, 50), ...refuelAt(col(17) + 8), hookBoat(), deliver(col(17) + 8, 7 * TILE, 50), flyRightUntil(86)),
  '3-4': () => script(become('chopper'), flyTo(col(5), 34), flyTo(col(9), 40), hookBoat(), deliver(col(17), 5 * TILE, 20), flyRightUntil(54)),
  '4-1': () => script(
    become('chopper'), flyTo(10 * TILE + 8, 20), charge(), waitFor((g) => !g.room.cacti[0].grown),
    flyTo(10 * TILE, 20, 2), sinkUntil(10 * TILE, (g) => g.player.onGround), flyRightUntil(116),
  ),
  '4-2': () => script(
    become('chopper'), flyTo(7 * TILE, 30, 6), charge(), waitFor((g) => g.room.tiles[4][6] === '.'),
    sinkUntil(7 * TILE, (g) => g.player.onGround), flyTo(14 * TILE, 86, 6), charge(),
    waitFor((g) => g.room.tiles[7][13] === '.'), sinkUntil(14 * TILE, (g) => g.player.onGround), flyRightUntil(132),
  ),
  '4-3': () => script(become('chopper'), blastMines(60), dodging(hookBoat()), dodging(deliver(col(17), 7 * TILE, 50)), ...refuelAt(col(17)), dodging(hookBoat()), dodging(deliver(col(17), 7 * TILE, 50)), dodging(flyRightUntil(86))),
  '4-4': () => script(become('chopper'), dodging(hookBoat()), dodging(deliver(col(17) + 4, 7 * TILE, 50)), dodging(flyRightUntil(82))),
  '5-1': () => script(become('chopper'), dodging(flyRightUntil(50))),
  '5-2': () => script(become('tank'), shootAllJets(col(2)), skiesClear(), become('chopper'), dodging(flyRightUntil(86))),
  '5-3': () => script(become('chopper'), flyTo(col(1), 30), dodging(blastMines(60)), dodging(hookBoat()), dodging(deliver(col(17), 7 * TILE, 50)), ...refuelAt(col(17)).map((st) => dodging(st)), dodging(hookBoat()), dodging(deliver(col(17), 7 * TILE, 50)), dodging(flyRightUntil(86))),
  '5-4': () => script(become('chopper'), dodging(hookBoat()), dodging(deliver(col(17) + 8, 7 * TILE, 50)), dodging(flyRightUntil(86))),
  'F-1': () => script(become('tank'), fightBay(col(9)), driveRightUntil(never)),
  'F-2': () => script(become('chopper'), dodging(fightHatch(col(9), 50)), dodging(flyRightUntil(86))),
  'F-3': () => script(
    become('chopper'), dodging(hookBoat()), dodging(deliver(col(2), 7 * TILE, 50)),
    // The run for the castle: no waiting for dives to finish, or the fuel runs out over the lake.
    sinkUntil(col(2), (g) => g.player.onGround), waitFor((g) => g.player.fuel >= Chopper.fuelTicks),
    dodging(flyTo(col(10), 80, 3)), dodging(landOn(col(10), 80)), waitFor((g) => g.player.fuel >= Chopper.fuelTicks),
    dodging(flyRightUntil(86)),
  ),
};

/**
 * F-1: hold a spot on the shore. Fire up into the Bomber as it comes over; when a bomb drops near,
 * drive away from it against the Bomber's heading (so it doesn't follow), then come back.
 */
function fightBay(home: number): Step {
  return (g, k) => {
    const b = g.room.bomber!;
    if (b.hp <= 0) return true;
    const x = cx(g);
    const bomb = g.room.bombs.find((bm) => Math.abs(bm.x + bm.w / 2 - x) < 34);
    if (bomb) {
      const dir: 1 | -1 = b.dir === 1 ? -1 : 1;
      k.held.push(dir === 1 ? 'right' : 'left');
      return false;
    }
    const ahead = (b.x + b.w / 2 - x) * -b.dir; // > 0 while it's still coming
    if (b.phase === 'fly' && b.hurt === 0 && !g.shell && ahead > -4 && ahead < 26) k.press.push('action');
    driveTo(home, 4)(g, k);
    return false;
  };
}

/**
 * F-2: hover over the lake and drop a charge so it lands on the Bomber's hatch as it passes; fly
 * back to the shore and land to refuel when the tank runs low.
 */
function fightHatch(spot: number, y: number): Step {
  let refuel = false;
  return (g, k) => {
    const b = g.room.bomber!;
    const p = g.player;
    if (b.hp <= 0) return true;
    if (refuel) {
      if (p.onGround && p.fuel >= Chopper.fuelTicks) refuel = false;
      else if (Math.abs(cx(g) - col(2)) > 4) flyKeys(g, k, col(2), y, 3);
      else if (!p.onGround) {
        const d = col(2) - cx(g);
        if (d > 2) k.held.push('right');
        else if (d < -2) k.held.push('left');
      }
      return false;
    }
    if (p.fuel < Chopper.fuelTicks * 0.5) { refuel = true; return false; }
    flyKeys(g, k, spot, y, 3);
    const lead = (b.x + b.w / 2 + b.dir * 10 - cx(g));
    if (b.phase === 'fly' && b.hurt === 0 && !g.charge && Math.abs(lead) < 8 && Math.abs(p.vx) < 30) k.press.push('action');
    return false;
  };
}

/** Tank: jump one way from where you stand, holding the jump, until you land again. */
const leap = (dir: 1 | -1): Step => {
  let up = false;
  return (g, k) => {
    const p = g.player;
    if (up && p.onGround) return true;
    k.held.push(dir === 1 ? 'right' : 'left');
    if (!up) { if (p.onGround) k.press.push('jump'); else up = true; }
    if (p.vy < 0) k.held.push('jump');
    return false;
  };
};

/** The optional route to each hidden boat (proves it can be reached). */
export const HIDDEN_BOTS: Record<string, () => Policy> = {
  '1-3': () => script(...shootTarget(6), driveTo(col(14)), leap(-1), driveTo(col(10))),
  // Wait on the block for a dive jet to lock on, then leap to the ledge as it dives.
  '2-3': () => script(driveTo(col(6) + 8), waitFor((g) => g.room.jets.some((j) => j.phase === 'warn' && Math.abs(j.aimX - cx(g)) < 10)), leap(-1), driveTo(col(2))),
  '3-4': () => script(become('chopper'), flyTo(col(4), 6), flyTo(col(1), 6), sinkUntil(col(1), (g) => g.room.hiddenHome > 0)),
  '4-4': () => script(become('chopper'), flyTo(col(10), 4), sinkUntil(col(10), (g) => g.room.hiddenHome > 0)),
  '5-4': () => script(become('chopper'), flyTo(col(11), 4), sinkUntil(col(11), (g) => g.room.hiddenHome > 0)),
};

/**
 * Wrap a chopper step so it sidesteps danger the way a player would: out of a warned dive column,
 * and out from under a falling bomb. Otherwise the step flies as usual.
 */
function dodging(step: Step, hold = true): Step {
  return (g, k) => {
    const p = g.player;
    const x = cx(g);
    const reach = (PLAYER_W + Jet.w) / 2 + 6;
    const dive = g.room.jets.find((j) => j.alive && (j.phase === 'warn' || j.phase === 'dive') && Math.abs(j.aimX - x) < reach);
    const bomb = g.room.bombs.find((b) => b.y < p.y && Math.abs(b.x + b.w / 2 - x) < 18);
    const threat = dive ? dive.aimX : bomb ? bomb.x + bomb.w / 2 : null;
    if (threat === null) {
      // Clear of a warned column but near it: hold here until the jet has dived and pulled out,
      // rather than going back into its path.
      const near = hold && g.room.jets.find((j) => j.alive && (j.phase === 'warn' || j.phase === 'dive') && Math.abs(j.aimX - x) < reach + 30);
      const done = step(g, k);
      if (near) {
        // Let the step steer everything except back towards the column.
        const towards = near.aimX > x ? 'right' : 'left';
        k.held = k.held.filter((b) => b !== towards);
        if (p.vx !== 0 && Math.sign(p.vx) === (towards === 'right' ? 1 : -1)) k.held.push(towards === 'right' ? 'left' : 'right');
        // ...and hover while waiting, so a step that's sinking to land doesn't sink into water.
        if (p.vy > 0 && !k.held.includes('jump')) k.held.push('jump');
      }
      return done;
    }
    const away = x < threat ? (x > 30 ? 'left' : 'right') : (x < 290 ? 'right' : 'left');
    k.held.push(away);
    if (p.vy > 20 || p.y > 60) k.held.push('jump');
    return false;
  };
}

/** A bomb falling near enough to the tank to hit it, if any (its centre x). */
function bombOver(g: Game, reach = 26): number | null {
  const x = cx(g);
  const b = g.room.bombs.find((bm) => bm.y < g.player.y && Math.abs(bm.x + bm.w / 2 - x) < reach);
  return b ? b.x + b.w / 2 : null;
}

/**
 * Wrap a tank step so it gets out from under a falling bomb the way a player would, driving away
 * from it (back the way it came if the way ahead is blocked). Otherwise the step drives as usual.
 */
function tankDodging(step: Step): Step {
  return (g, k) => {
    const b = bombOver(g);
    if (b === null) return step(g, k);
    let dir: 1 | -1 = cx(g) < b ? -1 : 1;
    if (obstacleAhead(g, dir, 4) && g.player.onGround) dir = dir === 1 ? -1 : 1;
    k.held.push(dir === 1 ? 'right' : 'left');
    return false;
  };
}

/**
 * 2-4: stand on the crack until a jet's bomb comes down, get clear, and try again until a bomb has
 * broken it open. Done when the crack is open and no bomb is falling.
 */
function lureOntoCrack(spot: number): Step {
  return (g, k) => {
    const open = g.room.tiles[6][9] === '.' || g.room.tiles[6][10] === '.';
    if (open && g.room.bombs.length === 0) return true;
    const b = bombOver(g, 40);
    if (b !== null) {
      k.held.push(cx(g) <= b ? 'left' : 'right');
      return false;
    }
    if (!open) driveTo(spot, 3)(g, k);
    return false;
  };
}

/** Tank: drive (without jumping) to x and drop into the hole there; done once below `y`. */
function dropInto(x: number, y: number): Step {
  return (g, k) => {
    if (g.player.y > y) return true;
    const d = x - cx(g);
    if (Math.abs(d) > 2) k.held.push(d > 0 ? 'right' : 'left');
    return false;
  };
}

/** Chopper: land at x. Off target it flies back over it at height y first; over it, it sinks. */
function landOn(x: number, y: number): Step {
  return (g, k) => {
    const p = g.player;
    if (p.onGround && Math.abs(cx(g) - x) <= 6) return true;
    if (Math.abs(cx(g) - x) > 4) flyKeys(g, k, x, Math.min(y, p.y), 2);
    else if (p.vx > 8) k.held.push('left');
    else if (p.vx < -8) k.held.push('right');
    return false;
  };
}

/** Chopper: blast every mine in the room with charges from height y, leading each one's drift. */
function blastMines(y: number): Step {
  return (g, k) => {
    const mines = g.room.mines.filter((m) => m.alive);
    if (!mines.length) return true;
    const m = mines.reduce((a, b) => (Math.abs(a.x - cx(g)) < Math.abs(b.x - cx(g)) ? a : b));
    const aim = m.x + m.w / 2 + m.vx * 0.4;
    flyKeys(g, k, aim, y, 3);
    if (!g.charge && Math.abs(aim - cx(g)) < 5 && Math.abs(g.player.y - y) < 10) k.press.push('action');
    return false;
  };
}

/** Chopper: land at x (on a dock or bank) and wait there until the tank is full. */
function refuelAt(x: number): Step[] {
  return [landOn(x, 70), waitFor((g) => g.player.fuel >= Chopper.fuelTicks)];
}


/**
 * Tank: hold a spot and shoot down every jet in the room. Cross jets are led (fire when the shell
 * will meet the jet over you); dive jets are met head-on as they dive down your column. Bombs and
 * missed dives are dodged. Done when no jet is left.
 */
function shootAllJets(home: number): Step {
  // Like a player, it learns from a miss: each shell that misses makes it lead the jets a bit more.
  let lead = 0;
  let flying = false;
  return (g, k) => {
    if (flying && !g.shell && !g.events.some((e) => e.type === 'jetDown')) lead = lead >= 40 ? 0 : lead + 5;
    flying = !!g.shell;
    const jets = g.room.jets.filter((j) => j.alive);
    if (!jets.length) return true;
    const p = g.player;
    const x = cx(g);
    const bomb = bombOver(g);
    if (bomb !== null) {
      k.held.push(x < bomb ? (x > 24 ? 'left' : 'right') : 'right');
      return false;
    }
    const dive = jets.find((d) => d.kind === 'dive' && (d.phase === 'warn' || d.phase === 'dive') && Math.abs(d.aimX - x) < 24);
    if (dive && dive.phase === 'dive') {
      if (!g.shell && dive.y < 40) k.press.push('action');
      else if (dive.y >= 40) k.held.push(x < 100 ? 'right' : 'left');
      return false;
    }
    if (!g.shell && p.onGround) {
      for (const j of jets) {
        if (j.kind !== 'cross' || j.phase !== 'fly' || j.x < 0 || j.x + j.w > 320) continue;
        const t = (p.y - (j.y + j.h / 2)) / Shell.speed;
        const meet = j.x + j.w / 2 + j.dir * (Jet.crossSpeed * t + lead);
        if (Math.abs(meet - x) < 4) { k.press.push('action'); break; }
      }
    }
    driveTo(home, 3)(g, k);
    return false;
  };
}

/** Tank: wait, dodging, until no bomb is still falling. */
const skiesClear = (): Step => tankDodging(waitFor((g) => g.room.bombs.length === 0));
