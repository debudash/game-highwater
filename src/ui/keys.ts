// The Settings screen's model: which row and key slot is selected, and rebinding by "press a key".
// Pure logic (no drawing), so it can be tested; src/ui/screens.ts draws it.

import type { Button } from '../sim/input';
import { DEFAULT_BINDINGS, MAX_KEYS_PER_ACTION, RESERVED, rebind, Settings } from '../settings';

export const ACTIONS: { action: Button; label: string }[] = [
  { action: 'left', label: 'MOVE LEFT' },
  { action: 'right', label: 'MOVE RIGHT' },
  { action: 'jump', label: 'JUMP / FLY' },
  { action: 'action', label: 'ACTION' },
  { action: 'switch', label: 'SWITCH' },
  { action: 'drop', label: 'SET DOWN' },
];

export type Row =
  | { kind: 'keys'; action: Button; label: string }
  | { kind: 'music' | 'sfx' | 'shake' | 'reset' | 'back'; label: string };

export const ROWS: Row[] = [
  ...ACTIONS.map((a) => ({ kind: 'keys' as const, ...a })),
  { kind: 'music', label: 'MUSIC' },
  { kind: 'sfx', label: 'EFFECTS' },
  { kind: 'shake', label: 'CAMERA SHAKE' },
  { kind: 'reset', label: 'RESET TO DEFAULTS' },
  { kind: 'back', label: 'BACK' },
];

export type KeyResult = 'none' | 'changed' | 'back';

export class KeyScreen {
  row = 0;
  slot = 0;
  /** Waiting for the key to bind into the selected slot. */
  capturing = false;
  /** A short note under the list, e.g. why a key was refused. */
  note = '';

  constructor(public settings: Settings) {}

  get current(): Row { return ROWS[this.row]; }

  /** How many slots the row offers: its keys, plus one empty slot until it is full. */
  slotsFor(r: Row): number {
    if (r.kind !== 'keys') return 0;
    return Math.min(MAX_KEYS_PER_ACTION, this.settings.bindings[r.action].length + 1);
  }

  /** Handles one key press (KeyboardEvent.code). */
  key(code: string): KeyResult {
    const s = this.settings;
    const r = this.current;
    if (this.capturing) {
      this.capturing = false;
      if (code === 'Escape') { this.note = ''; return 'none'; }
      if (RESERVED.includes(code)) { this.note = 'ESC ALWAYS PAUSES'; return 'none'; }
      if (r.kind === 'keys') {
        s.bindings = rebind(s.bindings, r.action, this.slot, code);
        this.slot = Math.min(this.slot, this.slotsFor(r) - 1);
        this.note = '';
        return 'changed';
      }
      return 'none';
    }
    this.note = '';
    switch (code) {
      case 'ArrowUp': case 'KeyW':
        this.row = (this.row + ROWS.length - 1) % ROWS.length;
        this.slot = Math.min(this.slot, Math.max(0, this.slotsFor(this.current) - 1));
        return 'none';
      case 'ArrowDown': case 'KeyS':
        this.row = (this.row + 1) % ROWS.length;
        this.slot = Math.min(this.slot, Math.max(0, this.slotsFor(this.current) - 1));
        return 'none';
      case 'ArrowLeft': case 'KeyA':
        if (r.kind === 'keys') this.slot = Math.max(0, this.slot - 1);
        else return this.adjust(r, -1);
        return 'none';
      case 'ArrowRight': case 'KeyD':
        if (r.kind === 'keys') this.slot = Math.min(this.slotsFor(r) - 1, this.slot + 1);
        else return this.adjust(r, 1);
        return 'none';
      case 'Backspace': case 'Delete':
        if (r.kind === 'keys') {
          const keys = s.bindings[r.action];
          if (this.slot >= keys.length) return 'none';
          if (keys.length <= 1) { this.note = 'EVERY ACTION NEEDS A KEY'; return 'none'; }
          s.bindings = { ...s.bindings, [r.action]: keys.filter((_, i) => i !== this.slot) };
          this.slot = Math.min(this.slot, this.slotsFor(r) - 1);
          return 'changed';
        }
        return 'none';
      case 'Enter': case 'Space':
        if (r.kind === 'keys') { this.capturing = true; return 'none'; }
        if (r.kind === 'back') return 'back';
        if (r.kind === 'reset') {
          s.bindings = structuredClone(DEFAULT_BINDINGS);
          s.music = 0.7;
          s.sfx = 0.8;
          s.shake = true;
          this.note = 'DEFAULTS RESTORED';
          return 'changed';
        }
        return this.adjust(r, 1);
      case 'Escape':
        return 'back';
    }
    return 'none';
  }

  private adjust(r: Row, dir: number): KeyResult {
    const s = this.settings;
    const step = (v: number) => Math.round(Math.max(0, Math.min(1, v + dir * 0.1)) * 10) / 10;
    if (r.kind === 'music') s.music = step(s.music);
    else if (r.kind === 'sfx') s.sfx = step(s.sfx);
    else if (r.kind === 'shake') s.shake = !s.shake;
    else return 'none';
    return 'changed';
  }
}
