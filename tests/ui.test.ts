// The screens' logic: key rebinding in Settings, saved progress and best score, and the music's
// note patterns. Drawing is checked by eye in the browser (tools/e2e.mjs screenshots).
import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS, loadSettings, MAX_KEYS_PER_ACTION, Settings } from '../src/settings';
import { KeyScreen, ROWS } from '../src/ui/keys';
import { clearSave, loadBest, loadSave, recordBest, Store, writeSave } from '../src/ui/save';
import { ARRANGEMENTS, CHORDS, MELODY, notesAt } from '../src/view/music';

const fresh = (): Settings => ({ ...loadSettings(), bindings: structuredClone(DEFAULT_BINDINGS) });
const row = (kind: string, action?: string) => ROWS.findIndex((r) => r.kind === kind && (!action || ('action' in r && r.action === action)));

describe('settings screen: key rebinding', () => {
  it('Enter then a key binds that key into the selected slot', () => {
    const s = fresh();
    const k = new KeyScreen(s);
    k.row = row('keys', 'action');
    k.key('Enter');
    expect(k.capturing).toBe(true);
    expect(k.key('KeyF')).toBe('changed');
    expect(s.bindings.action).toEqual(['KeyF']);
  });

  it('binding a key another action uses swaps it over', () => {
    const s = fresh();
    const k = new KeyScreen(s);
    k.row = row('keys', 'action');
    k.key('Enter');
    k.key('KeyZ'); // jump's key
    expect(s.bindings.action).toEqual(['KeyZ']);
    expect(s.bindings.jump).toContain('KeyX');
    expect(s.bindings.jump).not.toContain('KeyZ');
  });

  it('Esc is reserved: it cancels the capture and is never bound', () => {
    const s = fresh();
    const k = new KeyScreen(s);
    k.row = row('keys', 'jump');
    k.key('Enter');
    expect(k.key('Escape')).toBe('none');
    expect(k.capturing).toBe(false);
    expect(Object.values(s.bindings).flat()).not.toContain('Escape');
  });

  it('an action can hold up to three keys, and never loses its last one', () => {
    const s = fresh();
    const k = new KeyScreen(s);
    k.row = row('keys', 'action');
    expect(k.slotsFor(k.current)).toBe(2); // one key plus an empty slot
    k.slot = 1;
    k.key('Enter');
    k.key('KeyJ');
    k.slot = 2;
    k.key('Enter');
    k.key('KeyK');
    expect(s.bindings.action).toEqual(['KeyX', 'KeyJ', 'KeyK']);
    expect(k.slotsFor(k.current)).toBe(MAX_KEYS_PER_ACTION);
    k.slot = 0;
    k.key('Delete');
    k.key('Delete');
    expect(s.bindings.action).toEqual(['KeyK']);
    expect(k.key('Delete')).toBe('none');
    expect(s.bindings.action).toEqual(['KeyK']);
  });

  it('volumes step by tenths within 0..1, shake toggles, reset restores the defaults', () => {
    const s = fresh();
    const k = new KeyScreen(s);
    k.row = row('music');
    for (let i = 0; i < 20; i++) k.key('ArrowRight');
    expect(s.music).toBe(1);
    k.row = row('sfx');
    for (let i = 0; i < 20; i++) k.key('ArrowLeft');
    expect(s.sfx).toBe(0);
    k.row = row('shake');
    k.key('Enter');
    expect(s.shake).toBe(false);
    s.bindings.action = ['KeyQ'];
    k.row = row('reset');
    k.key('Enter');
    expect(s.bindings).toEqual(DEFAULT_BINDINGS);
    expect(s.shake).toBe(true);
  });

  it('Esc or BACK leaves the screen', () => {
    const k = new KeyScreen(fresh());
    expect(k.key('Escape')).toBe('back');
    k.row = row('back');
    expect(k.key('Enter')).toBe('back');
  });
});

describe('saved progress and best score', () => {
  const memory = (): Store => {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  };

  it('a save round-trips, and clearing it removes Continue', () => {
    const st = memory();
    expect(loadSave(st)).toBeNull();
    writeSave({ room: 8, stage: 2, score: 1200, deaths: 3, boats: 2, skipped: ['X'] }, st);
    expect(loadSave(st)).toEqual({ room: 8, stage: 2, score: 1200, deaths: 3, boats: 2, skipped: ['X'] });
    clearSave(st);
    expect(loadSave(st)).toBeNull();
  });

  it('a broken or blocked store never throws', () => {
    const broken: Store = { getItem: () => '{nope', setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(loadSave(broken)).toBeNull();
    expect(() => writeSave({ room: 0, stage: 0, score: 0, deaths: 0, boats: 0, skipped: [] }, broken)).not.toThrow();
    expect(() => clearSave(broken)).not.toThrow();
    expect(loadBest(null)).toBe(0);
  });

  it('the best score only goes up', () => {
    const st = memory();
    expect(recordBest(500, st)).toBe(500);
    expect(recordBest(300, st)).toBe(500);
    expect(loadBest(st)).toBe(500);
    expect(recordBest(900, st)).toBe(900);
  });
});

describe('music', () => {
  it('the theme is 16 bars of 8 eighths over 16 chords', () => {
    expect(MELODY).toHaveLength(16);
    expect(MELODY.every((b) => b.length === 8)).toBe(true);
    expect(CHORDS).toHaveLength(16);
  });

  for (const [mood, a] of Object.entries(ARRANGEMENTS)) {
    it(`${mood}: every note of the 32-bar loop is in a playable range, with a melody in every bar`, () => {
      for (let bar = 0; bar < 32; bar++) {
        const notes = Array.from({ length: 16 }, (_, s) => notesAt(a, bar, s)).flat();
        expect(notes.some((n) => n.inst === a.lead), `bar ${bar} has a melody`).toBe(true);
        for (const n of notes) {
          if (['kick', 'snare', 'hat', 'openhat'].includes(n.inst)) continue;
          expect(n.midi, `${n.inst} in bar ${bar}`).toBeGreaterThanOrEqual(28);
          expect(n.midi, `${n.inst} in bar ${bar}`).toBeLessThanOrEqual(96);
          expect(n.beats).toBeGreaterThan(0);
        }
      }
    });
  }

  it('the second pass is fuller than the first', () => {
    const a = ARRANGEMENTS.morning;
    const count = (from: number) => Array.from({ length: 16 * 16 }, (_, i) => notesAt(a, from + Math.floor(i / 16), i % 16)).flat().length;
    expect(count(16)).toBeGreaterThan(count(0));
  });
});
