// Rooms are plain text maps: 20 columns × 10 rows of 16 px tiles (design: "rooms are plain text maps in code").
//
// Legend
//   .  air                     #  ground (solid)            H  dock (solid; set a boat down here)
//   ~  water (fatal; crates and boats float on it)          x  cracked floor (solid until a charge breaks it)
//   =  drawbridge (solid once the room's target is hit)     G  castle gate (solid until the room's boats are home)
//   T  target (hit it from below with a shell)              C  cactus (sits on the tile below; lethal)
//   K  crate                   B  boat                      M  floating mine (patrols the water surface)
//   P  player start            W  castle wall (solid stone; sits above a gate so the gate is a door)
//   b  hidden boat (stranded on land off the main path; found by touching it; not needed for the gate)
//   J  cross jet flying right  j  cross jet flying left (it flies at its row; its column staggers its first pass)
//   D  dive jet (warns over you, then dives straight down your column; its column staggers its first dive)
//   h  harmless jet (a slow cross jet flying right that drops nothing and can't hurt you; stage 1's taste)
//
// A room exits through its right edge. The last room of a list loops back to the first.

import { ROOM_H, ROOM_W } from './config';

export interface RoomDef {
  id: string;
  /** Shown on the HUD plaque. */
  name: string;
  /** Lighting preset for the view. */
  light: 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night' | 'dawn';
  /** Switching between tank and chopper is allowed here. */
  canSwitch: boolean;
  /** One-line prompts the view shows, anchored at a tile. `{jump}` etc. become the player's keys. */
  prompts: { col: number; row: number; text: string }[];
  rows: string[];
  /** Index into STAGES; set by stages.ts. Test rooms leave it unset. */
  stage?: number;
  /** The body you start in when you enter fresh (new game, respawn after a skip). Default tank. */
  startBody?: 'tank' | 'chopper';
  /** Stage 5 gusts: blow `dir` at `speed` px/s for `duty` ticks of every `period` (offset shifts the start). */
  wind?: { dir: 1 | -1; speed: number; period: number; duty: number; offset?: number };
  /** The gate also needs every jet in the room shot down (the jet-alley teaching room). */
  gateNeedsJets?: boolean;
  /**
   * Shot jets come back after this many ticks (no points the second time). For rooms that need a
   * jet's bomb, so shooting the jet first can't leave you stuck.
   */
  jetRespawnTicks?: number;
}

/** The feel-check test rooms (Tuesday build). Room 1 is the plain test room, room 2 the style frame. */
export const TEST_ROOMS: RoomDef[] = [
  {
    id: 'test-1',
    name: 'TEST ROOM - TANK',
    light: 'morning',
    canSwitch: true,
    prompts: [
      { col: 1, row: 4, text: '{left}{right} MOVE   {jump} JUMP' },
      { col: 12, row: 1, text: '{action} FIRE UP' },
    ],
    rows: [
      '....................',
      '....................',
      '....................',
      '...........T........',
      '....................',
      '....................',
      '.........##.........',
      '.P...C...##.........',
      '########.###===#####',
      '########.###...#####',
    ],
  },
  {
    id: 'test-2',
    name: 'TEST ROOM - CHOPPER',
    light: 'afternoon',
    canSwitch: true,
    prompts: [
      { col: 1, row: 2, text: '{switch} SWITCH' },
      { col: 5, row: 1, text: 'FLY LOW OVER IT TO HOOK' },
      { col: 12, row: 2, text: '{action} DROP / SET DOWN' },
    ],
    rows: [
      '...................W',
      '...................W',
      '...................W',
      '...................W',
      '...................W',
      '...........C.......G',
      '.P.K.......#.......G',
      '#####....B.#.M..HHH#',
      '#####~~~~~~#~~~~####',
      '#####~~~~~~#~~~~####',
    ],
  },
];

/** Every character a room map may use (see the legend above). */
export const ROOM_CHARS = '.#H~x=GTCKBMPWbJjDh';

export function validateRoom(def: RoomDef): string[] {
  const errs: string[] = [];
  if (def.rows.length !== ROOM_H) errs.push(`${def.id}: ${def.rows.length} rows, expected ${ROOM_H}`);
  def.rows.forEach((r, i) => {
    if (r.length !== ROOM_W) errs.push(`${def.id}: row ${i} has ${r.length} columns, expected ${ROOM_W}`);
    const bad = [...r].filter((c) => !ROOM_CHARS.includes(c));
    if (bad.length) errs.push(`${def.id}: row ${i} has unknown tiles ${bad.join('')}`);
  });
  const starts = def.rows.join('').split('P').length - 1;
  if (starts !== 1) errs.push(`${def.id}: ${starts} player starts, expected 1`);
  // A gate is a door: anything above its top must be castle wall up to the top of the room.
  def.rows.forEach((r, row) => [...r].forEach((ch, col) => {
    if (ch !== 'G' || def.rows[row - 1]?.[col] === 'G') return;
    for (let up = row - 1; up >= 0; up--) {
      if (def.rows[up][col] !== 'W') { errs.push(`${def.id}: gate at col ${col} needs castle wall W above it`); break; }
    }
  }));
  return errs;
}
