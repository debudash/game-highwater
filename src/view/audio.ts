// LCD-cabinet beeps synthesized with WebAudio, driven by the sim's per-tick events.
// Cosmetic only: sound never feeds back into game state. M toggles mute.

import type { GameEvent } from '../sim/game';

type Note = [freq: number, startMs: number, durMs: number, type?: OscillatorType, slideTo?: number];

const SOUNDS: Partial<Record<GameEvent, { notes: Note[]; gain: number }>> = {
  fire: { gain: 0.06, notes: [[900, 0, 45, 'square', 1500]] },
  jetKill: { gain: 0.09, notes: [[700, 0, 50, 'square', 300], [260, 50, 90, 'sawtooth', 80]] },
  tankHit: { gain: 0.12, notes: [[320, 0, 120, 'sawtooth', 90], [140, 120, 220, 'square', 40]] },
  bombDrop: { gain: 0.025, notes: [[1400, 0, 90, 'triangle', 700]] },
  chopperOn: { gain: 0.07, notes: [[440, 0, 50], [660, 50, 50], [880, 100, 70]] },
  chopperOff: { gain: 0.06, notes: [[880, 0, 50], [660, 50, 50], [440, 100, 60]] },
  hook: { gain: 0.08, notes: [[1046, 0, 40], [1318, 50, 60]] },
  drop: { gain: 0.07, notes: [[520, 0, 60, 'square', 300]] },
  rescue: { gain: 0.08, notes: [[523, 0, 80], [659, 80, 80], [784, 160, 80], [1046, 240, 180]] },
  boatSpawn: { gain: 0.07, notes: [[988, 0, 70], [988, 140, 70]] },
  drown: { gain: 0.08, notes: [[440, 0, 140, 'triangle', 330], [330, 150, 140, 'triangle', 220], [220, 300, 260, 'triangle', 110]] },
  sink: { gain: 0.09, notes: [[600, 0, 90, 'sawtooth', 200], [200, 90, 260, 'triangle', 70]] },
  fuelOut: { gain: 0.07, notes: [[300, 0, 60], [250, 80, 60], [200, 160, 120]] },
  mineSpawn: { gain: 0.06, notes: [[180, 0, 50, 'square'], [240, 60, 50, 'square'], [180, 120, 50, 'square']] },
  mineClear: { gain: 0.08, notes: [[660, 0, 50], [880, 50, 50], [1320, 100, 90]] },
  mineExpire: { gain: 0.04, notes: [[300, 0, 80, 'triangle', 150]] },
  jump: { gain: 0.06, notes: [[300, 0, 90, 'square', 800]] },
  land: { gain: 0.05, notes: [[160, 0, 50, 'square', 90]] },
  levelClear: { gain: 0.08, notes: [[523, 320, 90], [784, 410, 90], [1046, 500, 90], [1568, 590, 260]] },
  gameOver: { gain: 0.09, notes: [[392, 0, 180], [330, 200, 180], [262, 400, 180], [196, 600, 420, 'triangle']] },
};

export class Sound {
  private ctx: AudioContext | null = null;
  muted = false;

  /** Browsers only allow audio after a user gesture: call from a key handler. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(events: GameEvent[]): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== 'running') return;
    const seen = new Set<GameEvent>();
    for (const e of events) {
      if (seen.has(e)) continue; // one voice per event kind per frame
      seen.add(e);
      const s = SOUNDS[e];
      if (!s) continue;
      for (const [freq, start, dur, type = 'square', slideTo] of s.notes) {
        const t0 = ctx.currentTime + start / 1000;
        const t1 = t0 + dur / 1000;
        const osc = ctx.createOscillator();
        const amp = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t1);
        amp.gain.setValueAtTime(s.gain, t0);
        amp.gain.exponentialRampToValueAtTime(0.0001, t1);
        osc.connect(amp).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t1 + 0.02);
      }
    }
  }
}
