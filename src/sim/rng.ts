// Seeded RNG (mulberry32). The state lives in the game state so a run is fully reproducible
// from its seed; each new run takes a fresh seed from the platform (rulebook §5 Restart, SD-A).

export interface RngHolder {
  rngState: number;
}

export function rngNext(h: RngHolder): number {
  const a = (h.rngState = (h.rngState + 0x6d2b79f5) | 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(h: RngHolder, n: number): number {
  return Math.floor(rngNext(h) * n);
}

export function freshSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] | 0;
}
