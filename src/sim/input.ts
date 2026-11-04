// Frame → tick input plumbing. Pure and DOM-free so the timing rules can be unit-tested;
// main.ts feeds it key events through the player's bindings. Adapted from River Guard v1
// (60 ms ticks there, 60 Hz here).

import { TICK_HZ } from './config';

/** 'drop' sets down what the chopper carries (its own key, so it never shares X with the charge). */
export type Button = 'left' | 'right' | 'jump' | 'action' | 'switch' | 'drop';
export const BUTTONS: readonly Button[] = ['left', 'right', 'jump', 'action', 'switch', 'drop'];

export type ButtonFlags = Record<Button, boolean>;

/** What one simulation tick sees: presses that started this tick, and what is held. */
export interface TickInput {
  press: ButtonFlags;
  held: ButtonFlags;
}

export const noButtons = (): ButtonFlags => ({ left: false, right: false, jump: false, action: false, switch: false, drop: false });
export const idleInput = (): TickInput => ({ press: noButtons(), held: noButtons() });

const STEP_MS = 1000 / TICK_HZ;

/** Fixed-timestep accumulator: at most 6 ticks per frame, backlog beyond that is dropped. */
export class FrameClock {
  frameAcc = 0;
  private last: number | null = null;

  advance(now: number): number {
    if (this.last === null) this.last = now;
    this.frameAcc += now - this.last;
    this.last = now;
    const n = Math.min(Math.floor(this.frameAcc / STEP_MS), 6);
    this.frameAcc -= STEP_MS * n;
    if (this.frameAcc >= STEP_MS) this.frameAcc %= STEP_MS;
    return n;
  }

  /** Fraction of a tick since the last one, for smooth drawing between ticks. */
  get alpha(): number {
    return Math.min(1, this.frameAcc / STEP_MS);
  }

  reset(now: number): void {
    this.frameAcc = 0;
    this.last = now;
  }
}

/** Collects key events between frames and hands them to ticks. */
export class InputCollector {
  private pressed = noButtons();
  private held = noButtons();
  /** Per button, how many of its bound keys are down (two keys can share an action). */
  private down: Record<Button, Set<string>> = {
    left: new Set(), right: new Set(), jump: new Set(), action: new Set(), switch: new Set(), drop: new Set(),
  };

  keyDown(b: Button, key: string): void {
    if (!this.held[b]) this.pressed[b] = true;
    this.down[b].add(key);
    this.held[b] = true;
  }

  keyUp(b: Button, key: string): void {
    this.down[b].delete(key);
    if (this.down[b].size === 0) this.held[b] = false;
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

  /** Pause, hidden tab or a menu: drop every press and release every key. */
  releaseAll(): void {
    this.pressed = noButtons();
    this.held = noButtons();
    for (const b of BUTTONS) this.down[b].clear();
  }
}
