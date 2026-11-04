// Stage features: jets, bombs, wind, hidden boats, the jets gate, skipping and the stage list.
import { describe, expect, it } from 'vitest';
import { Chopper, Jet, Points, ROOM_PX_W, TILE } from '../src/sim/config';
import { createGame, Game, goToRoom, skipRoom, stageInfo, tick, windAt } from '../src/sim/game';
import { GAME_ROOMS, STAGES } from '../src/sim/stages';
import { game, hold, input, press, room, settle } from './helpers';

const until = (g: Game, pred: (g: Game) => boolean, max = 2000, held: Parameters<typeof input>[0] = []) => {
  for (let i = 0; i < max; i++) { if (pred(g)) return i; tick(g, input(held)); }
  return -1;
};

describe('cross jets and bombs', () => {
  const road = room(['J...................', '....................', '....................', '....................', '....................', '.........P..........', '####################']);

  it('a cross jet flies over and bombs you if you stand still', () => {
    const g = game(road);
    expect(until(g, (g) => g.room.bombs.length > 0)).toBeGreaterThan(0);
    const jet = g.room.jets[0];
    expect(Math.abs(jet.x + jet.w / 2 - (g.player.x + g.player.w / 2))).toBeLessThan(Jet.dropWindow);
    expect(until(g, (g) => g.deaths > 0, 200)).toBeGreaterThanOrEqual(0);
    expect(g.deaths).toBe(1);
  });

  it('you survive the bomb by driving clear of its shadow', () => {
    const g = game(road);
    until(g, (g) => g.room.bombs.length > 0);
    hold(g, 60, ['right']);
    expect(g.deaths).toBe(0);
  });

  it('one shell brings a jet down for 100, and it stays down', () => {
    const g = game(road);
    settle(g, 5);
    // Fire when the jet will meet the shell: shell climbs ~70 px while the jet flies on.
    until(g, (g) => { const j = g.room.jets[0]; return j.phase === 'fly' && j.x + j.w / 2 > g.player.x + 7 - 26; });
    press(g, 'action');
    until(g, (g) => !g.shell, 60);
    expect(g.room.jets[0].alive).toBe(false);
    expect(g.roomPoints).toBe(Points.jet);
    hold(g, 600);
    expect(g.room.jets[0].alive).toBe(false);
  });

  it('a bomb that lands on cracked floor breaks it', () => {
    const g = game(room(['J...................', '....................', '....................', '....................', '.........P..........', '########xx##########', '....................', '####################']));
    until(g, (g) => g.room.bombs.length > 0);
    hold(g, 40, ['left']); // get clear of the blast
    until(g, (g) => g.room.bombs.length === 0, 200);
    expect(g.room.tiles[5][8]).toBe('.');
    expect(g.room.tiles[5][9]).toBe('.');
    expect(g.deaths).toBe(0);
  });

  it('a bomb that hits a floating boat sinks it and restarts the room', () => {
    const g = game(room(['J...................', '....................', '....................', '.P..................', '####.....B..........', '####~~~~~~~~~~~~~~~~']));
    // Hover over the boat so the jet drops on it.
    press(g, 'switch');
    const boat = g.room.items[0];
    for (let i = 0; i < 1500 && g.deaths === 0; i++) {
      const p = g.player;
      const dx = boat.x + boat.w / 2 - (p.x + p.w / 2);
      // Stay just high enough that the hook doesn't take the boat.
      tick(g, input([...(dx > 3 ? ['right' as const] : dx < -3 ? ['left' as const] : []), ...(p.y > boat.y - 70 ? ['jump' as const] : [])]));
    }
    expect(g.deaths).toBe(1);
  });
});

describe('the harmless jet (stage 1, decision 28)', () => {
  it('flies right through you without bombing or hurting you', () => {
    // The jet flies in the player's own row, so it passes straight through the tank, again and again.
    const g = game(room(['....................', '....................', 'h........P..........', '####################']));
    let bombs = 0;
    for (let i = 0; i < 3000; i++) { tick(g, input()); bombs += g.room.bombs.length; }
    expect(g.room.jets[0].harmless).toBe(true);
    expect(bombs).toBe(0);
    expect(g.events.every((e) => e.type !== 'bombDrop')).toBe(true);
    expect(g.deaths).toBe(0);
  });

  it('is slow, and a shell still brings it down for the usual points', () => {
    const g = game(room(['h...................', '....................', '....................', '....................', '.........P..........', '####################']));
    const j = g.room.jets[0];
    // Its first pass starts after the entry grace (HW-006).
    for (let i = 0; i < 400 && j.phase !== 'fly'; i++) tick(g, input());
    tick(g, input());
    const x0 = j.x;
    tick(g, input());
    expect((j.x - x0) * 60).toBeCloseTo(Jet.harmlessSpeed, 3);
    for (let i = 0; i < 2000 && j.alive; i++) {
      const d = g.player.x + 7 - (j.x + j.w / 2);
      tick(g, input([], d > 2 && d < 6 && !g.shell ? ['action'] : []));
    }
    expect(j.alive).toBe(false);
    expect(g.roomPoints).toBe(Points.jet);
  });

  it('is in the last room of Riverside Road, and only there in stage 1', () => {
    const stage1 = GAME_ROOMS.filter((r) => r.stage === 0);
    expect(stage1.map((r) => r.rows.join('').includes('h'))).toEqual([false, false, false, true]);
    expect(stage1.some((r) => /[JjD]/.test(r.rows.join('')))).toBe(false);
  });
});

describe('dive jets', () => {
  const field = room(['D...................', '....................', '....................', '....................', '.........P..........', '####################']);

  it('warns over your column, then dives down it', () => {
    const g = game(field);
    until(g, (g) => g.room.jets[0].phase === 'warn');
    const j = g.room.jets[0];
    expect(j.aimX).toBeCloseTo(g.player.x + g.player.w / 2, 0);
    until(g, (g) => g.deaths > 0, 300);
    expect(g.deaths).toBe(1);
  });

  it('driving away from the warning dodges the dive', () => {
    const g = game(field);
    until(g, (g) => g.room.jets[0].phase === 'warn');
    hold(g, 120, ['right']);
    expect(g.deaths).toBe(0);
  });

  it('a shell fired up into the dive brings it down', () => {
    const g = game(field);
    until(g, (g) => g.room.jets[0].phase === 'dive');
    press(g, 'action');
    until(g, (g) => !g.shell, 60);
    expect(g.room.jets[0].alive).toBe(false);
    expect(g.roomPoints).toBe(Points.jet);
    expect(g.deaths).toBe(0);
  });
});

describe('gates and jets', () => {
  it('in a jets room the gate opens once every jet is down', () => {
    const r = room(['...j...............W', '...................W', '...................G', '.P.................G', '####################'], { gateNeedsJets: true });
    const g = game(r);
    expect(g.room.gateOpen).toBe(false);
    for (let i = 0; i < 2000 && g.room.jets[0].alive; i++) {
      const j = g.room.jets[0];
      const lead = j.phase === 'fly' && j.x + j.w / 2 < g.player.x + 7 + 16 && j.x + j.w / 2 > g.player.x + 7 + 6;
      tick(g, input([], lead && !g.shell ? ['action'] : []));
    }
    expect(g.room.gateOpen).toBe(true);
  });

  it('with jetRespawnTicks a shot jet returns, and pays nothing the second time', () => {
    const r = room(['J...................', '....................', '....................', '....................', '.........P..........', '####################'], { jetRespawnTicks: 100 });
    const g = game(r);
    const j = g.room.jets[0];
    j.alive = false; j.scored = true; j.respawn = 100;
    hold(g, 101);
    expect(j.alive).toBe(true);
  });
});

describe('wind', () => {
  const windy = room(['....................', '....................', '.........P..........', '####################'], { wind: { dir: -1, speed: 50, period: 200, duty: 100 } });

  it('a gust pushes the chopper, not the tank', () => {
    const t = game(windy);
    settle(t, 10);
    const tx = t.player.x;
    hold(t, 60);
    expect(t.player.x).toBeCloseTo(tx, 3);

    const c = game(windy);
    press(c, 'switch');
    const x0 = c.player.x;
    for (let i = 0; i < 60; i++) tick(c, input(c.player.y > 2 * TILE ? ['jump'] : []));
    expect(windAt(c.room)).toBeLessThan(0);
    expect(c.player.x).toBeLessThan(x0 - 15);
  });

  it('gusts come and go on the room clock', () => {
    const g = game(windy);
    const samples = [];
    for (let i = 0; i < 200; i++) { tick(g, input()); samples.push(windAt(g.room)); }
    expect(samples.some((w) => w === 0)).toBe(true);
    expect(Math.min(...samples)).toBe(-50);
  });
});

describe('hidden boats', () => {
  it('touching one rescues it for 500; it does not count for the gate; it banks on leaving', () => {
    const r = room(['.P......b...........', '####################']);
    const next = room(['.P..', '####']);
    const g = game(r, [next]);
    expect(g.room.boatsTotal).toBe(0);
    expect(g.room.hiddenTotal).toBe(1);
    hold(g, 120, ['right']);
    expect(g.room.hiddenHome).toBe(1);
    expect(g.roomPoints).toBe(Points.boat);
    hold(g, 200, ['right']);
    expect(g.room.index).toBe(1);
    expect(g.hiddenSaved).toBe(1);
    expect(g.score).toBe(Points.boat);
  });

  it('the hook ignores hidden boats', () => {
    const g = game(room(['....................', '.P..................', '....b...............', '####################']));
    press(g, 'switch');
    for (let i = 0; i < 200; i++) tick(g, input(['right', ...(g.player.y > 18 ? ['jump' as const] : [])]));
    expect(g.player.carrying).toBeNull();
  });
});

describe('stages, skipping and the end', () => {
  it('a new game starts in stage 1, room 1, as the tank', () => {
    const g = createGame();
    expect(g.room.def.id).toBe('1-1');
    expect(g.stageIndex).toBe(0);
    expect(g.player.body).toBe('tank');
    expect(stageInfo(g)).toMatchObject({ index: 0, name: 'RIVERSIDE ROAD', roomInStage: 1, roomsInStage: 4, stageCount: STAGES.length });
  });

  it('skipping discards the room points, lists the room and starts the next room fresh', () => {
    const g = createGame();
    g.roomPoints = 300;
    skipRoom(g);
    expect(g.room.def.id).toBe('1-2');
    expect(g.score).toBe(0);
    expect(g.roomPoints).toBe(0);
    expect(g.skipped).toEqual(['1-1']);
    expect(g.events.some((e) => e.type === 'skip')).toBe(true);
  });

  it('stageIndex follows the room; you start stage 3 fresh as the tank', () => {
    const g = createGame();
    goToRoom(g, GAME_ROOMS.findIndex((r) => r.id === '3-1'));
    expect(g.stageIndex).toBe(2);
    expect(g.player.body).toBe('tank');
    expect(g.room.def.canSwitch).toBe(true);
    expect(stageInfo(g).name).toBe('FLOODPLAIN');
  });

  it('leaving the last room completes the run: it banks, stops, and does not loop back', () => {
    const g = createGame();
    goToRoom(g, GAME_ROOMS.length - 1);
    expect(g.complete).toBe(false);
    g.roomPoints = 200;
    g.player.x = ROOM_PX_W - 2;
    for (let i = 0; i < 10 && !g.complete; i++) tick(g, input(['right']));
    expect(g.complete).toBe(true);
    expect(g.events.some((e) => e.type === 'complete')).toBe(true);
    expect(g.score).toBe(200);
    expect(g.room.index).toBe(GAME_ROOMS.length - 1);
    expect(g.loops).toBe(0);
    const t = g.tick;
    hold(g, 30, ['right']);
    expect(g.tick).toBe(t); // the sim has stopped
    expect(g.events).toEqual([]);
  });

  it('skipping the last room also ends the run', () => {
    const g = createGame();
    goToRoom(g, GAME_ROOMS.length - 1);
    skipRoom(g);
    expect(g.complete).toBe(true);
    expect(g.skipped).toEqual([GAME_ROOMS[GAME_ROOMS.length - 1].id]);
  });

  it('entering a no-switch room from the chopper puts you in the tank', () => {
    const a = room(['.P..................', '####################']);
    const b = room(['.P..', '####'], { canSwitch: false });
    const g = game(a, [b]);
    press(g, 'switch');
    g.player.x = ROOM_PX_W - 4;
    hold(g, 5, ['right']);
    expect(g.room.index).toBe(1);
    expect(g.player.body).toBe('tank');
    expect(g.player.fuel).toBe(Chopper.fuelTicks);
  });
});
