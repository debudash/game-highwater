// Watch mode (?autoplay): a bot plays the whole run, from the first room through the Bomber to the
// ending. It replays each room's recorded solution (the stage bots' inputs in ghosts.ts, the same
// recordings as the ghost hint). A recording starts from the room's entrance, so on entering each
// room the bot restarts it from there (goToRoom): the sim is deterministic, so the replay then
// retraces the recorded run exactly.

import { Game, goToRoom } from './game';
import { ghostInputs } from './ghost';
import { TickInput, noButtons } from './input';

const IDLE: TickInput = { held: noButtons(), press: noButtons() };

/** Ticks to wait after a recording runs out before moving on anyway (it never should). */
const GRACE = 120;

export class Autoplay {
  private game: Game | null = null;
  private room = -1;
  private inputs: TickInput[] = [];
  private i = 0;

  /** The input for the next tick of `g`. Call it once before each tick. */
  next(g: Game): TickInput {
    if (g !== this.game || g.room.index !== this.room) {
      this.game = g;
      this.room = g.room.index;
      goToRoom(g, this.room);
      this.inputs = ghostInputs(g.room.def.id) ?? [];
      this.i = 0;
    }
    if (this.i >= this.inputs.length + GRACE) {
      // The recording didn't get out of the room: go on to the next one so the run never stalls.
      goToRoom(g, this.room + 1 < g.rooms.length ? this.room + 1 : this.room);
    }
    return this.inputs[this.i++] ?? IDLE;
  }
}
