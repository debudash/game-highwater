// The game's stages (design: "Stages"). Each stage has one idea: it first appears in a room where it
// is hard to get hurt, is then tested, then combined with what came before. Rooms are text maps
// (legend in rooms.ts). Every room has a bot solution in tests/bots.ts that runs as a test, and the
// same recording drives the ghost hint (src/sim/ghosts.json).
//
// Gates are doors (decision 27): two tiles of G at ground level with castle wall W above.

import type { RoomDef } from './rooms';

export type LightName = RoomDef['light'];

export interface StageDef {
  id: string;
  name: string;
  light: LightName;
  /** Stage 3 on: the tank can fold into the chopper. */
  canSwitch: boolean;
  rooms: Omit<RoomDef, 'stage' | 'light' | 'canSwitch'>[];
}

const RIVERSIDE: StageDef = {
  id: 'riverside', name: 'RIVERSIDE ROAD', light: 'morning', canSwitch: false,
  rooms: [
    {
      id: '1-1', name: 'THE ROAD',
      prompts: [
        { col: 1, row: 3, text: '{left}{right} DRIVE' },
        { col: 6, row: 2, text: '{jump} JUMP  (HOLD FOR HIGHER)' },
      ],
      rows: [
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '...........##.......',
        '.P.....#...##.......',
        '###..#######..######',
        '####################',
      ],
    },
    {
      id: '1-2', name: 'CACTUS PATCH',
      prompts: [{ col: 2, row: 3, text: 'JUMP THE CACTI AND THE GAPS' }],
      rows: [
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '.P....C........C....',
        '##########..########',
        '##########..########',
      ],
    },
    {
      id: '1-3', name: 'DRAWBRIDGE',
      prompts: [
        { col: 1, row: 1, text: '{action} FIRE UP AT THE TARGET' },
        { col: 12, row: 1, text: 'IT LOWERS THE BRIDGE' },
      ],
      rows: [
        '....................',
        '....................',
        '....................',
        '......T...b.........',
        '..........##........',
        '....................',
        '..............#.....',
        '.P............#.....',
        '########======######',
        '########~~~~~~######',
      ],
    },
    {
      id: '1-4', name: 'HIGH TARGET',
      // Decision 28: one harmless jet, a first taste before Jet Alley. Shooting it is optional.
      prompts: [
        { col: 1, row: 4, text: 'JUMP, AND FIRE IN MID-AIR' },
        { col: 10, row: 1, text: 'A JET! SHOOT IT FOR 100' },
      ],
      rows: [
        'h...................',
        '....................',
        '.......T............',
        '....................',
        '....................',
        '....................',
        '....................',
        '.P..................',
        '######...###======##',
        '######~~~###~~~~~~##',
      ],
    },
  ],
};

const JET_ALLEY: StageDef = {
  id: 'jetalley', name: 'JET ALLEY', light: 'noon', canSwitch: false,
  rooms: [
    {
      id: '2-1', name: 'JET ALLEY', gateNeedsJets: true,
      prompts: [
        { col: 1, row: 4, text: '{action} SHOOT THE JET DOWN' },
        { col: 9, row: 5, text: 'IT DROPS BOMBS ON YOU' },
      ],
      rows: [
        '...................W',
        '...................W',
        '..j................W',
        '...................W',
        '...................W',
        '...................W',
        '...................G',
        '.P.................G',
        '####################',
        '####################',
      ],
    },
    {
      id: '2-2', name: 'BOMBING RUN',
      prompts: [{ col: 1, row: 4, text: 'WATCH FOR BOMB SHADOWS' }],
      rows: [
        '....................',
        'J...................',
        '....................',
        '..........T.........',
        '....................',
        '....................',
        '....................',
        '.P....C.............',
        '###########======###',
        '###########~~~~~~###',
      ],
    },
    {
      id: '2-3', name: 'DIVE JETS',
      prompts: [{ col: 6, row: 2, text: 'KEEP MOVING: DIVE JETS AIM AT YOU' }],
      rows: [
        '.....D.....D........',
        '....................',
        '....................',
        '..b.................',
        '.###................',
        '....................',
        '......##............',
        '.P....##............',
        '#########..######..#',
        '#########..######..#',
      ],
    },
    {
      id: '2-4', name: 'CRACKED ROAD', jetRespawnTicks: 240,
      prompts: [
        { col: 1, row: 2, text: 'LURE A BOMB ONTO THE CRACK' },
        { col: 1, row: 3, text: 'THEN GET CLEAR' },
      ],
      rows: [
        '.............#......',
        'J............#......',
        '.............#......',
        '.............#......',
        '.............#......',
        '.P...........#......',
        '#########xx#########',
        '....................',
        '....................',
        '####################',
      ],
    },
  ],
};

const FLOODPLAIN: StageDef = {
  id: 'floodplain', name: 'FLOODPLAIN', light: 'afternoon', canSwitch: true,
  rooms: [
    {
      id: '3-1', name: 'TAKE OFF',
      prompts: [
        { col: 1, row: 2, text: '{switch} FOLD INTO THE CHOPPER' },
        { col: 1, row: 3, text: 'HOLD {jump} TO FLY' },
        { col: 13, row: 4, text: 'LAND TO REFUEL' },
      ],
      rows: [
        '....................',
        '....................',
        '....................',
        '..........##........',
        '..........##........',
        '..........##........',
        '..........##........',
        '.P........##........',
        '####################',
        '####################',
      ],
    },
    {
      id: '3-2', name: 'STEPPING STONES',
      prompts: [
        { col: 1, row: 2, text: 'WATER SINKS BOTH OF YOU' },
        { col: 1, row: 3, text: 'CRATES FLOAT: DROP ONE TO LAND ON' },
      ],
      rows: [
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '.P.K....#......#....',
        '####~~~~#~~~~~~#~~##',
        '####~~~~#~~~~~~#~~##',
      ],
    },
    {
      id: '3-3', name: 'FIRST RESCUE',
      prompts: [
        { col: 1, row: 2, text: 'FLY LOW OVER THE BOAT TO HOOK IT' },
        { col: 9, row: 3, text: 'SET IT ON THE DOCK: {action}' },
      ],
      rows: [
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................G',
        '.P.................G',
        '#####....B.......HH#',
        '#####~~~~~~~~~~~~###',
        '#####~~~~~~~~~~~~###',
      ],
    },
    {
      id: '3-4', name: 'HIGH WATER',
      prompts: [{ col: 4, row: 3, text: 'CARRY IT UP TO THE DOCK' }],
      rows: [
        '...................W',
        '.b.................W',
        '###................W',
        '...................G',
        '...................G',
        '...............HHHH#',
        '.P.......#.....#####',
        '####.....#..B..#####',
        '####~~~~~#~~~~~#####',
        '####~~~~~#~~~~~#####',
      ],
    },
  ],
};

const MINEFIELD: StageDef = {
  id: 'minefield', name: 'MINEFIELD', light: 'dusk', canSwitch: true,
  rooms: [
    {
      id: '4-1', name: 'CHARGE',
      prompts: [
        { col: 1, row: 0, text: 'CHOPPER {action}: DROP A CHARGE' },
        { col: 11, row: 1, text: 'CACTI GROW BACK. BE QUICK' },
      ],
      rows: [
        // HW-004: a rock wall at the right of the upper level, up to the top of the room, so the
        // only way on is down the shaft and through the cactus (the tank used to jump the shaft and
        // drive out along the top).
        '...................#',
        '...................#',
        '.P.................#',
        '#########..#########',
        '#########..#########',
        '#########..#########',
        '#########..#########',
        '#########.C.........',
        '####################',
        '####################',
      ],
    },
    {
      id: '4-2', name: 'BREAK THROUGH',
      prompts: [{ col: 1, row: 1, text: 'CHARGES BREAK CRACKED FLOORS' }],
      rows: [
        '...................#',
        '...................#',
        '...................#',
        '.P.................#',
        '######xx############',
        '...................#',
        '...................#',
        '#############xx#####',
        '....................',
        '####################',
      ],
    },
    {
      id: '4-3', name: 'MINES',
      prompts: [
        { col: 1, row: 2, text: 'MINES SINK BOATS' },
        { col: 1, row: 3, text: 'BLAST THEM OR BE QUICK' },
      ],
      rows: [
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................G',
        '.P.................G',
        '####..B......M..HHH#',
        '####~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~####',
      ],
    },
    {
      id: '4-4', name: 'MINEFIELD',
      prompts: [{ col: 4, row: 3, text: 'CLEAR THE DOCK FIRST' }],
      rows: [
        '...................W',
        '..........b........W',
        '.........###.......W',
        '...................W',
        '...................W',
        '...................G',
        '.P..............C..G',
        '####.M..B..#.M..HHH#',
        '####~~~~~~~#~~~~####',
        '####~~~~~~~#~~~~####',
      ],
    },
  ],
};

const STORM: StageDef = {
  id: 'storm', name: 'STORM FRONT', light: 'night', canSwitch: true,
  rooms: [
    {
      id: '5-1', name: 'GUSTS', wind: { dir: -1, speed: 45, period: 200, duty: 100 },
      prompts: [{ col: 1, row: 2, text: 'GUSTS PUSH THE CHOPPER' }],
      rows: [
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        // HW-004: one island at ground height with 6-tile gaps either side, wider than any tank jump
        // (was two raised pillars with 4-, 5- and 2-tile gaps the tank could hop across).
        '.P..................',
        '####......##......##',
        '####~~~~~~##~~~~~~##',
        '####~~~~~~##~~~~~~##',
      ],
    },
    {
      id: '5-2', name: 'CHASED',
      prompts: [
        { col: 1, row: 2, text: 'SWITCH IN MID-AIR TO SHOOT UP' },
        { col: 1, row: 3, text: 'THEN FOLD BACK BEFORE THE WATER' },
      ],
      rows: [
        '..D.......D.........',
        '....................',
        '....................',
        '....................',
        '....................',
        '....................',
        '.P..................',
        '####.....#......####',
        '####~~~~~#~~~~~~####',
        '####~~~~~#~~~~~~####',
      ],
    },
    {
      id: '5-3', name: 'STORM RESCUE', wind: { dir: 1, speed: 40, period: 240, duty: 110, offset: 60 },
      prompts: [{ col: 4, row: 2, text: 'HOLD STEADY IN THE GUSTS' }],
      rows: [
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................G',
        '.P.................G',
        '####...B....M...HHH#',
        '####~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~####',
      ],
    },
    {
      id: '5-4', name: 'THE LAST BOAT', wind: { dir: -1, speed: 35, period: 260, duty: 100 },
      prompts: [{ col: 3, row: 4, text: 'BOMBS FROM ABOVE, MINES BELOW' }],
      rows: [
        '...................W',
        'j..........b.......W',
        '..........###......W',
        '...................W',
        '...................W',
        '...................G',
        '.P.................G',
        '####...M..B....M.HH#',
        '####~~~~~~~~~~~~~###',
        '####~~~~~~~~~~~~~###',
      ],
    },
  ],
};

/**
 * The Bomber finale (design stage F): one fight over three rooms, each its own checkpoint, using
 * everything so far. F-1: shoot its bomb bay from the shore while dodging its bombs (stage 2's
 * skill). F-2: its belly is armoured, so drop charges on its hatch as it skims the lake, flying back
 * to the shore to refuel (stages 3-4). F-3: its last engine burns, it sheds dive jets, and the boat it
 * shot down must be carried home (stages 2-5). There's no river the tank can cross in any of them:
 * the gates stay shut until the Bomber is beaten or the boat is home.
 */
const BOMBER: StageDef = {
  id: 'bomber', name: 'THE BOMBER', light: 'dawn', canSwitch: true,
  rooms: [
    {
      id: 'F-1', name: 'THE BOMB BAY', bomber: { mode: 'bay', row: 1 },
      prompts: [
        { col: 1, row: 2, text: 'BRING DOWN THE BOMBER' },
        { col: 1, row: 3, text: 'TANK: {action} SHOOTS ITS BOMB BAY' },
      ],
      rows: [
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................G',
        '.P.................G',
        '####################',
        '####################',
        '####################',
      ],
    },
    {
      id: 'F-2', name: 'THE HATCH', bomber: { mode: 'hatch', row: 6, from: 3, to: 16 },
      prompts: [
        { col: 1, row: 2, text: 'ITS BELLY IS ARMOURED NOW' },
        { col: 1, row: 3, text: 'CHOPPER: {action} DROPS A CHARGE ON ITS HATCH' },
        { col: 1, row: 4, text: 'LAND ON THE SHORE TO REFUEL' },
      ],
      rows: [
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................W',
        '...................G',
        '.P.................G',
        '###~~~~~~~~~~~~~~###',
        '###~~~~~~~~~~~~~~###',
        '###~~~~~~~~~~~~~~###',
      ],
    },
    {
      id: 'F-3', name: 'THE LAST ENGINE', bomber: { mode: 'flee', row: 2 },
      prompts: [
        { col: 1, row: 2, text: 'IT SHOT DOWN A BOAT AS IT FELL' },
        { col: 1, row: 3, text: 'CARRY IT BACK TO YOUR DOCK' },
        { col: 1, row: 4, text: 'THEN RUN FOR THE CASTLE' },
      ],
      rows: [
        '..D........D.......W',
        'j..................W',
        '...................W',
        '...................W',
        '...................W',
        '...................G',
        '.P.................G',
        '#HHH.........B..####',
        '####~~~~~~~~~~~~####',
        '####~~~~~~~~~~~~####',
      ],
    },
  ],
};

export const STAGES: StageDef[] = [RIVERSIDE, JET_ALLEY, FLOODPLAIN, MINEFIELD, STORM, BOMBER];

/** Every room of the game in order, each tagged with its stage index, light and switch rule. */
export const GAME_ROOMS: RoomDef[] = STAGES.flatMap((s, stage) =>
  s.rooms.map((r) => ({ ...r, stage, light: s.light, canSwitch: s.canSwitch })));
