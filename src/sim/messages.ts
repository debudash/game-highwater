// §3 Side message panel: 4 lines, pinned first, then transients newest first.
// Transients are held in ticks (msgHoldMs = 960 = 16 ticks): raised on tick E, drawn E..E+15, gone on E+16.

import { S, Tunables } from './config';

export const PANEL_LINES = 4;
const HOLD_TICKS = Tunables.msgHoldMs / S;

interface Transient {
  text: string;
  tick: number;
  seq: number;
}

export interface Messages {
  transients: Transient[];
  seq: number;
}

export const createMessages = (): Messages => ({ transients: [], seq: 0 });

/** Raise a transient. A repeat of a showing string restarts its hold and moves to the newest group. */
export function raise(m: Messages, text: string, tick: number): void {
  m.transients = m.transients.filter((x) => x.text !== text);
  m.transients.push({ text, tick, seq: m.seq++ });
}

/** Newest tick first; within a tick, resolution order. */
function ordered(m: Messages): Transient[] {
  return [...m.transients].sort((a, b) => b.tick - a.tick || a.seq - b.seq);
}

/** End of tick: drop expired transients, then the oldest ones that no longer fit beside the pinned lines. */
export function trimMessages(m: Messages, tick: number, pinnedCount: number): void {
  const live = ordered(m).filter((x) => tick < x.tick + HOLD_TICKS);
  m.transients = live.slice(0, Math.max(0, PANEL_LINES - pinnedCount));
}

/** Lines to draw for the frame after tick `tick` ran. */
export function panelLines(m: Messages, pinned: string[], tick: number): string[] {
  const trans = ordered(m).filter((x) => tick < x.tick + HOLD_TICKS).map((x) => x.text);
  return [...pinned, ...trans].slice(0, PANEL_LINES);
}
