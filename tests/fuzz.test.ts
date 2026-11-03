// Bot play-QA: random input in every band, checking the §9 hard invariants after every tick.
import { describe, expect, it } from 'vitest';
import { BUTTONS, TickInput, noButtons } from '../src/sim/input';
import {
  Game, bombInterval, ceilingRow, createGame, isChopper, jetInterval, skyPolicy, tick,
} from '../src/sim/game';
import { Tunables } from '../src/sim/config';

function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomPlayer(seed: number) {
  const r = mulberry(seed);
  const held = noButtons();
  return (): TickInput => {
    const press = noButtons();
    for (const b of BUTTONS) {
      if (!held[b] && r() < 0.08) {
        press[b] = true;
        held[b] = r() < 0.7;
      } else if (held[b] && r() < 0.15) {
        held[b] = false;
      }
    }
    return { press, held: { ...held } };
  };
}

function checkInvariants(g: Game, livesBefore: number, wasChopper: boolean, budgetBefore: number | null, crisisBefore: string) {
  // 4, 10: Crisis XOR, at most one boat and one mine, crisis matches entities
  expect(g.boat !== null && g.mine !== null).toBe(false);
  expect(g.crisis === 'Boat').toBe(g.boat !== null);
  expect(g.crisis === 'Mine').toBe(g.mine !== null);
  // 25: chopper only in a boat crisis
  if (isChopper(g)) expect(g.crisis).toBe('Boat');
  // 2, 13, 14: no life lost in the chopper
  if (wasChopper && isChopper(g)) expect(g.lives).toBe(livesBefore);
  // 33: at most one life per tick
  expect(livesBefore - g.lives).toBeLessThanOrEqual(1);
  // 17: cross jets on row 0
  for (const j of g.jets) if (j.path === 'cross') expect(j.row).toBe(0);
  // 20: river bombs only under the bomb-sink conditions
  for (const b of g.bombs) {
    if (b.row >= 11) {
      expect(g.crisis).toBe('Boat');
      expect(g.boat!.hooked).toBe(false);
      expect(isChopper(g)).toBe(false);
      expect(b.col).toBe(g.boat!.col);
      expect(b.dropTick).toBeGreaterThan(g.boat!.spawnTick);
    }
  }
  // 1: under SkyPolicy nothing enters a row below the ceiling from on or above it
  if (skyPolicy(g)) {
    const c = ceilingRow(g);
    for (const m of [...g.jets, ...g.bombs]) {
      if (m.prevRow !== null && m.prevRow <= c) expect(m.row).toBeLessThanOrEqual(c);
    }
  }
  // 15: the budget never increases mid-crisis
  if (budgetBefore !== null && g.flightBudget !== null && crisisBefore === 'Boat' && g.crisis === 'Boat') {
    expect(g.flightBudget).toBeLessThanOrEqual(budgetBefore);
  }
  // 34: accumulators in [0, interval - 1]
  for (const j of g.jets) {
    expect(j.acc).toBeGreaterThanOrEqual(0);
    expect(j.acc).toBeLessThan(jetInterval(g, j));
  }
  const bi = bombInterval(g);
  for (const b of g.bombs) {
    expect(b.acc).toBeGreaterThanOrEqual(0);
    expect(b.acc).toBeLessThan(bi);
  }
  // 36: TankJump ⇔ row 8
  if (g.player.mode === 'jump') expect(g.player.row).toBe(8);
  expect(g.score).toBeLessThanOrEqual(Tunables.scoreMax);
  expect(g.lives).toBeGreaterThanOrEqual(0);
  expect(g.shell === null || (g.shell.row >= 0 && g.shell.row <= 9)).toBe(true);
}

describe('fuzz: random play keeps every hard invariant', () => {
  const starts: { label: string; score: number; level1: boolean }[] = [
    { label: 'level 1', score: 0, level1: true },
    { label: 'band B boats', score: 2000, level1: false },
    { label: 'band C mines', score: 12000, level1: false },
    { label: 'band E', score: 31000, level1: false },
  ];
  for (const s of starts) {
    it(s.label, () => {
      let ticks = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const g = createGame({ seed, level1: s.level1, score: s.score });
        const input = randomPlayer(seed * 7919);
        for (let i = 0; i < 4000 && !g.gameOver; i++) {
          const livesBefore = g.lives;
          const wasChopper = isChopper(g);
          const budgetBefore = g.flightBudget;
          const crisisBefore = g.crisis;
          tick(g, input());
          checkInvariants(g, livesBefore, wasChopper, budgetBefore, crisisBefore);
          ticks++;
        }
      }
      expect(ticks).toBeGreaterThan(1000);
    });
  }
});
