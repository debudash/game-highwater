// §8 Respawn safety rule. Runs once, on the respawn tick, after that tick's threat steps.

import { COLS, CENTRE_COL, DifficultyTable, LANE_ROW, S } from './config';
import type { Game } from './game';
import { activeBand, bombInterval, jetInterval } from './game';

/** Search order: 8, then 9, 7, 10, 6, … alternating outward to the walls. */
export const SEARCH_ORDER: readonly number[] = (() => {
  const out = [CENTRE_COL];
  for (let d = 1; out.length < COLS; d++) {
    if (CENTRE_COL + d < COLS) out.push(CENTRE_COL + d);
    if (CENTRE_COL - d >= 0) out.push(CENTRE_COL - d);
  }
  return out;
})();

/** ms until a threat at `row` with accumulator `acc` reaches lane row 9 (Infinity if it never will). */
function arrivalMs(row: number, acc: number, interval: number): number {
  if (row > LANE_ROW) return Infinity;
  const steps = LANE_ROW - row;
  if (steps === 0) return 0;
  return S * Math.ceil((steps * interval - acc) / S);
}

export function respawnColumn(g: Game): number {
  const floor = DifficultyTable[activeBand(g)].respawnFloorMs;
  const earliest = new Array<number>(COLS).fill(Infinity);
  const unsafe = new Array<boolean>(COLS).fill(false);

  const consider = (col: number, row: number, acc: number, interval: number) => {
    const at = arrivalMs(row, acc, interval);
    if (at === Infinity) return;
    earliest[col] = Math.min(earliest[col], at);
    if (at <= Math.max(3 * interval, floor)) unsafe[col] = true;
  };
  for (const j of g.jets) if (j.path === 'dive') consider(j.col, j.row, j.acc, jetInterval(g, j));
  const bi = bombInterval(g);
  for (const b of g.bombs) if (!b.river) consider(b.col, b.row, b.acc, bi);
  if (g.mine) {
    unsafe[g.mine.col] = true;
    earliest[g.mine.col] = -1; // ranks last: arrives at T_r
  }

  const safe = SEARCH_ORDER.find((c) => !unsafe[c]);
  if (safe !== undefined) return safe;
  // No safe column: the one whose earliest threat arrives latest; ties to the earlier in search order.
  let best = SEARCH_ORDER[0];
  for (const c of SEARCH_ORDER) if (earliest[c] > earliest[best]) best = c;
  return best;
}
