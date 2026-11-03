// Browser shell: keyboard → InputCollector, requestAnimationFrame → FrameClock → sim ticks,
// visibility pause (rulebook §9 Hidden tab / Resume), best score, and the integer-scaled canvas.

import { Layout } from './sim/config';
import { Game, GameEvent, createGame, markResumed, tick } from './sim/game';
import { Button, FrameClock, InputCollector } from './sim/input';
import { freshSeed } from './sim/rng';
import { Overlay, render } from './view/render';
import { Sound } from './view/audio';

const KEYS: Record<string, Button> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ' ': 'fire',
  Spacebar: 'fire',
};

type Phase = 'title' | 'playing' | 'paused' | 'over';

const canvas = document.getElementById('screen') as HTMLCanvasElement;
canvas.width = Layout.canvasW;
canvas.height = Layout.canvasH;
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

const clock = new FrameClock();
const input = new InputCollector();
const sound = new Sound();

let game: Game = createGame({ seed: freshSeed() });
let phase: Phase = 'title';
let overAt = 0;
let best = loadBest();

function loadBest(): number {
  try {
    return Number(localStorage.getItem('riverguard.best') ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score: number): void {
  if (score <= best) return;
  best = score;
  try {
    localStorage.setItem('riverguard.best', String(score));
  } catch {
    /* storage blocked: best lives for this session only */
  }
}

/** Largest whole-number scale that fits the window, nearest-neighbour, centred (§3 Display). */
function fit(): void {
  const s = Math.max(1, Math.floor(Math.min(window.innerWidth / Layout.canvasW, window.innerHeight / Layout.canvasH)));
  canvas.style.width = `${Layout.canvasW * s}px`;
  canvas.style.height = `${Layout.canvasH * s}px`;
}
window.addEventListener('resize', fit);
fit();

function overlayFor(p: Phase): Overlay | null {
  const pad = (n: number) => String(n).padStart(6, ' ');
  if (p === 'title') return { lines: ['RIVER GUARD', '', 'PRESS ANY KEY'] };
  if (p === 'paused') return { lines: ['PRESS ANY KEY'] };
  if (p === 'over') {
    const lines = ['GAME OVER', `SCORE ${pad(game.score)}`, `BEST  ${pad(best)}`];
    if (performance.now() - overAt > 1000) lines.push('', 'PRESS ANY KEY');
    return { lines };
  }
  return null;
}

function startPlaying(now: number, resumeKey: Button | null): void {
  input.discardForResume(resumeKey);
  clock.reset(now);
  phase = 'playing';
}

window.addEventListener('keydown', (e) => {
  const b = KEYS[e.key];
  if (b || e.key === 'Tab') e.preventDefault();
  sound.unlock();
  if (e.key === 'm' || e.key === 'M') {
    sound.muted = !sound.muted;
    // RG-005: M used to return here, so it could not resume a paused game; §9 says any key resumes.
    // M stays a non-game key in play, but on an overlay it falls through like any other key.
    if (phase === 'playing') return;
  }
  if (e.repeat && phase !== 'playing') return;
  const now = performance.now();
  switch (phase) {
    case 'title':
      startPlaying(now, b ?? null); // the starting press is consumed
      return;
    case 'paused':
      markResumed(game); // held Left/Right act as a new press on the first tick
      startPlaying(now, b ?? null);
      return;
    case 'over':
      if (now - overAt < 1000) return;
      game = createGame({ seed: freshSeed() }); // a restart is a fresh run with a fresh seed (§5)
      startPlaying(now, b ?? null);
      return;
    case 'playing':
      if (b) input.keyDown(b);
  }
});

window.addEventListener('keyup', (e) => {
  const b = KEYS[e.key];
  if (b) input.keyUp(b);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && phase === 'playing') {
    phase = 'paused';
    input.suspend();
  }
});

function frame(now: number): void {
  if (phase === 'playing') {
    const n = clock.advance(now);
    const events: GameEvent[] = [];
    for (const ti of input.takeFrame(n)) {
      tick(game, ti);
      events.push(...game.events);
      if (game.gameOver) {
        saveBest(game.score);
        phase = 'over';
        overAt = now;
        break;
      }
    }
    sound.play(events);
  }
  render(ctx, game, overlayFor(phase));
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Read-only hook for the browser end-to-end test (tools/e2e.mjs).
(window as unknown as { riverGuard: object }).riverGuard = {
  state: () => game,
  phase: () => phase,
};
