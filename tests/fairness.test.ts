// Fairness: every attack must be survivable by a human, not just by a bot that reacts on the same
// tick. The model of a human here: you see the cue (a bomb leaving the jet, or a dive warning),
// take REACT ticks to respond, then drive away at full speed. Every attack in the game must miss a
// player who does that, with MARGIN ticks to spare.
//
// HW-002 — found by Debu playing Jet Alley: bombs were too fast for the tank to escape (they
// reached the tank 0.52–0.65 s after the drop).
import { describe, expect, it } from 'vitest';
import { Bomb, DT, Jet, PLAYER_H, PLAYER_W, Tank, TILE, ms } from '../src/sim/config';
import { tick } from '../src/sim/game';
import { GAME_ROOMS } from '../src/sim/stages';
import { game, input, room } from './helpers';

const REACT = ms(350); // seeing the cue and starting to move
const MARGIN = ms(250); // spare time on top, so a slightly slow player still makes it

/** Ticks for the tank, from rest, to get `dist` px sideways. */
function escapeTicks(dist: number): number {
  let x = 0, v = 0, t = 0;
  while (x < dist) { v = Math.min(Tank.maxSpeed, v + Tank.accelGround * DT); x += v * DT; t++; }
  return t;
}

/** Ticks for a bomb, dropped from rest, to fall `d` px. */
function fallTicks(d: number): number {
  let y = 0, v = 0, t = 0;
  while (y < d) { v = Math.min(Bomb.maxFall, v + Bomb.gravity * DT); y += v * DT; t++; }
  return t;
}

/** Sideways distance that takes the tank out of a bomb's reach: its direct hit and its burst. */
const CLEAR = Math.max((PLAYER_W + Bomb.w) / 2, Bomb.killRadius) + 1;

describe('HW-002: bombs give a human time to get clear', () => {
  it('HW-002: in every room, each bombing jet\'s bomb takes long enough to reach the tank', () => {
    const budget = REACT + escapeTicks(CLEAR) + MARGIN;
    const slow: string[] = [];
    for (const r of GAME_ROOMS) {
      r.rows.forEach((row, ri) => [...row].forEach((ch) => {
        if (ch !== 'J' && ch !== 'j') return;
        const jetBottom = ri * TILE + (TILE - Jet.h) / 2 + Jet.h;
        for (let col = 0; col < 20; col++) {
          let g = ri + 1;
          while (g < 10 && !'#Hx=W'.includes(r.rows[g][col])) g++;
          if (g >= 10 || r.rows[g][col] === 'W') continue;
          const d = g * TILE - PLAYER_H - jetBottom; // to the top of a tank standing there
          if (d > 0 && fallTicks(d) < budget) slow.push(`${r.id} row ${ri} col ${col}: ${fallTicks(d)} < ${budget} ticks`);
        }
      }));
    }
    expect(slow).toEqual([]);
  });

  // The lowest jets over the highest ground in the stage rooms (2-4: jet row 1 over ground at row 6;
  // 2-1: jet row 2 over ground at row 7): the shortest drops in the game.
  for (const [jetRow, groundRow] of [[1, 6], [2, 7]]) {
    for (const away of ['left', 'right'] as const) {
      it(`HW-002: a player who reacts after ${Math.round((REACT / 60) * 1000)} ms and drives ${away} survives a jet at row ${jetRow} over ground at row ${groundRow}`, () => {
        const rows = Array.from({ length: 10 }, () => '....................');
        rows[jetRow] = 'J...................';
        rows[groundRow - 1] = '.........P..........';
        for (let r = groundRow; r < 10; r++) rows[r] = '####################';
        const g = game(room(rows));
        let dropped = -1;
        for (let i = 0; i < 1500 && g.deaths === 0; i++) {
          if (dropped < 0 && g.room.bombs.length > 0) dropped = i;
          const go = dropped >= 0 && i - dropped >= REACT;
          tick(g, input(go ? [away] : []));
          if (dropped >= 0 && i - dropped > 240) break;
        }
        expect(dropped).toBeGreaterThanOrEqual(0);
        expect(g.deaths).toBe(0);
      });
    }
  }
});
