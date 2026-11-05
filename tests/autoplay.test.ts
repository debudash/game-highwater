// Watch mode (?autoplay): the bot plays the real game from a new run to the end, bringing every
// required boat home, and the run ends (the ending and results card follow). Once, in 3-4, it waits
// too long on purpose, so a jet sinks the boat and the room restarts: watch mode shows the threat to
// the boats and the retry. That is the run's only death.
import { describe, expect, it } from 'vitest';
import { Autoplay, SINK_DEMO } from '../src/sim/autoplay';
import { createGame, GameEvent, tick } from '../src/sim/game';
import { GAME_ROOMS } from '../src/sim/stages';

describe('autoplay', () => {
  it('plays the whole run, first room to the Bomber, losing one boat to a jet on the way', () => {
    const g = createGame();
    const bot = new Autoplay();
    const seen = new Set<string>();
    const deaths: { room: string; events: GameEvent['type'][] }[] = [];
    for (let t = 0; t < 60 * 60 * 20 && !g.complete; t++) {
      tick(g, bot.next(g));
      seen.add(g.room.def.id);
      if (g.events.some((e) => e.type === 'death')) deaths.push({ room: g.room.def.id, events: g.events.map((e) => e.type) });
    }
    expect(g.complete, 'the run ended').toBe(true);
    expect(deaths.map((d) => d.room)).toEqual([SINK_DEMO]);
    // A jet's bomb sank it (a bomb blast and a lost boat), not a mine or the player's own mistake.
    expect(deaths[0].events).toEqual(expect.arrayContaining(['bombBlast', 'boatLost', 'death']));
    expect(g.deaths).toBe(1);
    expect(g.skipped).toEqual([]);
    expect([...seen]).toEqual(GAME_ROOMS.map((r) => r.id));
    expect(g.boatsSaved).toBe(GAME_ROOMS.reduce((n, r) => n + r.rows.join('').split('B').length - 1, 0));
    expect(g.score).toBeGreaterThan(0);
  });

  it('starts over cleanly on a new run, and shows the sinking again', () => {
    const bot = new Autoplay();
    const a = createGame();
    for (let i = 0; i < 300; i++) tick(a, bot.next(a));
    const b = createGame();
    for (let i = 0; i < 60 * 60 * 20 && !b.complete; i++) tick(b, bot.next(b));
    expect(b.complete).toBe(true);
    expect(b.deaths).toBe(1);
  });
});
