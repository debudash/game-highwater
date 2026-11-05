// Watch mode (?autoplay): a bot plays the whole run, from the first room through the Bomber to the
// ending. It replays each room's recorded solution (the stage bots' inputs in ghosts.ts, the same
// recordings as the ghost hint). A recording starts from the room's entrance, so on entering each
// room the bot restarts it from there (goToRoom): the sim is deterministic, so the replay then
// retraces the recorded run exactly.
//
// Once per run, in SINK_DEMO, the bot first waits at the entrance (under the ledge, out of the
// bombs' way) until a jet sinks the boat, so watch mode shows the jets hunting the boats and the
// room restarting. The room's reset is the same fresh start as goToRoom, so the recording then plays.

import { Game, RoomState, goToRoom } from './game';
import { ghostInputs } from './ghost';
import { TickInput, noButtons } from './input';

const IDLE: TickInput = { held: noButtons(), press: noButtons() };

/** Ticks to wait after a recording runs out before moving on anyway (it never should). */
const GRACE = 120;

/** The room where the bot lets a jet sink the boat first (3-4: the start is under a ledge). */
export const SINK_DEMO = '3-4';
/** If no jet has sunk the boat by then, give up waiting and play the room (it sinks at about 19 s). */
const SINK_WAIT_MAX = 60 * 40;

export class Autoplay {
  private game: Game | null = null;
  private room = -1;
  private roomState: RoomState | null = null;
  private inputs: TickInput[] = [];
  private i = 0;
  /** Waiting for the jet in SINK_DEMO (ticks waited), or -1. */
  private waiting = -1;
  private sunk = false;

  /** The input for the next tick of `g`. Call it once before each tick. */
  next(g: Game): TickInput {
    if (g !== this.game) {
      this.game = g;
      this.sunk = false;
      this.room = -1;
    }
    if (g.room.index !== this.room) {
      this.room = g.room.index;
      goToRoom(g, this.room);
      this.play(g);
      if (g.room.def.id === SINK_DEMO && !this.sunk) this.waiting = 0;
    } else if (g.room !== this.roomState) {
      // The room restarted after the boat sank: now play it properly.
      this.sunk = true;
      this.play(g);
    }
    if (this.waiting >= 0) {
      if (++this.waiting < SINK_WAIT_MAX || g.player.deadTicks > 0) return IDLE;
      this.sunk = true;
      goToRoom(g, this.room);
      this.play(g);
    }
    if (this.i >= this.inputs.length + GRACE) {
      // The recording didn't get out of the room: go on to the next one so the run never stalls.
      goToRoom(g, this.room + 1 < g.rooms.length ? this.room + 1 : this.room);
    }
    return this.inputs[this.i++] ?? IDLE;
  }

  private play(g: Game): void {
    this.roomState = g.room;
    this.inputs = ghostInputs(g.room.def.id) ?? [];
    this.i = 0;
    this.waiting = -1;
  }
}
