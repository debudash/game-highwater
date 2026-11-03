// Random-input fuzz bot with per-tick invariants (pattern kept from River Guard v1).
import { describe, expect, it } from 'vitest';
import { Chopper, ROOM_PX_W } from '../src/sim/config';
import { createGame, isSolidTile, tick } from '../src/sim/game';
import { BUTTONS, Button, noButtons } from '../src/sim/input';
import { RoomDef, TEST_ROOMS, validateRoom } from '../src/sim/rooms';
import { GAME_ROOMS } from '../src/sim/stages';

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

describe('rooms', () => {
  it('every room is well formed', () => {
    for (const r of [...TEST_ROOMS, ...GAME_ROOMS]) expect(validateRoom(r), r.id).toEqual([]);
  });
});

/** Random play from a start, checking the invariants every tick. */
function fuzz(seed: number, ticks: number, rooms: RoomDef[], startRoom: number): void {
      const rnd = lcg(seed);
      const g = createGame({ rooms, startRoom });
      let score = 0;
      const held = noButtons();
      for (let t = 0; t < ticks; t++) {
        const press = noButtons();
        for (const b of BUTTONS) {
          if (rnd() < 0.08) {
            const was = held[b];
            held[b] = !was;
            if (!was) press[b as Button] = true;
          }
        }
        if (rnd() < 0.3) held.right = true; // drift forward so the bot sees every room
        tick(g, { press, held: { ...held } });

        const p = g.player;
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(p.fuel).toBeGreaterThanOrEqual(0);
        expect(p.fuel).toBeLessThanOrEqual(Chopper.fuelTicks);
        expect(p.x).toBeGreaterThanOrEqual(-0.001);
        expect(p.x + p.w / 2).toBeLessThanOrEqual(ROOM_PX_W + 0.001);
        if (p.carrying) expect(p.body).toBe('chopper');
        expect(g.score).toBeGreaterThanOrEqual(score);
        score = g.score;
        for (const b of g.room.bombs) expect(Number.isFinite(b.y)).toBe(true);
        for (const j of g.room.jets) expect(Number.isFinite(j.x) && Number.isFinite(j.y)).toBe(true);
        if (!g.room.def.canSwitch) expect(p.body).toBe(g.room.def.startBody ?? 'tank');
        // Never inside a solid tile (check the hitbox corners, 0.5 px inside).
        if (p.deadTicks === 0) {
          for (const [x, y] of [[p.x + 0.5, p.y + 0.5], [p.x + p.w - 0.5, p.y + 0.5], [p.x + 0.5, p.y + p.h - 0.5], [p.x + p.w - 0.5, p.y + p.h - 0.5]]) {
            expect(isSolidTile(g.room, Math.floor(x / 16), Math.floor(y / 16)), `tick ${t} at ${x},${y}`).toBe(false);
          }
        }
      }
}

describe('fuzz', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    it(`seed ${seed}: 20,000 random ticks through the game keep every invariant`, () => fuzz(seed, 20_000, GAME_ROOMS, (seed * 3) % GAME_ROOMS.length));
  }
  it('the feel-check rooms: 20,000 random ticks', () => fuzz(7, 20_000, TEST_ROOMS, 0));
  for (const def of GAME_ROOMS) {
    it(`${def.id}: 5,000 random ticks in the room`, () => fuzz(def.id.charCodeAt(0) * 31 + def.id.charCodeAt(2), 5_000, [def], 0));
  }
});
