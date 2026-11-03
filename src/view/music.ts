// The music (design: "Sound and music"): one main theme, re-arranged for each part of the story,
// synthesised live in WebAudio. Nothing here is a recording.
//
// Debu asked for music that is vibrant and energetic and NOT chiptune, so the voices imitate real
// instruments rather than square waves:
//   pluck    a plucked string (Karplus-Strong: a burst of noise in a short tuned delay line)
//   bell     a struck bell (a few sine partials that ring and fade)
//   brass    two detuned saws through a filter that opens on each note, with a little vibrato
//   strings  a slow-swelling pad of detuned saws
//   bass     a round plucked bass, or a pulsing filtered one for the tense parts
//   drums    kick, snare, hats and toms, synthesised with real punch
//
// The theme is 16 bars of melody over a chord progression. Each arrangement plays it twice, the
// second time fuller (a counter-voice, busier drums), so every loop is 32 bars. Which arrangement
// plays follows the tone arc: a gentle title at dawn, a playful morning, a bright noon, a more
// serious afternoon, a dusky minor, a driving storm, the Bomber, and a bright ending.
//
// `notesAt` is the pure part (which notes fall on a step), so it can be tested without audio.

export type Mood = 'title' | 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night' | 'bomber' | 'ending';
export type Inst = 'pluck' | 'bell' | 'brass' | 'strings' | 'bass' | 'pulse' | 'kick' | 'snare' | 'hat' | 'openhat' | 'tom';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

/** The theme: 16 bars of eighth notes as scale degrees (0 = the key note), null = hold or rest. */
const _ = null;
export const MELODY: (number | null)[][] = [
  [0, _, 2, 4, 7, _, 6, _], [4, _, _, 6, 5, 4, 2, _], [5, _, 4, 5, 7, _, 5, _], [3, _, 2, 3, 4, _, _, _],
  [0, _, 2, 4, 7, _, 9, _], [8, _, 7, 6, 7, _, 4, _], [5, _, 5, 6, 7, _, 5, 3], [4, _, _, _, 1, _, _, _],
  [9, _, 8, 7, 8, _, 5, _], [7, _, 6, 5, 6, _, 3, _], [4, _, 7, _, 9, _, 7, _], [8, _, _, 7, 6, _, 4, _],
  [5, _, 7, 9, 8, _, 7, _], [6, _, 5, 3, 5, _, 3, _], [1, _, 3, 5, 8, _, 7, 6], [4, _, 6, _, 8, _, _, _],
];
/** Chord root (scale degree) for each bar: I V vi IV | I V IV V | vi IV I V | vi IV ii V. */
export const CHORDS = [0, 4, 5, 3, 0, 4, 3, 4, 5, 3, 0, 4, 5, 3, 1, 4];

type Drums = 'none' | 'brush' | 'light' | 'halftime' | 'drive' | 'march' | 'heavy';

export interface Arrangement {
  bpm: number;
  /** MIDI note of the key. */
  root: number;
  scale: number[];
  lead: Inst;
  /** Semitones added to the lead. */
  leadShift: number;
  /** The second pass's extra voice, doubling the melody. */
  counter: Inst | null;
  bass: 'bass' | 'pulse';
  bassStyle: 'pluck' | 'round' | 'drive';
  drums: Drums;
  pad: boolean;
}

export const ARRANGEMENTS: Record<Mood, Arrangement> = {
  title: { bpm: 88, root: 62, scale: MAJOR, lead: 'bell', leadShift: 12, counter: 'strings', bass: 'bass', bassStyle: 'round', drums: 'brush', pad: true },
  morning: { bpm: 114, root: 60, scale: MAJOR, lead: 'pluck', leadShift: 12, counter: 'bell', bass: 'bass', bassStyle: 'pluck', drums: 'light', pad: false },
  noon: { bpm: 126, root: 62, scale: MAJOR, lead: 'brass', leadShift: 0, counter: 'pluck', bass: 'bass', bassStyle: 'pluck', drums: 'drive', pad: false },
  afternoon: { bpm: 116, root: 57, scale: DORIAN, lead: 'pluck', leadShift: 12, counter: 'brass', bass: 'bass', bassStyle: 'round', drums: 'march', pad: true },
  dusk: { bpm: 100, root: 64, scale: MINOR, lead: 'bell', leadShift: 0, counter: 'strings', bass: 'bass', bassStyle: 'round', drums: 'halftime', pad: true },
  night: { bpm: 138, root: 62, scale: MINOR, lead: 'brass', leadShift: 0, counter: 'pluck', bass: 'pulse', bassStyle: 'drive', drums: 'heavy', pad: true },
  bomber: { bpm: 148, root: 60, scale: MINOR, lead: 'brass', leadShift: 0, counter: 'strings', bass: 'pulse', bassStyle: 'drive', drums: 'heavy', pad: true },
  ending: { bpm: 96, root: 60, scale: MAJOR, lead: 'brass', leadShift: 0, counter: 'bell', bass: 'bass', bassStyle: 'round', drums: 'march', pad: true },
};

/** 16-step drum patterns: k kick, s snare, h hat, o open hat, t tom. */
const DRUMS: Record<Drums, Partial<Record<'k' | 's' | 'h' | 'o' | 't', string>>> = {
  none: {},
  brush: { k: 'x.......x.......', h: '..x...x...x...x.' },
  light: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  halftime: { k: 'x.........x.....', s: '........x.......', h: 'x...x...x...x...' },
  drive: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', o: '..x...x...x...x.' },
  march: { k: 'x.......x.......', s: '....x..x....x.xx', h: 'x.x.x.x.x.x.x.x.' },
  heavy: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', t: '..............xx' },
};

export interface NoteEvent { inst: Inst; midi: number; beats: number; vel: number }

const degreeToMidi = (a: Arrangement, d: number) => a.root + a.scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);

/** Length of a melody note: until the next note in the bar, in beats (eighths = 0.5). */
function heldFor(bar: (number | null)[], i: number): number {
  let n = 1;
  while (i + n < bar.length && bar[i + n] === null) n++;
  return n * 0.5;
}

/**
 * Every note that starts on `step` (0..15, sixteenth notes) of `bar` (0..31) in an arrangement.
 * Bars 16..31 are the second, fuller pass.
 */
export function notesAt(a: Arrangement, bar: number, step: number): NoteEvent[] {
  const out: NoteEvent[] = [];
  const b = bar % 16;
  const second = bar % 32 >= 16;
  const chord = CHORDS[b];
  // Melody on eighths
  if (step % 2 === 0) {
    const m = MELODY[b];
    const d = m[step / 2];
    if (d !== null) {
      const beats = heldFor(m, step / 2);
      out.push({ inst: a.lead, midi: degreeToMidi(a, d) + a.leadShift, beats, vel: 1 });
      // The counter-voice doubles the tune: strings an octave below, others an octave above
      // unless the lead is already high (then in unison, in a different colour).
      const shift = a.counter === 'strings' ? -12 : a.leadShift >= 12 ? 0 : 12;
      if (second && a.counter) out.push({ inst: a.counter, midi: degreeToMidi(a, d) + a.leadShift + shift, beats, vel: 0.6 });
    }
  }
  // Bass
  const bassRoot = degreeToMidi(a, chord) - 24;
  const fifth = degreeToMidi(a, chord + 4) - 24;
  if (a.bassStyle === 'pluck') {
    const pat: Record<number, number> = { 0: bassRoot, 6: bassRoot, 8: fifth, 12: bassRoot + 12, 14: fifth };
    if (pat[step] !== undefined) out.push({ inst: a.bass, midi: pat[step], beats: 0.5, vel: 1 });
  } else if (a.bassStyle === 'round') {
    const pat: Record<number, number> = { 0: bassRoot, 8: fifth, 12: bassRoot };
    if (pat[step] !== undefined) out.push({ inst: a.bass, midi: pat[step], beats: step === 0 ? 2 : 1, vel: 1 });
  } else if (step % 2 === 0) {
    out.push({ inst: a.bass, midi: step % 8 === 6 ? bassRoot + 12 : bassRoot, beats: 0.4, vel: step % 4 === 0 ? 1 : 0.7 });
  }
  // Pad: the chord, held for the bar
  if (a.pad && step === 0) {
    for (const off of [0, 2, 4]) out.push({ inst: 'strings', midi: degreeToMidi(a, chord + off) - 12, beats: 4, vel: 0.5 });
  }
  // Drums, with a snare fill into every fourth bar
  const pat = DRUMS[a.drums];
  const hit = (s?: string) => s?.[step] === 'x';
  const fill = a.drums !== 'none' && a.drums !== 'brush' && b % 4 === 3 && step >= 12;
  if (hit(pat.k)) out.push({ inst: 'kick', midi: 0, beats: 0.5, vel: 1 });
  if (hit(pat.s) || (fill && second)) out.push({ inst: 'snare', midi: 0, beats: 0.5, vel: fill ? 0.7 : 1 });
  if (hit(pat.h) && (second || a.drums !== 'drive' || step % 2 === 0)) out.push({ inst: 'hat', midi: 0, beats: 0.25, vel: step % 4 === 0 ? 1 : 0.6 });
  if (hit(pat.o) && second) out.push({ inst: 'openhat', midi: 0, beats: 0.5, vel: 0.8 });
  if (hit(pat.t)) out.push({ inst: 'tom', midi: step === 14 ? 50 : 45, beats: 0.5, vel: 1 });
  return out;
}

// ---------------------------------------------------------------- the player

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Music {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private plucks = new Map<number, AudioBuffer>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private arr: Arrangement = ARRANGEMENTS.title;
  private mood: Mood | null = null;
  private pending: Mood | null = null;
  private switchAt = 0;
  private bar = 0;
  private step = 0;
  private nextTime = 0;
  volume = 0.7;
  muted = false;

  get current(): Mood | null { return this.mood; }

  /** Call from a key handler: browsers only allow audio after a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
      const ctx = this.ctx;
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.ratio.value = 3;
      this.out.connect(comp).connect(ctx.destination);
      this.bus = ctx.createGain();
      this.bus.connect(this.out);
      // A warm room: a short generated reverb on a send.
      const len = Math.floor(ctx.sampleRate * 1.6);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.5;
      }
      const verb = ctx.createConvolver();
      verb.buffer = ir;
      const wet = ctx.createGain();
      wet.gain.value = 0.22;
      this.bus.connect(verb).connect(wet).connect(this.out);
      const n = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.timer = setInterval(() => this.schedule(), 25);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Stops the scheduler (the page is going away). */
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Plays `mood`, crossfading from the current arrangement at the next bar line. */
  play(mood: Mood): void {
    if (mood === this.mood && !this.pending) return;
    if (mood === this.pending) return;
    if (!this.mood) {
      this.mood = mood;
      this.arr = ARRANGEMENTS[mood];
      this.bar = 0;
      this.step = 0;
      this.nextTime = 0;
      return;
    }
    this.pending = mood;
    this.switchAt = (this.ctx?.currentTime ?? 0) + 0.5;
  }

  private level(): number {
    return this.muted ? 0 : this.volume * 0.5; // music sits under the effects
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || ctx.state !== 'running' || !this.mood) return;
    const now = ctx.currentTime;
    if (this.pending) {
      // Fade out, then start the new arrangement from its first bar.
      this.out.gain.setTargetAtTime(0, now, 0.12);
      if (now >= this.switchAt) {
        this.mood = this.pending;
        this.pending = null;
        this.arr = ARRANGEMENTS[this.mood];
        this.bar = 0;
        this.step = 0;
        this.nextTime = now + 0.05;
      } else return;
    }
    this.out.gain.setTargetAtTime(this.level(), now, 0.25);
    if (this.nextTime < now) this.nextTime = now + 0.05;
    const stepDur = 60 / this.arr.bpm / 4;
    while (this.nextTime < now + 0.15) {
      for (const n of notesAt(this.arr, this.bar, this.step)) this.voice(n, this.nextTime, (n.beats * 60) / this.arr.bpm);
      this.nextTime += stepDur;
      if (++this.step === 16) { this.step = 0; this.bar = (this.bar + 1) % 32; }
    }
  }

  // ---------------------------------------------------------------- voices

  private env(t: number, peak: number, attack: number, hold: number, release: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    g.connect(this.bus!);
    return g;
  }

  private osc(type: OscillatorType, f: number, t: number, end: number, to: AudioNode, detune = 0): OscillatorNode {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.detune.value = detune;
    o.connect(to);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  }

  /** A plucked string: Karplus-Strong, computed once per pitch and cached. */
  private pluckBuffer(midi: number): AudioBuffer {
    let b = this.plucks.get(midi);
    if (b) return b;
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 1.4);
    b = ctx.createBuffer(1, len, sr);
    const d = b.getChannelData(0);
    const period = Math.max(2, Math.round(sr / hz(midi)));
    const line = new Float32Array(period);
    let prev = 0;
    for (let i = 0; i < period; i++) { const r = Math.random() * 2 - 1; line[i] = (r + prev) / 2; prev = r; } // a slightly soft pick
    const decay = midi < 48 ? 0.996 : 0.994;
    for (let i = 0; i < len; i++) {
      const j = i % period;
      const next = line[(j + 1) % period];
      d[i] = line[j];
      line[j] = decay * 0.5 * (line[j] + next);
    }
    this.plucks.set(midi, b);
    return b;
  }

  private voice(n: NoteEvent, t: number, dur: number): void {
    const ctx = this.ctx!;
    const f = hz(n.midi);
    const v = n.vel;
    switch (n.inst) {
      case 'pluck': case 'bass': {
        const src = ctx.createBufferSource();
        src.buffer = this.pluckBuffer(n.midi);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = n.inst === 'bass' ? 900 : 5000;
        const g = this.env(t, (n.inst === 'bass' ? 0.55 : 0.32) * v, 0.003, Math.max(0.05, dur * 0.8), n.inst === 'bass' ? 0.25 : 0.6);
        src.connect(lp).connect(g);
        if (n.inst === 'bass') this.osc('sine', f, t, t + dur + 0.25, this.env(t, 0.22 * v, 0.005, dur * 0.7, 0.2)); // round sub
        src.start(t);
        src.stop(t + dur + 0.8);
        break;
      }
      case 'pulse': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 6;
        lp.frequency.setValueAtTime(1400, t);
        lp.frequency.exponentialRampToValueAtTime(280, t + dur);
        lp.connect(this.env(t, 0.16 * v, 0.004, dur * 0.5, 0.08));
        this.osc('sawtooth', f, t, t + dur + 0.1, lp);
        this.osc('sine', f, t, t + dur + 0.1, this.env(t, 0.25 * v, 0.004, dur * 0.5, 0.08));
        break;
      }
      case 'bell': {
        [1, 2, 3, 4.07, 5.2].forEach((r, i) => {
          this.osc('sine', f * r, t, t + 2.4, this.env(t, (0.16 / (i + 1)) * v, 0.002, 0.02, 1.8 / (1 + i * 0.5)));
        });
        break;
      }
      case 'brass': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.Q.value = 2;
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.exponentialRampToValueAtTime(3200, t + 0.06);
        lp.frequency.exponentialRampToValueAtTime(1600, t + 0.25);
        lp.connect(this.env(t, 0.13 * v, 0.03, Math.max(0.05, dur - 0.05), 0.12));
        const end = t + dur + 0.2;
        const vib = ctx.createOscillator();
        vib.frequency.value = 5.5;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, t);
        depth.gain.linearRampToValueAtTime(8, t + 0.3);
        vib.connect(depth);
        vib.start(t);
        vib.stop(end);
        for (const det of [-7, 6]) depth.connect(this.osc('sawtooth', f, t, end, lp, det).detune);
        break;
      }
      case 'strings': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2200;
        lp.connect(this.env(t, 0.05 * v, 0.25, Math.max(0.1, dur - 0.25), 0.5));
        for (const det of [-10, 0, 9]) this.osc('sawtooth', f, t, t + dur + 0.6, lp, det);
        break;
      }
      case 'kick': {
        const o = this.osc('sine', 160, t, t + 0.35, this.env(t, 0.9 * v, 0.002, 0.04, 0.28));
        o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        this.noiseHit(t, 'highpass', 3000, 0.012, 0.25 * v); // the beater click
        break;
      }
      case 'snare':
        this.noiseHit(t, 'bandpass', 2200, 0.16, 0.5 * v, 0.8);
        this.osc('triangle', 190, t, t + 0.12, this.env(t, 0.3 * v, 0.002, 0.01, 0.09));
        break;
      case 'hat':
        this.noiseHit(t, 'highpass', 8000, 0.035, 0.13 * v);
        break;
      case 'openhat':
        this.noiseHit(t, 'highpass', 7000, 0.22, 0.1 * v);
        break;
      case 'tom': {
        const o = this.osc('sine', f, t, t + 0.35, this.env(t, 0.5 * v, 0.002, 0.03, 0.28));
        o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.3);
        break;
      }
    }
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, decay: number, gain: number, q = 0.7): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.env(t, gain, 0.001, 0.005, decay));
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
  }
}
