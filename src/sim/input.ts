// Frame → tick input plumbing (rulebook §9 Tick length, Inputs, Same-frame presses, Catch-up, Hidden tab).
// Pure and DOM-free so the timing rules can be unit-tested; main.ts feeds it key events.

import { S } from './config';

export type Button = 'left' | 'right' | 'up' | 'down' | 'fire';
export const BUTTONS: readonly Button[] = ['left', 'right', 'up', 'down', 'fire'];

type ButtonFlags = Record<Button, boolean>;

/** What one simulation tick sees: merged new presses (first tick of a frame only) and held state. */
export interface TickInput {
  press: ButtonFlags;
  held: ButtonFlags;
}

export const noButtons = (): ButtonFlags => ({ left: false, right: false, up: false, down: false, fire: false });
export const idleInput = (): TickInput => ({ press: noButtons(), held: noButtons() });

/** Fixed-timestep accumulator: at most 5 ticks per frame, backlog beyond that is dropped. */
export class FrameClock {
  frameAcc = 0;
  private last: number | null = null;

  /** Returns how many 60 ms ticks to run for a frame at time `now` (ms). */
  advance(now: number): number {
    if (this.last === null) this.last = now;
    this.frameAcc += now - this.last;
    this.last = now;
    const n = Math.min(Math.floor(this.frameAcc / S), 5);
    this.frameAcc -= S * n;
    if (this.frameAcc >= S) this.frameAcc %= S;
    return n;
  }

  /** Resume after a pause: no backlog, the clock restarts from `now`. */
  reset(now: number): void {
    this.frameAcc = 0;
    this.last = now;
  }
}

/** Collects key events between frames and hands them to ticks by the §9 press rules. */
export class InputCollector {
  private pressed = noButtons();
  private held = noButtons();
  /** A key that resumed the game is ignored until released (§9 Resume). */
  private suppressed = new Set<Button>();

  keyDown(b: Button): void {
    if (this.suppressed.has(b)) return;
    if (!this.held[b]) this.pressed[b] = true;
    this.held[b] = true;
  }

  keyUp(b: Button): void {
    this.suppressed.delete(b);
    this.held[b] = false;
  }

  /** Inputs for the ticks of one frame. With 0 ticks the presses carry over to the next frame. */
  takeFrame(ticks: number): TickInput[] {
    const out: TickInput[] = [];
    for (let i = 0; i < ticks; i++) {
      out.push({ press: i === 0 ? { ...this.pressed } : noButtons(), held: { ...this.held } });
    }
    if (ticks > 0) this.pressed = noButtons();
    return out;
  }

  /** Paused or hidden: drop every press. The resuming key stays ignored until it is released. */
  discardForResume(resumeKey: Button | null): void {
    this.pressed = noButtons();
    if (resumeKey) {
      this.suppressed.add(resumeKey);
      this.held[resumeKey] = false;
    }
  }

  /**
   * Tab hidden. RG-004: this used to release every key, so an OS key repeat after resume looked
   * like a fresh press (a held Space fired) and a held Left/Right was no longer seen as held.
   * §9 Resume: held Up/Down/Fire need a new press, so they are ignored until a real release.
   * Held Left/Right stay held and act as a new press on the first tick.
   */
  suspend(): void {
    this.pressed = noButtons();
    for (const b of ['up', 'down', 'fire'] as const) {
      if (this.held[b]) {
        this.held[b] = false;
        this.suppressed.add(b);
      }
    }
  }
}
