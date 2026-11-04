// Watch mode (?autoplay): the bot plays the real game from a new run to the end, without dying,
// bringing every required boat home, and the run ends (the ending and results card follow).
import { describe, expect, it } from 'vitest';
import { Autoplay } from '../src/sim/autoplay';
import { createGame, tick } from '../src/sim/game';
import { GAME_ROOMS } from '../src/sim/stages';

describe('autoplay', () => {
  it('plays the whole run, first room to the Bomber, without dying', () => {
    const g = createGame();
    const bot = new Autoplay();
    const seen = new Set<string>();
    let t = 0;
    for (; t < 60 * 60 * 20 && !g.complete; t++) {
      tick(g, bot.next(g));
      seen.add(g.room.def.id);
    }
    expect(g.complete, 'the run ended').toBe(true);
    expect(g.deaths).toBe(0);
    expect(g.skipped).toEqual([]);
    expect([...seen]).toEqual(GAME_ROOMS.map((r) => r.id));
    expect(g.boatsSaved).toBe(GAME_ROOMS.reduce((n, r) => n + r.rows.join('').split('B').length - 1, 0));
    expect(g.score).toBeGreaterThan(0);
  });

  it('starts over cleanly on a new run', () => {
    const bot = new Autoplay();
    const a = createGame();
    for (let i = 0; i < 300; i++) tick(a, bot.next(a));
    const b = createGame();
    for (let i = 0; i < 60 * 60 * 20 && !b.complete; i++) tick(b, bot.next(b));
    expect(b.complete).toBe(true);
    expect(b.deaths).toBe(0);
  });
});
