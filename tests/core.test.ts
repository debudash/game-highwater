// Phase 1–4 acceptance checks from river-guard-rulebook.md §11, plus §9 hard invariants.
import { describe, expect, it } from 'vitest';
import { FrameClock, idleInput } from '../src/sim/input';
import {
  addBomb, addJet, ceilingRow, createGame, fuelSegments, playerMode, skyPolicy, startBoatCrisis, tick,
} from '../src/sim/game';
import { panelLines } from '../src/sim/messages';
import { hold, press, quietGame, run, tap } from './helpers';

describe('fixed tick and frame clock (§9 Tick length, Catch-up)', () => {
  it('a 180 ms frame runs 3 ticks; a 500 ms frame runs 5 and drops the backlog to 20 ms', () => {
    const c = new FrameClock();
    c.advance(0);
    expect(c.advance(180)).toBe(3);
    const d = new FrameClock();
    d.advance(0);
    expect(d.advance(500)).toBe(5);
    expect(d.frameAcc).toBe(20);
  });

  it('a band-C dive jet (509 ms) takes floor(60k/509) steps in k ticks, never two in one tick', () => {
    const g = quietGame(5000);
    g.player.col = 0;
    const j = addJet(g, 'dive', 10, 0);
    j.bornTick = g.tick; // appears this tick
    tick(g, idleInput());
    for (let k = 1; k <= 80; k++) {
      const before = j.row;
      tick(g, idleInput());
      if (!g.jets.includes(j)) break;
      expect(j.row - before).toBeLessThanOrEqual(1);
      expect(j.row).toBe(Math.floor((60 * k) / 509));
    }
  });
});

describe('shell (§4 Shell)', () => {
  it('fired from the lane: row 9 on the fire tick, row 8 next tick, row 0 at 540 ms, then gone', () => {
    const g = quietGame();
    tick(g, press('fire'));
    expect(g.shell).toMatchObject({ col: 8, row: 9 });
    tick(g, idleInput());
    expect(g.shell?.row).toBe(8);
    run(g, 8);
    expect(g.shell?.row).toBe(0);
    tick(g, idleInput());
    expect(g.shell).toBeNull();
    expect(g.score).toBe(0);
  });

  it('fire is press-only: holding fires once; a press while a shell flies is discarded', () => {
    const g = quietGame();
    tick(g, press('fire'));
    run(g, 20, hold('fire'));
    expect(g.shell).toBeNull();
    tick(g, press('fire'));
    tick(g, press('fire')); // discarded, not buffered
    expect(g.shell?.row).toBe(8);
  });

  it('Left + Fire on one tick starts the shell in the new column', () => {
    const g = quietGame();
    tick(g, press('left', 'fire'));
    expect(g.shell?.col).toBe(7);
  });

  it('a swap (jet one row above, both step) is a hit: +100, both removed', () => {
    const g = quietGame();
    g.shell = { col: 3, row: 6, prevRow: 6, acc: 0, lastInterval: 60, bornTick: -1 };
    const j = addJet(g, 'dive', 3, 5);
    j.acc = 660; // steps next tick (720)
    tick(g, idleInput());
    expect(g.score).toBe(100);
    expect(g.shell).toBeNull();
    expect(g.jets).toHaveLength(0);
  });

  it('near miss: a cross jet leaving the row-0 cell the shell enters is not hit', () => {
    const g = quietGame();
    g.shell = { col: 3, row: 1, prevRow: 1, acc: 0, lastInterval: 60, bornTick: -1 };
    const j = addJet(g, 'cross', 3, 0, 1);
    j.acc = 340; // steps next tick (400)
    tick(g, idleInput());
    expect(g.score).toBe(0);
    expect(j.col).toBe(4);
    expect(g.shell?.row).toBe(0);
  });

  it('a shell meeting two jets kills only the earliest spawned', () => {
    const g = quietGame();
    g.shell = { col: 3, row: 1, prevRow: 1, acc: 0, lastInterval: 60, bornTick: -1 };
    const a = addJet(g, 'cross', 3, 0, 1);
    const b = addJet(g, 'cross', 3, 0, -1);
    tick(g, idleInput());
    expect(g.jets).toEqual([b]);
    expect(g.jets).not.toContain(a);
    expect(g.score).toBe(100);
  });

  it('point-blank: firing as a dive jet enters the tank cell kills it with no life lost', () => {
    const g = quietGame();
    const j = addJet(g, 'dive', 8, 8);
    j.acc = 660;
    tick(g, press('fire'));
    expect(g.score).toBe(100);
    expect(g.lives).toBe(3);
  });
});

describe('jets (§4 Jets)', () => {
  it('a dive jet reaching ground row 10 is removed with no score', () => {
    const g = quietGame();
    const j = addJet(g, 'dive', 2, 9);
    j.acc = 660;
    tick(g, idleInput());
    expect(g.jets).toHaveLength(0);
    expect(g.score).toBe(0);
  });

  it('cross jets stay on row 0 and leave through the far wall (invariant 17)', () => {
    const g = createGame({ seed: 5, level1: false });
    for (let i = 0; i < 3000; i++) {
      tick(g, idleInput());
      for (const j of g.jets) if (j.path === 'cross') expect(j.row).toBe(0);
      if (g.gameOver) break;
    }
  });
});

describe('tank hits, invulnerability and respawn (§4 Tank, §8)', () => {
  it('jet hit: -1 life, 420 ms lock, respawn at T_r = I+7, invulnerable until I+16', () => {
    const g = quietGame();
    const j = addJet(g, 'dive', 8, 8);
    j.acc = 660;
    tick(g, idleInput());
    const I = g.tick - 1;
    expect(g.lives).toBe(2);
    expect(playerMode(g)).toBe('TankInvuln');
    run(g, 6, press('left'));
    expect(g.player.col).toBe(8); // locked
    tick(g, idleInput()); // T_r
    expect(g.tick - 1).toBe(I + 7);
    expect(g.player.wreck).toBeNull();
    run(g, 8);
    expect(playerMode(g)).toBe('TankInvuln');
    tick(g, idleInput()); // I + 16
    expect(playerMode(g)).toBe('Tank');
  });

  it('holding Left through the lock: stays on the respawn column on T_r, moves at T_r+1, then every 2 ticks', () => {
    const g = quietGame();
    const j = addJet(g, 'dive', 8, 8);
    j.acc = 660;
    tick(g, idleInput());
    run(g, 7, hold('left')); // through T_r
    expect(g.player.col).toBe(8);
    tick(g, hold('left'));
    expect(g.player.col).toBe(7);
    tick(g, hold('left'));
    expect(g.player.col).toBe(7);
    tick(g, hold('left'));
    expect(g.player.col).toBe(6);
  });

  it('an invulnerable tank lets a dive jet pass through to the ground (invariant 24)', () => {
    const g = quietGame();
    g.player.invulnLeft = 900;
    const j = addJet(g, 'dive', 8, 8);
    j.acc = 660;
    run(g, 24);
    expect(g.lives).toBe(3);
    expect(g.jets).toHaveLength(0);
  });

  it('simultaneous bomb + jet: one life; the bomb is consumed, the jet falls on', () => {
    const g = quietGame();
    const j = addJet(g, 'dive', 8, 8);
    j.acc = 660;
    const b = addBomb(g, 8, 8);
    b.bornTick = -1;
    b.acc = 600;
    tick(g, idleInput());
    expect(g.lives).toBe(2);
    expect(g.bombs).toHaveLength(0);
    expect(g.jets).toContain(j);
  });

  it('respawn avoids a column a dive jet is about to reach', () => {
    const g = quietGame();
    const b = addBomb(g, 8, 8);
    b.bornTick = -1;
    b.acc = 600;
    addJet(g, 'dive', 8, 6); // 3 rows above the lane: reaches it inside the window
    tick(g, idleInput());
    expect(g.lives).toBe(2);
    run(g, 7);
    expect(g.player.col).toBe(9);
  });
});

describe('controls (§7)', () => {
  it('fast tapping moves one column per tick; holding moves every 2 ticks', () => {
    const g = quietGame();
    tick(g, tap('left'));
    tick(g, tap('left'));
    tick(g, tap('left'));
    expect(g.player.col).toBe(5);
    const h = quietGame();
    tick(h, press('right'));
    run(h, 4, hold('right'));
    expect(h.player.col).toBe(11);
  });

  it('Left and Right pressed on one tick and held: no move until a fresh press', () => {
    const g = quietGame();
    tick(g, press('left', 'right'));
    run(g, 6, hold('left', 'right'));
    expect(g.player.col).toBe(8);
    const i = hold('left', 'right');
    i.press.left = true;
    tick(g, i);
    expect(g.player.col).toBe(7);
  });

  it('releasing one key of a tie moves the other way at once', () => {
    const g = quietGame();
    tick(g, press('left', 'right'));
    tick(g, hold('left', 'right'));
    tick(g, hold('right'));
    expect(g.player.col).toBe(9);
  });

  it('two opposite taps in one frame give no move', () => {
    const g = quietGame();
    tick(g, tap('left', 'right'));
    expect(g.player.col).toBe(8);
  });

  it('holding into a wall stays put', () => {
    const g = quietGame();
    g.player.col = 0;
    tick(g, press('left'));
    run(g, 6, hold('left'));
    expect(g.player.col).toBe(0);
  });
});

describe('boats and the chopper (§4 Boats, Chopper; §9 SkyPolicy)', () => {
  function boatGame() {
    const g = quietGame(2000);
    startBoatCrisis(g, 5, 12, false);
    return g;
  }

  it('Down with no crisis does nothing; Down in a boat crisis enters ChopperFree', () => {
    const g = quietGame(2000);
    tick(g, press('down'));
    expect(playerMode(g)).toBe('Tank');
    const h = boatGame();
    tick(h, press('down'));
    expect(playerMode(h)).toBe('ChopperFree');
    expect(skyPolicy(h)).toBe(true);
  });

  it('full rescue: fly to the boat, hook with Down, ferry to a bank → +500, Tank, crisis over', () => {
    const g = boatGame();
    tick(g, press('down'));
    for (let i = 0; i < 40 && g.player.col !== 5; i++) tick(g, i % 4 === 0 ? press('left') : idleInput());
    expect(g.player.col).toBe(5);
    tick(g, press('down'));
    expect(playerMode(g)).toBe('ChopperHooked');
    for (let i = 0; i < 80 && g.crisis === 'Boat'; i++) tick(g, i === 0 ? press('left') : hold('left'));
    expect(g.score).toBe(2500);
    expect(g.crisis).toBe('None');
    expect(playerMode(g)).toBe('Tank');
    expect(skyPolicy(g)).toBe(false);
  });

  it('the entry Down never hooks, even over the boat', () => {
    const g = boatGame();
    g.player.col = 5;
    tick(g, press('down'));
    run(g, 3, hold('down'));
    expect(playerMode(g)).toBe('ChopperFree');
  });

  it('chopper cap: one column per 4 ticks free; a too-soon tap waits as a pending move', () => {
    const g = boatGame();
    tick(g, press('down'));
    tick(g, tap('right'));
    expect(g.player.col).toBe(9);
    tick(g, tap('right'));
    expect(g.player.col).toBe(9);
    run(g, 2);
    expect(g.player.col).toBe(9);
    tick(g, idleInput());
    expect(g.player.col).toBe(10);
  });

  it('flight budget 9,920: Down on T, forced back to Tank in step 2 of T+165', () => {
    const g = boatGame();
    g.boat!.drownLeft = 100_000; // keep the boat afloat past the budget
    tick(g, press('down'));
    const T = g.tick - 1;
    run(g, 164);
    expect(playerMode(g)).toBe('ChopperFree');
    tick(g, idleInput());
    expect(g.tick - 1).toBe(T + 165);
    expect(playerMode(g)).toBe('Tank');
    expect(fuelSegments(g)).toBe(0);
    tick(g, press('down'));
    expect(playerMode(g)).toBe('Tank'); // budget spent: Down ignored
  });

  it('first Down clears everything below the ceiling; a later Down does not', () => {
    const g = boatGame();
    addJet(g, 'dive', 1, 8);
    addBomb(g, 2, 7).bornTick = -1;
    addBomb(g, 3, 4).bornTick = -1;
    tick(g, press('down'));
    expect(g.jets).toHaveLength(0);
    expect(g.bombs.map((b) => b.col)).toEqual([3]);
    tick(g, press('up'));
    addBomb(g, 4, 8).bornTick = -1;
    tick(g, press('down'));
    expect(g.bombs.some((b) => b.col === 4)).toBe(true);
  });

  it('threats are held at the ceiling while rescuing and never cost a life', () => {
    const g = boatGame();
    addBomb(g, 7, 4).bornTick = -1;
    tick(g, press('down'));
    run(g, 120);
    const b = g.bombs.find((x) => x.col === 7);
    expect(b?.row).toBe(ceilingRow(g));
    expect(g.lives).toBe(3);
  });

  it('speed change: a band-B dive jet at 500/720 rescales to 1333/1920 on Down', () => {
    const g = boatGame();
    const j = addJet(g, 'dive', 1, 2);
    j.acc = 500;
    tick(g, press('down'));
    expect(j.lastInterval).toBe(1920);
    expect(j.acc).toBe(1333 + 60);
  });

  it('speed change round trip in one tick (Down, then budget out) returns to 499', () => {
    const g = boatGame();
    g.flightBudget = 60;
    const j = addJet(g, 'dive', 1, 2);
    j.acc = 500;
    tick(g, press('down'));
    expect(playerMode(g)).toBe('Tank');
    expect(j.lastInterval).toBe(720);
    expect(j.acc).toBe(499 + 60);
  });

  it('drown timer expiry adds a drowned boat; three end the run', () => {
    const g = quietGame(2000);
    for (let n = 1; n <= 3; n++) {
      startBoatCrisis(g, 5, 12, false);
      run(g, 156);
      expect(g.drowned).toBe(n);
    }
    expect(g.gameOver).toBe('DrownedBoats');
  });

  it('a hook on the drown-expiry tick saves the boat', () => {
    const g = boatGame();
    g.player.col = 5;
    tick(g, press('down'));
    g.boat!.drownLeft = 60;
    tick(g, press('down'));
    expect(playerMode(g)).toBe('ChopperHooked');
    expect(g.boat!.drownLeft).toBe(60);
  });

  it('a bomb dropped after the boat spawned sinks it while the player is in the tank', () => {
    const g = boatGame();
    g.player.col = 0;
    tick(g, idleInput());
    const b = addBomb(g, 5, 8);
    b.bornTick = -1;
    for (let i = 0; i < 60 && g.drowned === 0; i++) tick(g, idleInput());
    expect(g.drowned).toBe(1);
    expect(g.crisis).toBe('None');
    expect(g.messages.transients.map((m) => m.text)).toContain('BOAT SUNK');
  });
});

describe('mines and jump (§4 Mines, Tank Jump)', () => {
  function mineGame() {
    const g = quietGame(10000);
    g.crisis = 'Mine';
    g.mine = { col: 3, lifeLeft: 4200, spawnTick: 0 };
    return g;
  }

  it('jump airtime: row 8 on J..J+6, lands on J+7; jump ignored T+1..T+4 after landing', () => {
    const g = quietGame(10000);
    tick(g, press('up'));
    const J = g.tick - 1;
    for (let k = 1; k <= 6; k++) {
      tick(g, idleInput());
      expect(g.player.row).toBe(8);
    }
    tick(g, idleInput());
    expect(g.tick - 1).toBe(J + 7);
    expect(g.player.row).toBe(9);
    for (let k = 1; k <= 4; k++) {
      tick(g, press('up'));
      expect(g.player.row).toBe(9);
    }
    tick(g, press('up'));
    expect(g.player.row).toBe(8);
  });

  it('jumping over a mine clears it once for +200', () => {
    const g = mineGame();
    g.player.col = 4;
    tick(g, press('up'));
    tick(g, press('left'));
    expect(g.score).toBe(10200);
    expect(g.mine).toBeNull();
    expect(g.crisis).toBe('None');
  });

  it('walking into a mine costs a life and ends the crisis; Down is ignored in a mine crisis', () => {
    const g = mineGame();
    g.player.col = 4;
    tick(g, press('down'));
    expect(playerMode(g)).toBe('Tank');
    tick(g, press('left'));
    expect(g.lives).toBe(2);
    expect(g.crisis).toBe('None');
  });

  it('a jump-fired shell starts on row 8 and reaches row 0 in 8 steps', () => {
    const g = quietGame(10000);
    tick(g, press('up', 'fire'));
    expect(g.shell?.row).toBe(8);
    run(g, 8);
    expect(g.shell?.row).toBe(0);
  });
});

describe('side panel (§3 Message rules)', () => {
  it('a transient raised on tick E is drawn through E+15 and gone on E+16', () => {
    const g = quietGame();
    g.shell = { col: 3, row: 1, prevRow: 1, acc: 0, lastInterval: 60, bornTick: -1 };
    addJet(g, 'cross', 3, 0, 1);
    tick(g, idleInput());
    const E = g.tick - 1;
    expect(g.score).toBe(100);
    run(g, 15);
    expect(panelLines(g.messages, [], g.tick - 1)).toContain('+100');
    tick(g, idleInput());
    expect(g.tick - 1).toBe(E + 16);
    expect(panelLines(g.messages, [], g.tick - 1)).not.toContain('+100');
  });
});

// RG-003 — found by the spec review: free movers lost their carry when the accumulator landed on interval − 1.
describe('step carry for movers that are never held (RG-003, invariant 31)', () => {
  it('a band-C cross jet (283 ms) is in column floor(60k/283) for its whole crossing', () => {
    const g = quietGame(5000);
    const j = addJet(g, 'cross', 0, 0, 1);
    j.bornTick = g.tick;
    tick(g, idleInput());
    for (let k = 1; g.jets.includes(j); k++) {
      tick(g, idleInput());
      if (g.jets.includes(j)) expect(j.col, `tick ${k}`).toBe(Math.floor((60 * k) / 283));
    }
  });

  it('the band-C jet spawner (943 ms) spawns every floor(60k/943) without slipping', () => {
    const g = createGame({ seed: 2, level1: false, score: 5000 });
    g.spawner.bornTick = g.tick;
    let spawned = 0;
    for (let k = 0; k <= 600; k++) {
      const before = g.nextId;
      tick(g, idleInput());
      if (g.jets.some((x) => x.id >= before && x.bornTick === g.tick - 1)) spawned++;
      if (g.gameOver) break;
      expect(spawned, `tick ${k}`).toBe(Math.floor((60 * k) / 943));
    }
  });
});

describe('held-back counters (§9, RG-003 companion)', () => {
  it('a bomb held at the ceiling steps once on its stagger slot after the lift, with remainder 0', () => {
    const g = quietGame(2000);
    startBoatCrisis(g, 5, 12, false);
    g.boat!.drownLeft = 100_000;
    const b = addBomb(g, 3, 5);
    b.bornTick = -1;
    tick(g, press('down'));
    run(g, 100); // reaches row 6 and is held there, capped
    expect(b.row).toBe(6);
    expect(b.capped).toBe(true);
    tick(g, press('up')); // lift: stagger slot 0 (only stacked threat)
    let stepTick = -1;
    for (let i = 0; i < 4 && stepTick < 0; i++) {
      if (b.row === 7) stepTick = g.tick - 1;
      else tick(g, idleInput());
    }
    if (b.row === 7 && stepTick < 0) stepTick = g.tick - 1;
    expect(b.row).toBe(7);
    expect(stepTick % 3).toBe(0);
    expect(b.acc).toBe(0);
    run(g, 10);
    expect(b.row).toBe(7);
    tick(g, idleInput()); // one full combat step (660 = 11 ticks) later
    expect(b.row).toBe(8);
  });
});
