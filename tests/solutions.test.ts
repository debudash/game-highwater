// Every room has a recorded way through it that runs as a test, so each room is proven solvable
// (design: "Solvability"). The same solutions feed the ghost hint (tests/ghosts.test.ts).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/game';
import { TEST_ROOMS } from '../src/sim/rooms';
import { GAME_ROOMS } from '../src/sim/stages';
import { play, room1, room2 } from './bots';
import { HIDDEN_BOTS, STAGE_BOTS } from './stagebots';

describe('the feel-check rooms are solvable', () => {
  it('room 1 (tank): cleared without dying', () => {
    const g = createGame({ rooms: TEST_ROOMS, startRoom: 0 });
    const t = play(g, room1, (g) => g.room.index === 1);
    expect(t, 'ticks to clear').toBeGreaterThan(0);
    expect(g.deaths).toBe(0);
  });

  it('room 2 (chopper): boat rescued, gate open, room left, without dying', () => {
    const g = createGame({ rooms: TEST_ROOMS, startRoom: 1 });
    const t = play(g, room2(), (g) => g.loops > 0, 5000);
    expect(g.deaths, 'deaths').toBe(0);
    expect(t, 'ticks to clear').toBeGreaterThan(0);
    expect(g.score).toBe(500);
  });
});

describe('every stage room is solvable on its main path, without dying', () => {
  GAME_ROOMS.forEach((def, i) => {
    it(`${def.id} ${def.name}`, () => {
      const bot = STAGE_BOTS[def.id];
      expect(bot, `a bot for ${def.id}`).toBeDefined();
      const g = createGame({ rooms: GAME_ROOMS, startRoom: i });
      const t = play(g, bot(), (g) => g.room.index !== i || g.loops > 0 || g.complete, 4000);
      expect(g.deaths, 'deaths').toBe(0);
      expect(t, 'ticks to clear').toBeGreaterThan(0);
      // Required boats were all brought home (the gate needs them).
      expect(g.boatsSaved).toBe(def.rows.join('').split('B').length - 1);
    });
  });
});

describe('every hidden boat can be reached', () => {
  for (const def of GAME_ROOMS.filter((r) => r.rows.join('').includes('b'))) {
    it(`${def.id}: the hidden boat`, () => {
      const g = createGame({ rooms: GAME_ROOMS, startRoom: GAME_ROOMS.indexOf(def) });
      play(g, HIDDEN_BOTS[def.id](), (g) => g.room.hiddenHome > 0 || g.deaths > 0, 3000);
      expect(g.deaths).toBe(0);
      expect(g.room.hiddenHome).toBe(1);
    });
  }
});
