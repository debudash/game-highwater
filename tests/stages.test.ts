// The stage list: every room is well formed and the stages follow the design's shape.
import { describe, expect, it } from 'vitest';
import { GAME_ROOMS, STAGES } from '../src/sim/stages';
import { validateRoom } from '../src/sim/rooms';

describe('stages', () => {
  it('every stage room is well formed', () => {
    for (const r of GAME_ROOMS) expect(validateRoom(r), r.id).toEqual([]);
  });

  it('five stages of four rooms, then the Bomber slot', () => {
    expect(STAGES.map((s) => s.rooms.length)).toEqual([4, 4, 4, 4, 4, 0]);
    expect(STAGES[5].name).toBe('THE BOMBER');
  });

  it('switching unlocks in stage 3', () => {
    expect(STAGES.map((s) => s.canSwitch)).toEqual([false, false, true, true, true, true]);
  });

  it('room ids are unique', () => {
    expect(new Set(GAME_ROOMS.map((r) => r.id)).size).toBe(GAME_ROOMS.length);
  });

  it('boats: 2 required in each of stages 3 to 5, 5 hidden in all', () => {
    const count = (stage: number, ch: string) =>
      GAME_ROOMS.filter((r) => r.stage === stage).reduce((n, r) => n + r.rows.join('').split(ch).length - 1, 0);
    expect([0, 1, 2, 3, 4].map((s) => count(s, 'B'))).toEqual([0, 0, 2, 2, 2]);
    expect([0, 1, 2, 3, 4].reduce((n, s) => n + count(s, 'b'), 0)).toBe(5);
  });
});
