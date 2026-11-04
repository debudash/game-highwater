// The UI's view of a run: which stage a room belongs to, the run's boats and skips, whether it has
// ended, and the skip and restart. The sim owns these rules; this file only reads them, with
// fallbacks for fields an older sim (or a test room list) lacks, so the screens always work.

import * as Sim from '../sim/game';
import type { Game, GameEvent } from '../sim/game';
import type { RoomDef } from '../sim/rooms';

/** Design "Stages": five stages plus the finale. */
export const STAGE_NAMES = ['RIVERSIDE ROAD', 'JET ALLEY', 'FLOODPLAIN', 'MINEFIELD', 'STORM FRONT', 'THE BOMBER'];
/** Design "Boats": 7 required plus 5 hidden. */
export const BOATS_IN_GAME = 15;
export const FINALE = 5;

/** Fields the full sim adds to rooms and the game. All optional here, so either version works. */
type RunFields = {
  stageIndex?: number;
  boatsSaved?: number;
  hiddenSaved?: number;
  skipped?: string[];
  complete?: boolean;
  finished?: boolean;
};
type SimExtras = {
  skipRoom?: (g: Game) => void;
  goToRoom?: (g: Game, index: number) => void;
  stageInfo?: (g: Game) => { index: number; name: string };
};
const sim = Sim as unknown as SimExtras;
const fields = (g: Game) => g as Game & RunFields;

/** The stage index (0-based) of a room; rooms without one count as stage 0. */
export function stageOf(def: RoomDef): number {
  const s = (def as RoomDef & { stage?: number }).stage;
  return typeof s === 'number' && s >= 0 ? s : 0;
}

/** The current stage's index and display name. */
export function currentStage(g: Game): { index: number; name: string } {
  if (sim.stageInfo) {
    const s = sim.stageInfo(g);
    return { index: s.index, name: s.name.toUpperCase() };
  }
  const i = fields(g).stageIndex ?? stageOf(g.room.def);
  return { index: i, name: STAGE_NAMES[i] ?? g.room.def.name };
}

/** The index of the first room of `stage` in the room list (0 if none). */
export function firstRoomOfStage(rooms: RoomDef[], stage: number): number {
  const i = rooms.findIndex((r) => stageOf(r) === stage);
  return i < 0 ? 0 : i;
}

/** Boats brought home so far: the sim's count when it keeps one, else the UI's own tally. */
export function boatsSaved(g: Game, tally: number): number {
  const f = fields(g);
  return f.boatsSaved !== undefined ? f.boatsSaved + (f.hiddenSaved ?? 0) : tally;
}

/** Rooms skipped so far: the sim's list when it keeps one, else the UI's own. */
export function skippedRooms(g: Game, own: string[]): string[] {
  const s = fields(g).skipped;
  return Array.isArray(s) ? s : own;
}

/** Whether the sim keeps the run's boats and skips itself (then the UI doesn't tally them). */
export const simKeepsTally = (g: Game) => fields(g).boatsSaved !== undefined;

const END_EVENTS = new Set(['finish', 'gameEnd', 'ending', 'victory', 'complete']);

/** True once the run has reached its ending. */
export function runFinished(g: Game, events: GameEvent[]): boolean {
  const f = fields(g);
  if (f.complete === true || f.finished === true) return true;
  return events.some((e) => END_EVENTS.has(e.type as string));
}

/** Whether the sim can skip a room yet. */
export const canSkip = () => typeof sim.skipRoom === 'function';

/** Skips the current room through the sim (design: a skipped room scores 0). */
export function skipRoom(g: Game): boolean {
  if (!sim.skipRoom) return false;
  sim.skipRoom(g);
  return true;
}

/** Restarts the current room in place, keeping the run; false if the sim can't (caller rebuilds). */
export function restartRoom(g: Game): boolean {
  if (!sim.goToRoom) return false;
  sim.goToRoom(g, g.room.index);
  return true;
}

/** Puts a new game at a saved room; false if the sim can't (caller uses createGame's startRoom). */
export function goToRoom(g: Game, index: number): boolean {
  if (!sim.goToRoom) return false;
  sim.goToRoom(g, index);
  return true;
}
