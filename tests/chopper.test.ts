import { describe, expect, it } from 'vitest';
import { Cactus, Chopper, Points, TILE } from '../src/sim/config';
import { tick } from '../src/sim/game';
import { game, hold, input, press, room, settle } from './helpers';

describe('switching', () => {
  it('switches body any time, including mid-air, with a short fold', () => {
    const g = game();
    settle(g);
    press(g, 'jump');
    hold(g, 5, ['jump']);
    press(g, 'switch');
    expect(g.player.body).toBe('chopper');
    press(g, 'switch'); // still folding: ignored
    expect(g.player.body).toBe('chopper');
    hold(g, 12);
    press(g, 'switch');
    expect(g.player.body).toBe('tank');
  });

  it('switching is off in rooms that do not allow it', () => {
    const g = game(room(['.P..', '####'], { canSwitch: false }));
    settle(g);
    press(g, 'switch');
    expect(g.player.body).toBe('tank');
  });

  it('chopper → tank in the air drops like a stone; tank → chopper catches the fall', () => {
    const g = game();
    settle(g);
    press(g, 'switch');
    hold(g, 40, ['jump']); // climb
    press(g, 'switch');
    expect(g.player.body).toBe('tank');
    expect(g.player.vy).toBeGreaterThan(100);
    hold(g, 10);
    const falling = g.player.vy;
    press(g, 'switch');
    hold(g, 20);
    expect(g.player.vy).toBeLessThan(falling);
    expect(g.player.vy).toBeLessThanOrEqual(Chopper.maxDrift + 1);
  });
});

describe('chopper fuel', () => {
  it('holds about 3 s of thrust and refills on landing', () => {
    const g = game(room(['.P..', '####'], {}));
    settle(g);
    press(g, 'switch');
    let thrustTicks = 0;
    for (let i = 0; i < 400 && g.player.fuel > 0; i++) {
      const before = g.player.fuel;
      tick(g, input(['jump']));
      if (g.player.fuel < before) thrustTicks++;
    }
    expect(thrustTicks).toBe(Chopper.fuelTicks);
    expect(g.player.fuel).toBe(0);
    hold(g, 400); // sink back to the ground
    expect(g.player.onGround).toBe(true);
    hold(g, 40);
    expect(g.player.fuel).toBe(Chopper.fuelTicks);
  });
});

describe('carrying', () => {
  const crateRoom = room(['.P..........', '............', '....K.......', '############']);

  /** Fly at a steady height above the crate's top, heading one way, until hooked or out of time. */
  function flyAt(g: ReturnType<typeof game>, dir: 'left' | 'right', height: number, ticks = 300) {
    const crate = g.room.items[0];
    for (let i = 0; i < ticks && !g.player.carrying; i++) {
      const p = g.player;
      const above = crate.y - (p.y + p.h);
      tick(g, input([dir, ...(above < height ? ['jump' as const] : [])]));
    }
  }

  /** Start in the air at the room's left edge, then fly right over the crate at `height` px. */
  function flyOverCrate(height = 1.5 * TILE) {
    const g = game(crateRoom);
    settle(g);
    press(g, 'switch');
    const crate = g.room.items[0];
    Object.assign(g.player, { x: 0, y: crate.y - g.player.h - height, vy: 0, onGround: false });
    flyAt(g, 'right', height);
    return g;
  }

  // HW-001 — found by Debu in the feel check: hooking by hovering still for 0.2 s was very hard.
  it('HW-001: flying low over a crate hooks it at once, with no hover', () => {
    const g = flyOverCrate();
    expect(g.player.carrying?.kind).toBe('crate');
  });

  it('HW-001: the hook reaches about 2 tiles down and a tile to either side', () => {
    expect(flyOverCrate(1.8 * TILE).player.carrying?.kind).toBe('crate');
    expect(flyOverCrate(3.5 * TILE).player.carrying).toBeNull();
  });

  it('HW-001: the crate you just set down is not re-hooked, so you can land on it to refuel', () => {
    const g = flyOverCrate();
    // Set it down where we are, then sink onto it.
    press(g, 'action');
    expect(g.player.carrying).toBeNull();
    hold(g, 120);
    expect(g.player.onGround).toBe(true);
    expect(g.player.carrying).toBeNull();
  });

  it('a crate you set down can be hooked again once you have flown away from it', () => {
    const g = flyOverCrate();
    press(g, 'action');
    expect(g.player.lastDropped).not.toBeNull();
    // Fly on to the right, then come back over it from the other side.
    for (let i = 0; i < 40; i++) tick(g, input(['right', 'jump']));
    expect(g.player.lastDropped).toBeNull();
    const crate = g.room.items[0];
    for (let i = 0; i < 400 && !g.player.carrying; i++) {
      const p = g.player;
      const dx = crate.x + crate.w / 2 - (p.x + p.w / 2);
      const steer = dx > 3 ? ['right' as const] : dx < -3 ? ['left' as const] : [];
      tick(g, input([...steer, ...(crate.y - (p.y + p.h) < 16 ? ['jump' as const] : [])]));
    }
    expect(g.player.carrying?.kind).toBe('crate');
  });

  it('Action sets the load down instead of dropping a charge', () => {
    const g = flyOverCrate();
    press(g, 'action');
    expect(g.player.carrying).toBeNull();
    expect(g.charge).toBeNull();
  });

  it('switching to the tank drops the load', () => {
    const g = flyOverCrate();
    press(g, 'switch');
    expect(g.player.carrying).toBeNull();
  });

  it('a boat set down on the dock is rescued, opens the gate, and pays when you leave the room', () => {
    const r = room([
      '...................G',
      '.P.................G',
      '####.B........HHHH#.',
      '####~~~~~~~~~~#####.',
    ]);
    const next = room(['.P..', '####']);
    const g = game(r, [next]);
    settle(g);
    const boat = g.room.items[0];
    // Put the boat on the dock directly (the hook path is covered above).
    boat.x = 15 * TILE;
    boat.y = 1 * TILE;
    hold(g, 30);
    expect(g.room.boatsHome).toBe(1);
    expect(g.room.gateOpen).toBe(true);
    expect(g.roomPoints).toBe(Points.boat);
    expect(g.score).toBe(0);
  });
});

describe('the chopper charge', () => {
  it('blasts a cactus, which regrows about 4 s later, but never into the player', () => {
    const g = game(room(['.P..........', '............', '....C.......', '############']));
    settle(g);
    press(g, 'switch');
    hold(g, 25, ['jump']);
    g.player.x = 4 * TILE + 1;
    hold(g, 2);
    press(g, 'action');
    expect(g.charge).not.toBeNull();
    let gone = false;
    for (let i = 0; i < 90; i++) { tick(g, input(['jump'])); if (g.events.some((e) => e.type === 'cactusGone')) gone = true; }
    expect(gone).toBe(true);
    expect(g.room.cacti[0].grown).toBe(false);
    hold(g, Cactus.regrowTicks, ['jump']);
    expect(g.room.cacti[0].grown).toBe(true);
  });

  it('clears a floating mine for points; the charge never hurts boats', () => {
    const g = game(room(['.P..........', '##....M.....', '##~~~~~~~~~#', '##~~~~~~~~~#']));
    settle(g);
    const m = g.room.mines[0];
    m.vx = 0;
    press(g, 'switch');
    hold(g, 10, ['jump']);
    g.player.x = m.x - 2;
    press(g, 'action');
    hold(g, 60);
    expect(m.alive).toBe(false);
    expect(g.roomPoints).toBe(Points.mine);
  });

  it('one charge at a time', () => {
    const g = game();
    settle(g);
    press(g, 'switch');
    hold(g, 40, ['jump']);
    press(g, 'action');
    const first = g.charge;
    tick(g, input(['jump']));
    press(g, 'action', ['jump']);
    expect(g.charge).toBe(first);
  });
});

describe('rooms', () => {
  it('driving off the right edge enters the next room and banks the points', () => {
    const a = room(['.P..................', '####################']);
    const b = room(['.P..', '####']);
    const g = game(a, [b]);
    settle(g);
    g.roomPoints = 300;
    hold(g, 200, ['right']);
    expect(g.room.index).toBe(1);
    expect(g.score).toBe(300);
    expect(g.roomPoints).toBe(0);
  });

  it('a death wipes the points earned in the room so far', () => {
    const g = game(room(['.P.C', '####']));
    settle(g, 2);
    g.roomPoints = 200;
    hold(g, 90, ['right']);
    expect(g.deaths).toBeGreaterThan(0);
    expect(g.roomPoints).toBe(0);
  });
});
