// RG-004 — found by the spec review: after a hidden tab, a held Fire/Up/Down re-triggered on OS key repeat,
// and a held Left/Right was not seen as held on the first tick (§9 Resume).
import { describe, expect, it } from 'vitest';
import { InputCollector } from '../src/sim/input';

describe('InputCollector across a hidden tab (RG-004)', () => {
  it('a Fire held through the pause needs a real release and a new press', () => {
    const c = new InputCollector();
    c.keyDown('fire');
    c.takeFrame(1);
    c.suspend();
    c.keyDown('fire'); // OS auto-repeat after resume
    expect(c.takeFrame(1)[0].press.fire).toBe(false);
    c.keyUp('fire');
    c.keyDown('fire');
    expect(c.takeFrame(1)[0].press.fire).toBe(true);
  });

  it('a Left held through the pause is still held on the first tick', () => {
    const c = new InputCollector();
    c.keyDown('left');
    c.takeFrame(1);
    c.suspend();
    const [first] = c.takeFrame(1);
    expect(first.held.left).toBe(true);
    expect(first.press.left).toBe(false);
  });

  it('presses made while paused are discarded', () => {
    const c = new InputCollector();
    c.suspend();
    c.keyDown('up');
    c.keyUp('up');
    c.discardForResume(null);
    expect(c.takeFrame(1)[0].press.up).toBe(false);
  });
});
