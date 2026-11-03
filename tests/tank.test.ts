import { describe, expect, it } from 'vitest';
import { Tank, TILE } from '../src/sim/config';
import { tick } from '../src/sim/game';
import { FLAT, game, hold, input, press, room, settle } from './helpers';

describe('tank movement', () => {
  it('reaches top speed and stops quickly', () => {
    const g = game();
    settle(g);
    hold(g, 60, ['right']);
    expect(g.player.vx).toBeCloseTo(Tank.maxSpeed);
    hold(g, 8);
    expect(g.player.vx).toBe(0);
  });

  it('a held jump rises about 3 tiles; a tapped jump is clearly lower', () => {
    const full = game();
    settle(full);
    const y0 = full.player.y;
    press(full, 'jump');
    let top = y0;
    for (let i = 0; i < 60; i++) { tick(full, input(['jump'])); top = Math.min(top, full.player.y); }
    const fullHeight = y0 - top;
    expect(fullHeight).toBeGreaterThan(2.7 * TILE);
    expect(fullHeight).toBeLessThan(3.3 * TILE);

    const tap = game();
    settle(tap);
    press(tap, 'jump');
    let tapTop = y0;
    for (let i = 0; i < 60; i++) { tick(tap, input()); tapTop = Math.min(tapTop, tap.player.y); }
    expect(y0 - tapTop).toBeLessThan(fullHeight * 0.6);
  });

  it('coyote time: a jump up to 100 ms after leaving a ledge still works, later does not', () => {
    const ledge = room(['P...', '###.', '###.', '###.', '###.', '###.', '###.', '###.', '###.']);
    const run = (late: number) => {
      const g = game(ledge);
      settle(g);
      g.player.x = 3 * TILE - g.player.w - 1; // at the ledge's edge
      g.player.vx = Tank.maxSpeed;
      let off = -1;
      for (let i = 0; i < 40 && off < 0; i++) {
        tick(g, input(['right']));
        if (!g.player.onGround) off = i;
      }
      hold(g, late - 1, ['right']);
      const before = g.player.vy;
      press(g, 'jump', ['right']);
      return g.player.vy < 0 && before >= 0;
    };
    expect(run(Tank.coyoteTicks)).toBe(true);
    expect(run(Tank.coyoteTicks + 2)).toBe(false);
  });

  it('jump buffer: a press up to 120 ms before landing jumps on landing', () => {
    const run = (early: number) => {
      const g = game(FLAT);
      settle(g);
      g.player.y -= 40; // drop from the air, with no coyote time left
      g.player.vy = 0;
      g.player.onGround = false;
      g.player.coyote = 0;
      let landTick = 0;
      const trace = game(FLAT);
      settle(trace);
      trace.player.y -= 40; trace.player.vy = 0; trace.player.onGround = false; trace.player.coyote = 0;
      while (!trace.player.onGround) { tick(trace, input()); landTick++; }
      hold(g, landTick - early);
      press(g, 'jump');
      let jumped = false;
      for (let i = 0; i < early + 3; i++) { tick(g, input()); if (g.player.vy < 0) jumped = true; }
      return jumped;
    };
    expect(run(Tank.bufferTicks - 1)).toBe(true);
    expect(run(Tank.bufferTicks + 4)).toBe(false);
  });

  it('fires one shell at a time, straight up', () => {
    const g = game();
    settle(g);
    press(g, 'action');
    expect(g.shell).not.toBeNull();
    const x = g.shell!.x;
    tick(g, input());
    press(g, 'action');
    expect(g.shell!.x).toBe(x);
    expect(g.events.some((e) => e.type === 'fire')).toBe(false);
    hold(g, 5);
    expect(g.shell!.x).toBe(x);
  });

  it('a shell that hits the room target lowers the drawbridge', () => {
    const g = game(room(['.T..', '....', '....', '....', '.P..', '####']));
    settle(g);
    g.player.x = TILE + 1;
    press(g, 'action');
    let lowered = false;
    for (let i = 0; i < 60; i++) { tick(g, input()); if (g.events.some((e) => e.type === 'bridgeDown')) lowered = true; }
    expect(lowered).toBe(true);
    expect(g.room.bridgesDown).toBe(true);
  });

  it('water is fatal to the tank, and you respawn at the room start 0.4 s later with the room reset', () => {
    const g = game(room(['.P..', '##~~', '##~~']));
    settle(g, 5);
    for (let i = 0; i < 90 && g.deaths === 0; i++) tick(g, input(['right']));
    expect(g.deaths).toBe(1);
    expect(g.events.some((e) => e.type === 'death' && e.cause === 'water')).toBe(true);
    hold(g, 23);
    expect(g.player.deadTicks).toBe(1);
    hold(g, 1);
    expect(g.player.deadTicks).toBe(0);
    expect(g.player.x).toBeLessThan(2 * TILE);
  });

  it('a cactus is lethal', () => {
    const g = game(room(['.P.C', '####']));
    settle(g, 5);
    for (let i = 0; i < 90 && g.deaths === 0; i++) tick(g, input(['right']));
    expect(g.deaths).toBe(1);
    expect(g.events.some((e) => e.type === 'death' && e.cause === 'cactus')).toBe(true);
  });
});
