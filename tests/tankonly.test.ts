// HW-004 — found by Debu: in rooms where the chopper is needed to cross the river, the tank must
// never be able to jump across instead. This searches every route a tank alone can take and
// checks that none gets across, in every room built for the chopper (the rooms that allow
// switching: stages 3-5).
//
// The search is generous to the tank, so a pass is a real guarantee: every launch starts at full
// speed (as if it had a perfect run-up), from every take-off point near every edge, in both
// directions, jumping on the spot or up to 12 ticks later (which covers jumping just after running
// off an edge, inside the coyote window), holding Jump for the highest arc and the direction for
// the longest one. Every surface it lands on becomes a new place to launch from.
import { describe, expect, it } from 'vitest';
import { PLAYER_W, ROOM_PX_W, TILE, Tank } from '../src/sim/config';
import { Game, tick } from '../src/sim/game';
import { RoomDef } from '../src/sim/rooms';
import { GAME_ROOMS } from '../src/sim/stages';
import { game, input, settle } from './helpers';

const SOLID = '#HxW';

/** Where "across" starts: past the last column with water in it, or the room's exit if it has none. */
function farX(def: RoomDef): number {
  let last = -1;
  def.rows.forEach((r) => [...r].forEach((ch, c) => { if (ch === '~') last = Math.max(last, c); }));
  return last >= 0 ? (last + 1) * TILE : ROOM_PX_W;
}

/** The flat surfaces you can stand on: runs of solid tiles with air above, as [row, firstCol, lastCol]. */
function surfaces(def: RoomDef): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let row = 1; row < 10; row++) {
    let c = 0;
    while (c < 20) {
      // A cactus sits on the tile below it and kills, so it splits a floor in two: you can't stand
      // on it or drive through it.
      const top = (col: number) => SOLID.includes(def.rows[row][col]) && !SOLID.includes(def.rows[row - 1][col]) && !'~C'.includes(def.rows[row - 1][col]);
      if (!top(c)) { c++; continue; }
      const start = c;
      while (c < 20 && top(c)) c++;
      out.push([row, start, c - 1]);
    }
  }
  return out;
}

interface Result { crossed: boolean; how: string }

function launch(def: RoomDef, x: number, top: number, dir: -1 | 1, wait: number, far: number): { landed: [number, number] | null; crossed: boolean } {
  const g: Game = game(def);
  settle(g, 2);
  const p = g.player;
  Object.assign(p, { body: 'tank', x, y: top - p.h, vx: dir * Tank.maxSpeed, vy: 0, onGround: true, foldTicks: 0, facing: dir });
  const key = dir === 1 ? 'right' : 'left';
  const room0 = g.room.index;
  let airborne = false;
  for (let t = 0; t < 300; t++) {
    const jumpNow = t === wait;
    tick(g, input([key, ...(t >= wait ? ['jump' as const] : [])], jumpNow ? ['jump'] : []));
    if (g.room.index !== room0) return { landed: null, crossed: true };
    if (p.deadTicks > 0 || g.deaths > 0) return { landed: null, crossed: false };
    if (!p.onGround) airborne = true;
    else if (airborne) {
      const feetX = p.x + p.w / 2;
      return { landed: [Math.floor((p.y + p.h) / TILE), Math.floor(feetX / TILE)], crossed: p.x + PLAYER_W > far + 2 };
    }
  }
  return { landed: null, crossed: false };
}

function tankCanCross(def: RoomDef): Result {
  const far = farX(def);
  const surf = surfaces(def);
  const g = game(def);
  settle(g, 30);
  const startRow = Math.floor((g.player.y + g.player.h) / TILE);
  const startCol = Math.floor((g.player.x + g.player.w / 2) / TILE);
  const find = (row: number, col: number) => surf.find(([r, a, b]) => r === row && col >= a && col <= b);
  const first = find(startRow, startCol);
  if (!first) throw new Error(`${def.id}: the start isn't on a surface`);
  const seen = new Set<string>([first.join(',')]);
  const queue = [first];
  while (queue.length) {
    const [row, a, b] = queue.shift()!;
    const top = row * TILE;
    for (const dir of [-1, 1] as const) {
      // Take-off points within 3 tiles of the edge you're heading for (nearer the middle is never better
      // at full speed), every 3 px.
      const edge = dir === 1 ? (b + 1) * TILE - PLAYER_W : a * TILE;
      const xs: number[] = [];
      for (let k = 0; k <= 3 * TILE; k += 3) xs.push(edge - dir * k);
      for (const x of xs) {
        if (x < a * TILE - 1 || x > (b + 1) * TILE - PLAYER_W + 1) continue;
        for (const wait of [0, 2, 4, 6, 8, 10, 12]) {
          const r = launch(def, x, top, dir, wait, far);
          if (r.crossed) return { crossed: true, how: `from row ${row} cols ${a}-${b}, x ${x}, heading ${dir === 1 ? 'right' : 'left'}, jump after ${wait} ticks` };
          if (!r.landed) continue;
          const s = find(r.landed[0], r.landed[1]);
          if (s && !seen.has(s.join(','))) { seen.add(s.join(',')); queue.push(s); }
        }
      }
    }
  }
  return { crossed: false, how: `reached ${[...seen].join(' | ')}` };
}

describe('HW-004: the tank alone never gets across where the chopper is needed', () => {
  for (const def of GAME_ROOMS.filter((r) => r.canSwitch)) {
    it(`HW-004: ${def.id} ${def.name}: no tank jump gets across`, () => {
      const r = tankCanCross(def);
      expect(r.crossed, r.how).toBe(false);
    }, 60_000);
  }
});
