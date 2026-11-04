// Bots that play rooms by reading the sim each tick, the way a player reads the screen.
// Used by the solvability tests (and, later, the ghost hint).
import { TILE } from '../src/sim/config';
import { Game, isSolidTile, tick } from '../src/sim/game';
import { Button } from '../src/sim/input';
import { input } from './helpers';

export type Policy = (g: Game, t: number) => { held: Button[]; press?: Button[] };

export function play(g: Game, policy: Policy, until: (g: Game) => boolean, maxTicks = 3000): number {
  let prev = new Set<Button>();
  for (let t = 0; t < maxTicks; t++) {
    if (until(g)) return t;
    const { held, press = [] } = policy(g, t);
    const fresh = [...new Set([...press, ...held.filter((b) => !prev.has(b))])];
    tick(g, input(held, fresh));
    prev = new Set([...held, ...press]);
  }
  return -1;
}

const cx = (g: Game) => g.player.x + g.player.w / 2;

/** Look ahead along the ground: a gap, a wall or a cactus just ahead means jump. */
function obstacleAhead(g: Game, reach = 10): boolean {
  const p = g.player;
  const ahead = p.x + p.w + reach;
  const col = Math.floor(ahead / TILE);
  const feetRow = Math.floor((p.y + p.h - 1) / TILE);
  const floor = isSolidTile(g.room, col, feetRow + 1);
  const wall = isSolidTile(g.room, col, feetRow);
  const cactus = g.room.cacti.some((k) => k.grown && k.col === col && k.row === feetRow);
  return !floor || wall || cactus;
}

/** Room 1: jump the cactus, the gap and onto the ledge, fire at the target, cross the bridge. */
export const room1: Policy = (g) => {
  const p = g.player;
  const x = cx(g);
  const goingUp = !p.onGround && p.vy < 0;
  if (!g.room.bridgesDown && x >= 11 * TILE) {
    // Line up under the target (column 11) and fire straight up.
    const want = 11 * TILE + 8;
    if (!p.onGround) return { held: [] };
    if (x > want + 2) return { held: ['left'] };
    if (x < want - 2) return { held: ['right'] };
    return { held: [], press: g.shell ? [] : ['action'] };
  }
  const jump = (p.onGround && obstacleAhead(g)) || goingUp;
  return { held: jump ? ['right', 'jump'] : ['right'] };
};

/** Room 2: switch, fly to the boat, hook it, carry it over the pillar and set it on the dock. */
export function room2(): Policy {
  let stage = 0;
  return (g) => {
    const p = g.player;
    const x = cx(g);
    const boat = g.room.items.find((i) => i.kind === 'boat')!;
    const cactus = g.room.cacti[0];
    const keys: Button[] = [];
    const fly = (tx: number, ty: number) => {
      if (x < tx - 2) keys.push('right'); else if (x > tx + 2) keys.push('left');
      if (p.y > ty || p.vy > 50) keys.push('jump');
    };
    if (stage === 0 && p.body === 'tank') return { held: [], press: ['switch'] };
    if (stage === 0) {
      // It can hook the crate on take-off; set it down (Set Down), since a charge can't drop while carrying.
      if (p.carrying) return { held: ['jump'], press: ['drop'] };
      // Over the pillar: blast the cactus first so it is a safe refuel stop later.
      fly(11 * TILE + 8, 2 * TILE);
      if (Math.abs(x - (11 * TILE + 8)) < 3 && !g.charge && cactus.grown) return { held: keys, press: ['action'] };
      if (!cactus.grown) stage = 1;
    } else if (stage === 1) {
      // Fly low over the boat: the hook takes it automatically.
      fly(boat.x + boat.w / 2, boat.y - p.h - 20);
      if (p.carrying) stage = 2;
    } else if (stage === 2) {
      fly(17 * TILE + 8, 3 * TILE);
      if (Math.abs(x - (17 * TILE + 8)) < 4) stage = 3;
    } else if (stage === 3) {
      if (p.y < 4 * TILE) { keys.length = 0; } else keys.push('jump');
      if (Math.abs(p.vx) < 5 && p.carrying) return { held: keys, press: ['drop'] };
      if (!p.carrying) stage = 4;
    } else {
      // Land on the dock and drive out through the open gate.
      if (!p.onGround) return { held: [] };
      if (p.body === 'chopper') return { held: [], press: ['switch'] };
      return { held: ['right'] };
    }
    return { held: keys };
  };
}

