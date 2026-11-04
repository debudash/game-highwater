// Fairness: every attack must be survivable by a human, not just by a bot that reacts on the same
// tick. The model of a human here: you see the cue (a bomb leaving the jet, or a dive warning),
// take REACT ticks to respond, then drive away at full speed. Every attack in the game must miss a
// player who does that, with MARGIN ticks to spare.
//
// HW-002 — found by Debu playing Jet Alley: bombs were too fast for the tank to escape (they
// reached the tank 0.52–0.65 s after the drop). HW-003 — found while checking HW-002: a dive jet
// pulled out towards the far side of the room at ground level, so dodging that way was fatal with
// no warning.
import { describe, expect, it } from 'vitest';
import { Bomb, DT, Jet, PLAYER_H, PLAYER_W, Tank, TILE, ms } from '../src/sim/config';
import { Game, tick } from '../src/sim/game';
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

  it('HW-002: the Bomber\'s bombs take long enough to reach the tank too', () => {
    const budget = REACT + escapeTicks(CLEAR) + MARGIN;
    const slow: string[] = [];
    for (const r of GAME_ROOMS.filter((r) => r.bomber?.mode === 'bay')) {
      const bottom = (r.bomber!.row + 1) * TILE - 2;
      for (let col = 0; col < 20; col++) {
        let g = r.bomber!.row + 1;
        while (g < 10 && !'#Hx=W'.includes(r.rows[g][col])) g++;
        if (g >= 10 || r.rows[g][col] === 'W') continue;
        const d = g * TILE - PLAYER_H - bottom;
        if (d > 0 && fallTicks(d) < budget) slow.push(`${r.id} col ${col}: ${fallTicks(d)} < ${budget} ticks`);
      }
    }
    expect(slow).toEqual([]);
  });

  for (const away of ['left', 'right'] as const) {
    it(`HW-002: in F-1, a player who reacts after 350 ms to each Bomber bomb and drives ${away} survives two passes`, () => {
      const g = game(GAME_ROOMS.find((r) => r.id === 'F-1')!);
      let dropped = -1;
      let dir = away;
      for (let i = 0; i < 1400 && g.deaths === 0; i++) {
        if (g.events.some((e) => e.type === 'bombDrop')) { dropped = i; dir = g.player.x < 40 ? 'right' : g.player.x > 260 ? 'left' : away; }
        const go = dropped >= 0 && i - dropped >= REACT && i - dropped < REACT + 40;
        tick(g, input(go ? [dir] : []));
      }
      expect(dropped).toBeGreaterThanOrEqual(0);
      expect(g.deaths).toBe(0);
    });
  }

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

// HW-005 — found by the simulated new player (tests/novice.ts) in F-3: a cross jet bombed a
// chopper flying about 40 px below it, and the bomb arrived before a human could react and move.
describe('HW-005: a jet\'s bomb gives a chopper in the air time to get clear', () => {
  for (const y of [34, 50, 70, 90]) {
    for (const away of ['left', 'right'] as const) {
      it(`HW-005: a chopper hovering at y ${y} under a cross jet, reacting after 350 ms and moving ${away}, survives`, () => {
        const rows = Array.from({ length: 10 }, () => '....................');
        rows[1] = 'J...................';
        rows[8] = '.........P..........';
        rows[9] = '####################';
        const g = game(room(rows));
        tick(g, input([], ['switch']));
        let dropped = -1;
        for (let i = 0; i < 900 && g.deaths === 0; i++) {
          const p = g.player;
          if (dropped < 0 && g.events.some((e) => e.type === 'bombDrop')) dropped = i;
          const held: ('left' | 'right' | 'jump')[] = [];
          if (p.y > y || p.vy > 30) held.push('jump');
          if (dropped >= 0 && i - dropped >= REACT && i - dropped < REACT + 30) held.push(away);
          tick(g, input(held));
          if (dropped >= 0 && i - dropped > 200) break;
          if (p.fuel < 5) { p.fuel = 60 * 3; } // the test is about the bomb, not the fuel
        }
        expect(g.deaths).toBe(0);
      });
    }
  }
});

describe('F-2: dive jets guard the Bomber, fairly', () => {
  const F2 = GAME_ROOMS.find((r) => r.id === 'F-2')!;

  it('the lake room has a dive jet attacking you (Debu: "what is the adventure if no one is attacking you")', () => {
    expect(F2.rows.join('').split('D').length - 1).toBeGreaterThanOrEqual(1);
  });

  for (const away of ['left', 'right'] as const) {
    it(`a chopper hovering over the lake that reacts after 350 ms and moves ${away} survives 25 s of dives`, () => {
      const g = game(F2);
      let home = 9 * TILE + 8;
      let warned = -1;
      for (let i = 0; i < 1500 && g.deaths === 0; i++) {
        const p = g.player;
        if (g.events.some((e) => e.type === 'diveWarn')) warned = i;
        if (warned >= 0 && i - warned === REACT) home += (away === 'left' ? -1 : 1) * 36;
        home = Math.max(4 * TILE, Math.min(15 * TILE, home));
        const held: ('left' | 'right' | 'jump' | 'switch')[] = [];
        if (i === 0) { tick(g, input([], ['switch'])); continue; }
        if (warned >= 0 && i - warned >= REACT) {
          const d = home - (p.x + p.w / 2);
          if (d > 2) held.push('right');
          else if (d < -2) held.push('left');
        } else if (Math.abs(p.x + p.w / 2 - 9 * TILE - 8) > 3 && warned < 0) held.push(p.x + p.w / 2 < 9 * TILE + 8 ? 'right' : 'left');
        if (p.y > 50 || p.vy > 30) held.push('jump');
        if (p.fuel < 10) break; // out of fuel: the test is about the dives, not refuelling
        tick(g, input(held));
      }
      expect(warned).toBeGreaterThanOrEqual(0);
      expect(g.deaths).toBe(0);
    });
  }

  it('a dive jet pulls out above the Bomber, never through it', () => {
    const g = game(F2);
    let climbs = 0;
    for (let i = 0; i < 1500; i++) {
      tick(g, input([]));
      for (const j of g.room.jets) {
        if (j.phase === 'climb' && j.y + j.h > g.room.bomber!.y) climbs++;
      }
    }
    expect(climbs).toBe(0);
  });
});

describe('HW-003: a dive jet never pulls out through a player who dodged', () => {
  for (const away of ['left', 'right'] as const) {
    for (const startCol of [4, 9, 15]) {
      it(`HW-003: dodging ${away} from column ${startCol} after the warning survives the dive and the climb`, () => {
        const rows = Array.from({ length: 10 }, () => '....................');
        rows[0] = 'D...................';
        rows[8] = '.'.repeat(startCol) + 'P' + '.'.repeat(19 - startCol);
        rows[9] = '####################';
        const g: Game = game(room(rows));
        let warned = -1;
        for (let i = 0; i < 1500 && g.deaths === 0; i++) {
          const j = g.room.jets[0];
          if (warned < 0 && j.phase === 'warn') warned = i;
          // React, drive clear of the column, then stop: a player who dodged and waits.
          const moving = warned >= 0 && i - warned >= REACT && i - warned < REACT + escapeTicks((PLAYER_W + Jet.w) / 2 + 2);
          tick(g, input(moving ? [away] : []));
          if (warned >= 0 && j.phase === 'wait') break; // the attack is over
        }
        expect(warned).toBeGreaterThanOrEqual(0);
        expect(g.deaths).toBe(0);
      });
    }
  }
});
