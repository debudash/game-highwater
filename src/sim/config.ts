// Every tunable from the rulebook lives here (§6 "DifficultyTable — no scattered magic numbers",
// §9 Exact timer defaults, §9 Panel layout defaults). Section refs point at river-guard-rulebook.md.

/** Seed tick: S = 60 ms. Every tick is exactly one S (§9 Tick length). */
export const S = 60;

// Grid (§3)
export const COLS = 18; // W
export const ROWS = 14; // H
export const LANE_ROW = 9;
export const JUMP_ROW = 8;
export const GROUND_ROW = 10;
export const CHOPPER_ROW = 11;
export const HOOKED_BOAT_ROW = 12;
export const LAST_ROW = 13;
export const CENTRE_COL = 8; // F: left of the two middle columns
export const LEFT_BANK = 0;
export const RIGHT_BANK = COLS - 1;

export type Band = 'A' | 'B' | 'C' | 'D' | 'E';
export const BANDS: readonly Band[] = ['A', 'B', 'C', 'D', 'E'];

export interface BandRow {
  minScore: number;
  jetSpawnMs: number;
  jetStepMs: number;
  crossStepMs: number;
  bombStepMs: number;
  bombDropChance: number;
  bombsPerJetMax: number;
  rescueJetStepMs: number;
  rescueCrossStepMs: number;
  rescueBombStepMs: number;
  respawnFloorMs: number;
  crisisIntervalMs: number;
  drownTimerMs: number;
}

/** §6 numeric difficulty table, rescue table and the band-indexed §9 tunables. */
export const DifficultyTable: Record<Band, BandRow> = {
  A: {
    minScore: 0, jetSpawnMs: 1333, jetStepMs: 720, crossStepMs: 400, bombStepMs: 660,
    bombDropChance: 0.1, bombsPerJetMax: Infinity,
    rescueJetStepMs: 1920, rescueCrossStepMs: 1067, rescueBombStepMs: 1760,
    respawnFloorMs: 900, crisisIntervalMs: 12000, drownTimerMs: 9360,
  },
  B: {
    minScore: 2000, jetSpawnMs: 1333, jetStepMs: 720, crossStepMs: 400, bombStepMs: 660,
    bombDropChance: 0.15, bombsPerJetMax: 2,
    rescueJetStepMs: 1920, rescueCrossStepMs: 1067, rescueBombStepMs: 1760,
    respawnFloorMs: 840, crisisIntervalMs: 12000, drownTimerMs: 9360,
  },
  C: {
    minScore: 5000, jetSpawnMs: 943, jetStepMs: 509, crossStepMs: 283, bombStepMs: 467,
    bombDropChance: 0.3, bombsPerJetMax: 3,
    rescueJetStepMs: 1142, rescueCrossStepMs: 634, rescueBombStepMs: 1047,
    respawnFloorMs: 780, crisisIntervalMs: 8485, drownTimerMs: 8596,
  },
  D: {
    minScore: 15000, jetSpawnMs: 667, jetStepMs: 360, crossStepMs: 200, bombStepMs: 330,
    bombDropChance: 0.45, bombsPerJetMax: 4,
    rescueJetStepMs: 679, rescueCrossStepMs: 377, rescueBombStepMs: 622,
    respawnFloorMs: 720, crisisIntervalMs: 6000, drownTimerMs: 7954,
  },
  E: {
    minScore: 30000, jetSpawnMs: 471, jetStepMs: 255, crossStepMs: 142, bombStepMs: 233,
    bombDropChance: 0.5, bombsPerJetMax: 5,
    rescueJetStepMs: 404, rescueCrossStepMs: 224, rescueBombStepMs: 370,
    respawnFloorMs: 660, crisisIntervalMs: 4243, drownTimerMs: 7414,
  },
};

export function bandForScore(score: number): Band {
  if (score >= DifficultyTable.E.minScore) return 'E';
  if (score >= DifficultyTable.D.minScore) return 'D';
  if (score >= DifficultyTable.C.minScore) return 'C';
  if (score >= DifficultyTable.B.minScore) return 'B';
  return 'A';
}

// §9 Exact timer defaults
export const Tunables = {
  startLives: 3,
  invulnMs: 960,
  impactLockMs: 420,
  mineLifetimeMs: 4200,
  jumpAirtimeMs: 480,
  tankMoveMs: 120,
  jumpCooldownMs: 240,
  boatUnlockScore: 2000,
  mineUnlockScore: 10000,
  mineMinGapCols: 5,
  msgHoldMs: 960,
  flightBudgetMs: 9920,
  chopperFreeMoveMs: 240,
  chopperHookedMoveMs: 480,
  jetCrossChance: 0.5,
  shellStepMs: S,
  scoreMax: 999_999,
  drownedLimit: 3,
  // Level 1 (river-guard-level1.md)
  tutorialBoatCol: 13,
  tutorialBoatRow: 12,
  tutorialBeatMs: 960,
};

export type TunablesT = typeof Tunables;

/** Ticks for a duration (countdown timers expire at <= 0, so round up; §9 Tick length). */
export const ticksFor = (ms: number) => Math.ceil(ms / S);

// §3 Screen and panel layout (LCD px)
export const Layout = {
  tilePx: 16,
  canvasW: 416,
  canvasH: 248,
  topPanelH: 24,
  playX: 0,
  playY: 24,
  playW: COLS * 16,
  playH: ROWS * 16,
  sideX: 288,
  sideW: 128,
  panelMargin: 4,
  sideLinePitch: 16,
  glyphW: 5,
  glyphH: 7,
  cellW: 6,
  cellH: 8,
};

// §3 Setting art inks
export const Inks = {
  background: '#a8b296', // (168,178,150)
  full: '#222820', //       (34,40,32)
  scenery: '#8a947a', //    (138,148,122)
};
