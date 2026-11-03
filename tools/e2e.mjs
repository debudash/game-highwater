// Browser end-to-end check against the Docker-served build (default http://localhost:8137).
// Drives the real game through the keyboard with a simple bot: clears level 1, plays on,
// checks the hidden-tab pause, frame rate and console errors, and saves screenshots.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:8137';
const out = process.argv[3] ?? 'e2e-shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.stack ?? String(e)));

await page.goto(url);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/1-title.png` });
const state = () => page.evaluate(() => {
  const g = window.riverGuard.state();
  return {
    phase: window.riverGuard.phase(), tick: g.tick, score: g.score, lives: g.lives, drowned: g.drowned,
    level1: g.level1.active, crisis: g.crisis, mode: g.player.mode, col: g.player.col,
    boat: g.boat && { col: g.boat.col, hooked: g.boat.hooked }, mine: g.mine && { col: g.mine.col },
    jets: g.jets.map((j) => ({ col: j.col, row: j.row, path: j.path })),
    bombs: g.bombs.map((b) => ({ col: b.col, row: b.row })), shell: !!g.shell, lock: g.player.lockLeft,
    minesUnlocked: g.minesUnlocked, gameOver: g.gameOver,
  };
});

// Frame rate on the title screen
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); };
  requestAnimationFrame(f);
}));

await page.keyboard.press('Enter'); // start (consumed)
const s0 = await state();
const report = { fps, startPhase: s0.phase, level1ClearedAtTick: null, shots: [], maxScore: 0 };

const held = new Set();
async function setHeld(keys) {
  for (const k of [...held]) if (!keys.includes(k)) { await page.keyboard.up(k); held.delete(k); }
  for (const k of keys) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
}
async function tapKey(k) { await page.keyboard.down(k); await page.waitForTimeout(25); await page.keyboard.up(k); }

const threatened = (s, c) => s.bombs.some((b) => b.col === c && b.row >= 4 && b.row <= 9)
  || s.jets.some((j) => j.path === 'dive' && j.col === c && j.row >= 5 && j.row <= 9);

async function pauseCheck() {
// Hidden-tab pause: no ticks while hidden, PRESS ANY KEY on return, resume press consumed.
const before = await state();
{
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1500);
  const paused = await state();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.screenshot({ path: `${out}/5-paused.png` });
  report.pause = { phase: paused.phase, ticksWhileHidden: paused.tick - before.tick };
  await tapKey('m'); // RG-005: M must resume like any key
  await page.waitForTimeout(300);
  const resumed = await state();
  report.pause.resumedPhase = resumed.phase;
}
}

let shotTaken = { l1: false, mid: false };
let pauseChecked = false;
const t0 = Date.now();
while (Date.now() - t0 < 90_000) {
  const s = await state();
  report.maxScore = Math.max(report.maxScore, s.score);
  if (s.phase !== 'playing') break;
  if (!pauseChecked && s.tick >= 300) { pauseChecked = true; await setHeld([]); await pauseCheck(); continue; }
  if (!s.level1 && report.level1ClearedAtTick === null) {
    report.level1ClearedAtTick = s.tick;
    await page.screenshot({ path: `${out}/3-level1-clear.png` });
  }
  if (s.crisis === 'Boat' && s.boat && !shotTaken.l1 && s.mode !== 'tank') {
    await page.screenshot({ path: `${out}/2-rescue.png` });
    shotTaken.l1 = true;
  }
  if (!shotTaken.mid && s.score >= 1500) {
    await page.screenshot({ path: `${out}/4-normal-play.png` });
    shotTaken.mid = true;
  }
  if (s.mode === 'chopperFree' || s.mode === 'chopperHooked') {
    const target = s.mode === 'chopperFree' ? s.boat?.col ?? s.col : (s.col <= 8 ? 0 : 17);
    if (s.mode === 'chopperFree' && s.col === target) { await setHeld([]); await tapKey('ArrowDown'); }
    else await setHeld([target < s.col ? 'ArrowLeft' : 'ArrowRight']);
  } else if (s.crisis === 'Boat' && s.lock === 0) {
    await setHeld([]); await tapKey('ArrowDown');
  } else {
    // Dodge, then line up under the lowest jet and fire.
    let want = s.col;
    if (threatened(s, s.col)) {
      const opts = [s.col - 1, s.col + 1, s.col - 2, s.col + 2].filter((c) => c >= 0 && c < 18 && !threatened(s, c));
      if (opts.length) want = opts[0];
    } else if (s.jets.length) {
      const j = [...s.jets].sort((a, b) => b.row - a.row)[0];
      const lead = j.path === 'cross' ? Math.round(j.col + (j.col < s.col ? 1 : -1)) : j.col;
      if (!threatened(s, lead)) want = Math.max(0, Math.min(17, lead));
    }
    if (s.mine && s.minesUnlocked && Math.abs(s.mine.col - s.col) === 1) await tapKey('ArrowUp');
    await setHeld(want < s.col ? ['ArrowLeft'] : want > s.col ? ['ArrowRight'] : []);
    if (!s.shell && s.jets.length) await tapKey(' ');
  }
  await page.waitForTimeout(40);
}
await setHeld([]);

const end = await state();
await page.screenshot({ path: `${out}/6-end.png` });
report.end = { phase: end.phase, score: end.score, lives: end.lives, drowned: end.drowned, tick: end.tick, gameOver: end.gameOver };
report.consoleErrors = errors;
console.log(JSON.stringify(report, null, 2));
await browser.close();
