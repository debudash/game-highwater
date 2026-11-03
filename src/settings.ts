// Player settings: key bindings (every action can be rebound, design #16), volumes and graphics.
// Saved in the browser; every read and write is guarded because storage can be blocked.

import type { Button } from './sim/input';

export type Bindings = Record<Button, string[]>;

/** KeyboardEvent.code values, so bindings follow key position, not keyboard layout. */
export const DEFAULT_BINDINGS: Bindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['KeyZ', 'Space', 'ArrowUp'],
  action: ['KeyX'],
  switch: ['KeyC', 'ShiftLeft', 'ShiftRight'],
};

/** Esc always pauses and can never be rebound, so nobody can lock themselves out. */
export const RESERVED = ['Escape'];
export const MAX_KEYS_PER_ACTION = 3;

export interface Settings {
  bindings: Bindings;
  music: number; // 0..1
  sfx: number; // 0..1
  quality: 'auto' | 'high' | 'low';
  shake: boolean;
}

const KEY = 'rghw.settings.v1';

export function loadSettings(): Settings {
  const base: Settings = { bindings: structuredClone(DEFAULT_BINDINGS), music: 0.7, sfx: 0.8, quality: 'auto', shake: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const s = JSON.parse(raw) as Partial<Settings>;
    return { ...base, ...s, bindings: { ...base.bindings, ...(s.bindings ?? {}) } };
  } catch {
    return base;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: settings last for this session */
  }
}

/** The action a key code is bound to, if any. */
export function actionFor(b: Bindings, code: string): Button | null {
  for (const [action, codes] of Object.entries(b) as [Button, string[]][]) if (codes.includes(code)) return action;
  return null;
}

/**
 * Binds `code` to `action` in slot `slot`. A key already used by another action swaps over:
 * the other action gets this slot's old key (design: "binding a key in use swaps the two").
 */
export function rebind(b: Bindings, action: Button, slot: number, code: string): Bindings {
  if (RESERVED.includes(code)) return b;
  const next = structuredClone(b);
  const old = next[action][slot] ?? null;
  for (const [other, codes] of Object.entries(next) as [Button, string[]][]) {
    const i = codes.indexOf(code);
    if (i >= 0 && !(other === action && i === slot)) {
      if (old && other !== action) codes[i] = old;
      else codes.splice(i, 1);
    }
  }
  next[action][slot] = code;
  next[action] = next[action].filter(Boolean).slice(0, MAX_KEYS_PER_ACTION);
  return next;
}

/** Short label for a key code, drawn in the game's 5×7 font. */
export function keyLabel(code: string): string {
  const named: Record<string, string> = {
    ArrowLeft: '◀', ArrowRight: '▶', ArrowUp: '▲', ArrowDown: '▼', Space: 'SPACE', ShiftLeft: 'SHIFT',
    ShiftRight: 'R.SHIFT', ControlLeft: 'CTRL', ControlRight: 'R.CTRL', Enter: 'ENTER', Tab: 'TAB',
    AltLeft: 'ALT', AltRight: 'R.ALT', Backspace: 'BKSP',
  };
  if (named[code]) return named[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'N' + code.slice(6);
  return code.toUpperCase().slice(0, 5);
}

/** Replaces {left} {jump} … in a prompt with the player's first key for that action. */
export function fillPrompt(text: string, b: Bindings): string {
  return text.replace(/\{(\w+)\}/g, (_, a: string) => {
    const codes = b[a as Button];
    return codes?.length ? keyLabel(codes[0]) : '?';
  });
}
