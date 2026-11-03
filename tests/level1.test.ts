// river-guard-level1.md: script timing, tutorial aids, prompts and the clear condition.
import { describe, expect, it } from 'vitest';
import { idleInput } from '../src/sim/input';
import { Game, createGame, fuelSegments, pinnedLines, playerMode, tick, tutorialSlots } from '../src/sim/game';
import { hold, press, run } from './helpers';

function tickWhen(g: Game, pred: () => boolean, max = 2000): number {
  for (let i = 0; i < max; i++) {
    if (pred()) return g.tick - 1;
    tick(g, idleInput());
  }
  throw new Error('condition never met');
}

describe('level 1 script', () => {
  it('the cross jet enters on tick 23 and exits on tick 143 if unshot', () => {
    const g = createGame({ seed: 3 });
    run(g, 23);
    expect(g.jets).toHaveLength(0);
    tick(g, idleInput()); // tick 23
    expect(g.jets).toHaveLength(1);
    expect(g.jets[0]).toMatchObject({ path: 'cross', row: 0, script: 'l1cross' });
    run(g, 119); // through tick 142
    expect(g.jets.some((j) => j.script === 'l1cross')).toBe(true);
    tick(g, idleInput()); // tick 143
    expect(g.jets.some((j) => j.script === 'l1cross')).toBe(false);
    expect(g.level1.crossGoneTick).toBe(143);
  });

  it('the dive jet spawns the tick after the cross jet leaves, above the tank', () => {
    const g = createGame({ seed: 4 });
    run(g, 145); // ticks 0..144
    const dive = g.jets.find((j) => j.script === 'l1dive');
    if (g.player.lastHitTick === null || g.player.lastHitTick < 137) {
      expect(dive).toBeDefined();
      expect(dive!.col).toBe(g.player.col);
      expect(dive!.bornTick).toBe(144);
    }
  });

  it('idle players: 1 or 2 hits, never a game over, tutorial boat by tick 282 at (13, 12)', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const g = createGame({ seed });
      const tb = tickWhen(g, () => g.boat !== null, 400);
      expect(tb).toBeLessThanOrEqual(282);
      expect(g.boat).toMatchObject({ col: 13, row: 12, tutorial: true, drownLeft: 9360 });
      expect([1, 2]).toContain(g.lives);
      expect(g.gameOver).toBeNull();
      expect(fuelSegments(g)).toBe(8);
      expect(tutorialSlots(g)[0]).toBe('SAFE BOAT');
      expect(pinnedLines(g)).toEqual(['TUTORIAL BOAT', 'PRESS DOWN: CHOPPER']);
    }
  });

  it('step prompts: MOVE, then SPACE: FIRE after a move, then none after a shot', () => {
    const g = createGame({ seed: 1 });
    tick(g, idleInput());
    expect(pinnedLines(g)).toEqual(['MOVE ◀ ▶']);
    tick(g, press('left'));
    expect(pinnedLines(g)).toEqual(['SPACE: FIRE']);
    tick(g, press('fire'));
    expect(pinnedLines(g)).toEqual([]);
  });

  it('a tutorial drowning does not count and the boat returns 16 ticks later', () => {
    const g = createGame({ seed: 2 });
    tickWhen(g, () => g.boat !== null, 400);
    const D = tickWhen(g, () => g.boat === null, 400);
    expect(g.drowned).toBe(0);
    expect(g.messages.transients.map((m) => m.text)).toEqual(['BOAT LOST', 'TRY AGAIN']);
    run(g, 15);
    expect(g.boat).toBeNull();
    tick(g, idleInput());
    expect(g.tick - 1).toBe(D + 16);
    expect(g.boat?.tutorial).toBe(true);
  });

  it('the last-life net keeps lives at 1 before the rescue (player parked at column 1)', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = createGame({ seed });
      g.player.col = 1;
      tickWhen(g, () => g.boat !== null, 400);
      expect(g.lives).toBeGreaterThanOrEqual(1);
      if (g.lives === 1) expect(tutorialSlots(g)[1]).toBe('LAST LIFE SAFE');
    }
  });

  it('a rescue clears level 1: +500, LEVEL 1 CLEAR, normal jets start 23 ticks later', () => {
    const g = createGame({ seed: 9 });
    tickWhen(g, () => g.boat !== null, 400);
    run(g, 9); // past any impact lock
    tick(g, press('down'));
    expect(playerMode(g)).toBe('ChopperFree');
    let first = true;
    for (let i = 0; i < 60 && g.player.col < 13; i++) {
      tick(g, first ? press('right') : hold('right'));
      first = false;
    }
    run(g, 1);
    tick(g, press('down'));
    expect(playerMode(g)).toBe('ChopperHooked');
    first = true;
    const scoreBefore = g.score;
    for (let i = 0; i < 60 && g.level1.active; i++) {
      tick(g, first ? press('right') : hold('right'));
      first = false;
    }
    const R = g.tick - 1;
    expect(g.level1.active).toBe(false);
    expect(g.score).toBe(scoreBefore + 500);
    expect(g.messages.transients.map((m) => m.text)).toEqual(['+500 RESCUE', 'LEVEL 1 CLEAR']);
    expect(tutorialSlots(g)).toEqual(['', '']);
    expect(playerMode(g)).toBe('Tank');
    const jetsAtR = g.jets.length;
    run(g, 22);
    expect(g.jets.length).toBe(jetsAtR);
    tick(g, idleInput());
    expect(g.tick - 1).toBe(R + 23);
    expect(g.jets.length).toBe(jetsAtR + 1);
  });
});
