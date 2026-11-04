// The play-time estimate: a simulated new player through every room (tests/novice.ts).
// Prints a table; run with NOVICE=1 npx vitest run tests/novice.report.test.ts.
import { describe, expect, it } from 'vitest';
import { CASUAL, estimate, GAMER, NOVICE } from './novice';

const run = process.env.NOVICE ? describe : describe.skip;

run('play-time estimate', () => {
  for (const prof of [NOVICE, CASUAL, GAMER]) {
    it(`${prof.name}`, () => {
      const e = estimate(prof, Number(process.env.RUNS) || 20);
      const lines = e.rooms.map((r) => `${r.id.padEnd(4)} ${r.seconds.toFixed(1).padStart(6)} s  deaths ${r.deaths.toFixed(1).padStart(4)}  skip ${(r.skipRate * 100).toFixed(0).padStart(3)}%  ${r.causes}`);
      const m = Math.floor(e.totalSeconds / 60);
      const sec = Math.round(e.totalSeconds % 60);
      console.log(`\n== ${prof.name}: ${m} min ${sec} s\n${lines.join('\n')}\n`);
      expect(e.totalSeconds).toBeGreaterThan(0);
    }, 600_000);
  }
});
