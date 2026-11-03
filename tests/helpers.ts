import { createGame, Game, tick } from '../src/sim/game';
import { Button, TickInput, noButtons } from '../src/sim/input';
import { RoomDef } from '../src/sim/rooms';

/** A 20×10 room from up to 10 rows; missing rows are air and short rows are padded with air. */
export function room(rows: string[], extra: Partial<RoomDef> = {}): RoomDef {
  const full = [...rows];
  while (full.length < 10) full.unshift('');
  return {
    id: 'test', name: 'TEST', light: 'noon', canSwitch: true, prompts: [],
    rows: full.map((r) => r.padEnd(20, '.')),
    ...extra,
  };
}

export const FLAT = room([
  '.P..................',
  '####################',
  '####################',
]);

export function game(def: RoomDef = FLAT, more: RoomDef[] = []): Game {
  return createGame({ rooms: [def, ...more] });
}

export function input(held: Button[] = [], press: Button[] = []): TickInput {
  const h = noButtons();
  const p = noButtons();
  for (const b of held) h[b] = true;
  for (const b of press) { p[b] = true; h[b] = true; }
  return { held: h, press: p };
}

/** Runs n ticks with the same held buttons (no new presses). */
export function hold(g: Game, n: number, held: Button[] = []): void {
  for (let i = 0; i < n; i++) tick(g, input(held));
}

/** One tick with a fresh press of `b` (and anything else held). */
export function press(g: Game, b: Button, held: Button[] = []): void {
  tick(g, input([...held, b], [b]));
}

export function settle(g: Game, n = 30): void {
  hold(g, n);
}
