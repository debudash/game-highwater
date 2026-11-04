// Synthesised sound effects (WebAudio), driven by the sim's per-tick events. Cosmetic only: sound
// never feeds back into game state. Nothing here is a recording: every sound is built at run time
// (brief: "generate all assets").
//
// The aim is "authentic", not chiptune: each event is modelled on the real thing it stands for
// (a cannon is a crack plus a low boom, a splash is falling noise plus bubbles, the hero is a
// wind-up tin toy that clanks and ratchets). The building blocks:
//   thump  a sine whose pitch falls fast (body of a hit, boom, thud)
//   burst  filtered noise with an envelope and an optional filter sweep (crack, whoosh, splash)
//   metal  a few inharmonic partials that ring and decay (clank, chain link, bell)
//   knock  a short resonant band of noise (wood)
//   bubble a sine that rises quickly (water)
//   horn   detuned saws through a lowpass (boat horn)
// Everything goes through one small outdoor reverb so the sounds share a space.

import type { EventType, GameEvent } from '../sim/game';
import { ROOM_PX_W } from '../sim/config';

type Voice = (s: Synth, t: number) => void;

/** Small random variation so a repeated sound never sounds stamped out. */
const vary = (v: number, by = 0.08) => v * (1 + (Math.random() * 2 - 1) * by);

class Synth {
  constructor(readonly ctx: AudioContext, readonly out: AudioNode, readonly noise: AudioBuffer) {}

  private env(t: number, peak: number, attack: number, decay: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.out);
    return g;
  }

  thump(t: number, from: number, to: number, decay: number, gain: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(vary(from), t);
    o.frequency.exponentialRampToValueAtTime(to, t + decay * 0.8);
    o.connect(this.env(t, gain, 0.004, decay));
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  burst(t: number, o: { type: BiquadFilterType; freq: number; to?: number; q?: number; attack?: number; decay: number; gain: number }): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = vary(1, 0.1);
    const f = this.ctx.createBiquadFilter();
    f.type = o.type;
    f.Q.value = o.q ?? 0.8;
    f.frequency.setValueAtTime(vary(o.freq), t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + (o.attack ?? 0.003) + o.decay);
    src.connect(f).connect(this.env(t, o.gain, o.attack ?? 0.003, o.decay));
    src.start(t, Math.random() * 1.5);
    src.stop(t + (o.attack ?? 0.003) + o.decay + 0.05);
  }

  metal(t: number, base: number, decay: number, gain: number, ratios = [1, 2.76, 5.4, 8.93]): void {
    const b = vary(base, 0.04);
    ratios.forEach((r, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = b * r;
      o.connect(this.env(t, gain / (i + 1), 0.002, decay / (1 + i * 0.6)));
      o.start(t);
      o.stop(t + decay + 0.05);
    });
    this.burst(t, { type: 'highpass', freq: 3000, decay: 0.012, gain: gain * 0.6 }); // the strike
  }

  knock(t: number, freq: number, gain: number, decay = 0.07): void {
    this.burst(t, { type: 'bandpass', freq, q: 6, decay, gain: gain * 3 });
    this.thump(t, freq * 0.5, freq * 0.35, decay * 0.8, gain * 0.6);
  }

  bubble(t: number, freq: number, gain: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    const f = vary(freq, 0.25);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 2.2, t + 0.05);
    o.connect(this.env(t, gain, 0.003, 0.05));
    o.start(t);
    o.stop(t + 0.08);
  }

  horn(t: number, freq: number, dur: number, gain: number, bendTo?: number): void {
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.06);
    g.gain.setValueAtTime(gain, t + dur - 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    lp.connect(g).connect(this.out);
    for (const d of [-6, 5]) {
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, t);
      if (bendTo) o.frequency.exponentialRampToValueAtTime(bendTo, t + dur);
      o.detune.value = d;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  /** Air rushing past: a band of noise sweeping up (or down). */
  whoosh(t: number, from: number, to: number, dur: number, gain: number): void {
    this.burst(t, { type: 'bandpass', freq: from, to, q: 1.4, attack: dur * 0.4, decay: dur * 0.6, gain });
  }

  /**
   * A bright run of bell strikes, one per note: the "reward" colour on good moments. Bells keep it
   * real-world (a dock bell, a castle bell) rather than chiptune, and the major-chord notes give
   * it lift.
   */
  sparkle(t: number, notes: number[], step: number, gain: number): void {
    notes.forEach((f, i) => this.metal(t + i * step, f, 0.5, gain, [1, 2, 3, 4.2]));
  }

  /** A run of quick clicks: a ratchet, a winch, a chain paying out. */
  clicks(t: number, n: number, gap: number, freq: number, gain: number, rising = 0): void {
    for (let i = 0; i < n; i++) this.knock(t + i * vary(gap, 0.15), freq * (1 + rising * i), gain, 0.025);
  }
}

// ---------------------------------------------------------------- the sounds

const SOUNDS: Record<EventType, Voice> = {
  // Tin tank: a spring-loaded hop, then a heavy landing with a rattle of the tracks.
  jump: (s, t) => { s.thump(t, 140, 60, 0.09, 0.3); s.metal(t + 0.01, 620, 0.1, 0.04); s.whoosh(t, 700, 2800, 0.14, 0.12); },
  land: (s, t) => { s.thump(t, 110, 45, 0.12, 0.4); s.burst(t, { type: 'lowpass', freq: 900, decay: 0.08, gain: 0.12 }); s.clicks(t + 0.02, 3, 0.025, 1800, 0.012); },
  // Cannon: a sharp crack, a low boom and the space answering.
  fire: (s, t) => { s.burst(t, { type: 'highpass', freq: 2200, decay: 0.04, gain: 0.45 }); s.burst(t, { type: 'bandpass', freq: 900, q: 1.2, decay: 0.08, gain: 0.3 }); s.thump(t, 170, 40, 0.25, 0.5); s.burst(t, { type: 'lowpass', freq: 2000, to: 200, decay: 0.35, gain: 0.15 }); s.metal(t + 0.02, 1300, 0.08, 0.03, [1, 2.4]); },
  shellPoof: (s, t) => s.burst(t, { type: 'lowpass', freq: 700, decay: 0.12, gain: 0.08 }),
  // The target board: a wooden knock as it's hit, a creak as it swings up.
  targetHit: (s, t) => { s.knock(t, 620, 0.16); s.knock(t + 0.03, 430, 0.09); s.sparkle(t + 0.05, [1047, 1319, 1568], 0.06, 0.05); s.burst(t + 0.08, { type: 'bandpass', freq: 900, to: 1500, q: 12, attack: 0.05, decay: 0.25, gain: 0.05 }); },
  // Drawbridge: the chain pays out, then the deck slams down.
  bridgeDown: (s, t) => { for (let i = 0; i < 9; i++) s.metal(t + i * 0.055, vary(900, 0.2), 0.08, 0.025, [1, 2.4, 4.1]); s.thump(t + 0.55, 80, 35, 0.3, 0.5); s.knock(t + 0.55, 300, 0.15, 0.12); s.sparkle(t + 0.62, [784, 1047], 0.07, 0.04); },
  // Charge release: a latch click and a short falling whistle.
  drop: (s, t) => {
    s.metal(t, 1400, 0.05, 0.03, [1, 2.2]);
    const o = s.ctx.createOscillator();
    const g = s.ctx.createGain();
    o.frequency.setValueAtTime(1500, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.025, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(s.out);
    o.start(t);
    o.stop(t + 0.4);
  },
  // Explosion: a rumble that closes down, a sub thump, debris.
  blast: (s, t) => { s.thump(t, 120, 30, 0.45, 0.65); s.burst(t, { type: 'highpass', freq: 1500, decay: 0.06, gain: 0.3 }); s.burst(t, { type: 'lowpass', freq: 4500, to: 150, decay: 0.7, gain: 0.45 }); s.clicks(t + 0.12, 4, 0.06, 2400, 0.01); },
  // Water: the slap, the spray settling, a few bubbles.
  splash: (s, t) => { s.burst(t, { type: 'bandpass', freq: 3500, to: 500, q: 0.7, decay: 0.35, gain: 0.3 }); s.thump(t, 200, 80, 0.08, 0.12); for (let i = 0; i < 4; i++) s.bubble(t + 0.08 + i * vary(0.05, 0.4), 500, 0.04); },
  // Fold between tank and chopper: a servo whir, then the parts lock with a clank.
  switch: (s, t) => { s.burst(t, { type: 'bandpass', freq: 500, to: 3000, q: 6, attack: 0.02, decay: 0.12, gain: 0.14 }); s.metal(t + 0.13, 760, 0.18, 0.07); s.thump(t + 0.13, 160, 70, 0.08, 0.2); },
  // Hook: the winch ratchets the load up, the hook catches.
  hook: (s, t) => { s.metal(t, 1100, 0.15, 0.06); s.clicks(t + 0.04, 6, 0.035, 2200, 0.03, 0.03); s.sparkle(t + 0.25, [1568, 2093], 0.06, 0.035); },
  setDown: (s, t) => { s.metal(t, 900, 0.08, 0.03, [1, 2.4]); s.knock(t + 0.03, 380, 0.1, 0.1); },
  // Boat home: two toots of its horn and the dock bell.
  rescue: (s, t) => { s.horn(t, 196, 0.24, 0.11); s.horn(t + 0.3, 262, 0.45, 0.11); s.sparkle(t + 0.1, [523, 659, 784, 1047, 1319], 0.07, 0.06); },
  // Portcullis: chains rattle while it grinds up, then it locks with a heavy clunk.
  gateOpen: (s, t) => {
    for (let i = 0; i < 12; i++) s.metal(t + i * 0.06, vary(700, 0.25), 0.07, 0.022, [1, 2.4, 4.1]);
    s.burst(t, { type: 'lowpass', freq: 300, to: 500, attack: 0.1, decay: 0.6, gain: 0.12 });
    s.thump(t + 0.75, 70, 35, 0.3, 0.45);
    s.metal(t + 0.75, 300, 0.4, 0.06);
    s.sparkle(t + 0.85, [523, 659, 784, 1047], 0.09, 0.055);
  },
  // The tin toy breaks: a crunch, a spring letting go, bits of tin.
  death: (s, t) => { s.burst(t, { type: 'bandpass', freq: 1500, to: 400, q: 1.5, decay: 0.25, gain: 0.3 }); s.thump(t, 150, 50, 0.2, 0.3); s.metal(t + 0.05, 260, 0.6, 0.05, [1, 1.5, 2.9]); s.clicks(t + 0.15, 5, 0.07, 3000, 0.012); },
  // Respawn: the wind-up key turning, ratchet clicks speeding up.
  respawn: (s, t) => { [0, 0.09, 0.16, 0.21, 0.25].forEach((d, i) => s.knock(t + d, 1600 + i * 150, 0.08, 0.03)); s.sparkle(t + 0.3, [784, 1175], 0.06, 0.04); },
  // Cactus: a wet rip as it's blown apart; a soft rustle as it grows back.
  cactusGone: (s, t) => { s.burst(t, { type: 'bandpass', freq: 1200, to: 300, q: 3, decay: 0.2, gain: 0.2 }); s.thump(t, 100, 50, 0.15, 0.2); },
  cactusSprout: (s, t) => s.burst(t, { type: 'highpass', freq: 3500, attack: 0.08, decay: 0.2, gain: 0.03 }),
  // Mine: a muffled underwater boom with a column of bubbles.
  mineClear: (s, t) => { s.thump(t, 70, 28, 0.5, 0.5); s.burst(t, { type: 'lowpass', freq: 600, to: 120, decay: 0.6, gain: 0.25 }); for (let i = 0; i < 8; i++) s.bubble(t + 0.1 + i * vary(0.045, 0.5), 350, 0.06); s.sparkle(t + 0.2, [880, 1109, 1319], 0.06, 0.045); },
  // Boat lost: it gurgles under and its horn sags.
  boatLost: (s, t) => { s.horn(t, 147, 0.9, 0.07, 98); for (let i = 0; i < 10; i++) s.bubble(t + 0.2 + i * vary(0.06, 0.5), 300, 0.04); },
  // Out of fuel: the engine coughs.
  fuelEmpty: (s, t) => { [0, 0.13, 0.3].forEach((d) => { s.burst(t + d, { type: 'lowpass', freq: 500, decay: 0.07, gain: 0.2 }); s.thump(t + d, 90, 50, 0.06, 0.15); }); },
  roomEnter: (s, t) => s.whoosh(t, 400, 2400, 0.4, 0.08),
  // A full loop of the rooms: the castle bell, twice.
  loop: (s, t) => { s.metal(t, 523, 1.6, 0.08, [1, 2.0, 3.0, 4.2, 5.4]); s.metal(t + 0.45, 392, 1.8, 0.08, [1, 2.0, 3.0, 4.2, 5.4]); s.sparkle(t + 0.9, [523, 659, 784, 1047, 1319, 1568], 0.07, 0.05); },
  // A jet shot down: a sharp hit, a sputtering engine, a crunch, and a bell for the points.
  jetDown: (s, t) => { s.burst(t, { type: 'highpass', freq: 2000, decay: 0.05, gain: 0.4 }); s.metal(t, 900, 0.25, 0.07, [1, 1.7, 2.9]); s.burst(t + 0.04, { type: 'bandpass', freq: 1800, to: 300, q: 2, decay: 0.45, gain: 0.25 }); s.thump(t + 0.3, 120, 40, 0.3, 0.4); s.sparkle(t + 0.1, [1047, 1568], 0.06, 0.045); },
  // A bomb released: the latch, then a falling whistle.
  bombDrop: (s, t) => {
    s.metal(t, 1600, 0.04, 0.03, [1, 2.2]);
    const o = s.ctx.createOscillator();
    const g = s.ctx.createGain();
    o.frequency.setValueAtTime(1900, t);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(g).connect(s.out);
    o.start(t);
    o.stop(t + 0.75);
  },
  // A bomb landing: a hard crack, a deep boom and dirt raining down.
  bombBlast: (s, t) => { s.burst(t, { type: 'highpass', freq: 1800, decay: 0.05, gain: 0.4 }); s.thump(t, 130, 32, 0.4, 0.6); s.burst(t, { type: 'lowpass', freq: 4000, to: 180, decay: 0.6, gain: 0.4 }); s.clicks(t + 0.15, 5, 0.05, 2600, 0.012); },
  // A dive jet lining up: a rising engine scream from above.
  diveWarn: (s, t) => { s.whoosh(t, 600, 2400, 0.8, 0.07); s.metal(t, 1760, 0.12, 0.03, [1, 2]); s.metal(t + 0.2, 1760, 0.12, 0.03, [1, 2]); },
  // The dive itself: a falling roar.
  dive: (s, t) => { s.whoosh(t, 3000, 500, 0.6, 0.14); s.burst(t, { type: 'lowpass', freq: 900, decay: 0.5, gain: 0.12 }); },
  // A gust: wind rising and falling.
  gust: (s, t) => { s.burst(t, { type: 'bandpass', freq: 500, to: 1400, q: 0.8, attack: 0.5, decay: 1.2, gain: 0.09 }); },
  // Room skipped: a soft whoosh onward.
  skip: (s, t) => s.whoosh(t, 300, 1800, 0.5, 0.08),
  // The last room left: the castle bells ring out.
  // The Bomber hit: a heavy metal clang with a burst, and a ringing of the airframe.
  bomberHit: (s, t) => { s.burst(t, { type: 'highpass', freq: 1600, decay: 0.06, gain: 0.45 }); s.metal(t, 420, 0.5, 0.09, [1, 1.5, 2.3, 3.4]); s.thump(t, 110, 38, 0.35, 0.55); s.burst(t + 0.03, { type: 'lowpass', freq: 3000, to: 250, decay: 0.5, gain: 0.3 }); },
  // The Bomber beaten: a long blast, its engines winding down, then a bright fanfare.
  bomberDown: (s, t) => { s.thump(t, 90, 28, 0.7, 0.7); s.burst(t, { type: 'lowpass', freq: 4500, to: 150, decay: 1.1, gain: 0.45 }); s.burst(t + 0.1, { type: 'bandpass', freq: 1400, to: 200, q: 3, decay: 1.4, gain: 0.2 }); s.sparkle(t + 0.6, [523, 659, 784, 1047, 1319], 0.09, 0.06); s.horn(t + 0.9, 262, 0.7, 0.08); },
  complete: (s, t) => { s.sparkle(t, [523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.12, 0.07); s.horn(t + 0.2, 196, 0.5, 0.08); s.horn(t + 0.8, 262, 0.8, 0.08); },
  // Crumbling floor: grit and falling stones.
  floorBreak: (s, t) => { s.burst(t, { type: 'lowpass', freq: 1200, to: 200, decay: 0.5, gain: 0.25 }); for (let i = 0; i < 6; i++) s.knock(t + i * vary(0.07, 0.4), vary(250, 0.3), 0.09, 0.06); },
};

/** A short outdoor reverb: decaying noise as an impulse response. */
function makeReverb(ctx: AudioContext): ConvolverNode {
  const len = Math.floor(ctx.sampleRate * 1.1);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const c = ctx.createConvolver();
  c.buffer = ir;
  return c;
}

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private rotor: { gain: GainNode; chop: OscillatorNode; whine: OscillatorNode } | null = null;
  muted = false;
  volume = 0.8;

  /** The audio context's state, for the browser check: 'none' until the first key press. */
  get state(): string { return this.ctx?.state ?? 'none'; }

  /** Browsers only allow audio after a user gesture: call from a key handler. */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
      const ctx = this.ctx;
      // Master chain, for punch and brightness: a high shelf for air, a soft-clip drive that
      // thickens transients, then a fast compressor and make-up gain so the mix sits loud and
      // even.
      this.master = ctx.createGain();
      const air = ctx.createBiquadFilter();
      air.type = 'highshelf';
      air.frequency.value = 3500;
      air.gain.value = 4;
      const drive = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * 1.8) / Math.tanh(1.8);
      }
      drive.curve = curve;
      drive.oversample = '2x';
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      const makeup = ctx.createGain();
      makeup.gain.value = 1.3;
      this.master.connect(air).connect(drive).connect(comp).connect(makeup).connect(ctx.destination);
      // Every sound feeds the bus; the bus feeds the master dry and the reverb wet.
      this.bus = ctx.createGain();
      const wet = ctx.createGain();
      wet.gain.value = 0.15; // a tighter space keeps hits punchy
      this.bus.connect(this.master);
      this.bus.connect(makeReverb(ctx)).connect(wet).connect(this.master);
      const n = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private out(pan: number): AudioNode {
    const p = this.ctx!.createStereoPanner();
    p.pan.value = Math.max(-0.7, Math.min(0.7, pan));
    p.connect(this.bus!);
    return p;
  }

  play(events: GameEvent[]): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noiseBuf || ctx.state !== 'running') return;
    this.master.gain.value = this.muted ? 0 : this.volume;
    const seen = new Set<EventType>();
    for (const e of events) {
      if (seen.has(e.type)) continue; // one voice per event kind per frame
      seen.add(e.type);
      SOUNDS[e.type]?.(new Synth(ctx, this.out((e.x / ROOM_PX_W) * 2 - 1), this.noiseBuf), ctx.currentTime + 0.005);
    }
  }

  /**
   * The chopper's rotor while flying: noise chopped at the blade-pass rate (the "whup-whup"),
   * plus a faint turbine whine. Thrust speeds the blades up.
   */
  setRotor(on: boolean, thrust: boolean): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus || !this.noiseBuf || ctx.state !== 'running') return;
    if (on && !this.rotor) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 420;
      bp.Q.value = 0.9;
      const am = ctx.createGain(); // gain swung by the chop LFO
      am.gain.value = 0.5;
      const chop = ctx.createOscillator();
      chop.type = 'sine';
      chop.frequency.value = 11;
      const depth = ctx.createGain();
      depth.gain.value = 0.5;
      chop.connect(depth).connect(am.gain);
      const whine = ctx.createOscillator();
      whine.type = 'sine';
      whine.frequency.value = 1250;
      const whineGain = ctx.createGain();
      whineGain.gain.value = 0.04;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(bp).connect(am).connect(gain);
      whine.connect(whineGain).connect(gain);
      gain.connect(this.bus);
      src.start();
      chop.start();
      whine.start();
      this.rotor = { gain, chop, whine };
    }
    if (this.rotor) {
      const t = ctx.currentTime;
      this.rotor.gain.gain.setTargetAtTime(on ? (thrust ? 0.22 : 0.14) : 0, t, 0.08);
      this.rotor.chop.frequency.setTargetAtTime(thrust ? 14 : 10.5, t, 0.15);
      this.rotor.whine.frequency.setTargetAtTime(thrust ? 1450 : 1200, t, 0.2);
    }
  }
}
