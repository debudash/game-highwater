import { Button, TickInput, idleInput, noButtons } from '../src/sim/input';
import { Game, createGame, tick } from '../src/sim/game';

/** New press, still held at the tick. */
export function press(...bs: Button[]): TickInput {
  const i = idleInput();
  for (const b of bs) {
    i.press[b] = true;
    i.held[b] = true;
  }
  return i;
}

/** Pressed and released inside one frame. */
export function tap(...bs: Button[]): TickInput {
  const i = idleInput();
  for (const b of bs) i.press[b] = true;
  return i;
}

/** Held, no new press. */
export function hold(...bs: Button[]): TickInput {
  return { press: noButtons(), held: Object.fromEntries(['left', 'right', 'up', 'down', 'fire'].map((b) => [b, bs.includes(b as Button)])) as TickInput['held'] };
}

export function run(g: Game, n: number, input: TickInput | (() => TickInput) = idleInput): void {
  for (let i = 0; i < n; i++) tick(g, typeof input === 'function' ? input() : input);
}

/** Normal play, no jets unless a test adds them. */
export function quietGame(score = 0, seed = 1): Game {
  return createGame({ seed, level1: false, noSpawns: true, score });
}
