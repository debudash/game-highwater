import { describe, expect, it } from 'vitest';
import * as Sprites from '../src/view/sprites';

// RG-001 — found by the browser e2e bot (tools/e2e.mjs): the game froze on the first chopper entry.
describe('sprites (RG-001)', () => {
  it('every sprite and animation frame is exactly 16×16', () => {
    for (const [name, value] of Object.entries(Sprites)) {
      const frames = Array.isArray(value[0]?.[0]) ? (value as boolean[][][]) : [value as boolean[][]];
      frames.forEach((s, i) => {
        expect(s.length, `${name}[${i}] rows`).toBe(16);
        for (const row of s) expect(row.length, `${name}[${i}] cols`).toBe(16);
      });
    }
  });
});

// RG-002 — found by the browser e2e bot's game-over screenshot: the killing hit's 60 ms flash froze on screen.
import { fxToDraw } from '../src/view/render';
import { addJet, createGame, tick } from '../src/sim/game';
import { idleInput } from '../src/sim/input';

describe('effects at game over (RG-002)', () => {
  it('no flash or burst is drawn once the run is over, so the wreck stays visible', () => {
    const g = createGame({ seed: 1, level1: false, noSpawns: true });
    g.lives = 1;
    const j = addJet(g, 'dive', 8, 8);
    j.acc = 660;
    tick(g, idleInput());
    expect(g.gameOver).toBe('Lives');
    expect(g.fx.length).toBeGreaterThan(0);
    expect(fxToDraw(g)).toEqual([]);
  });
});
