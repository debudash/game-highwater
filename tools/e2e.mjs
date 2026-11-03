// Browser end-to-end check against the Docker-served build (default http://localhost:8138).
// A bot plays both feel-check test rooms inside the real page through synthetic key events (the
// same policies as tests/bots.ts, ported to plain JS), then the script tours every stage room and
// screenshots it, checks the frame rate, pause and console errors, and saves screenshots.
// The page is opened with ?rooms=test&debug: the 2D view then plays the test rooms and offers
// window.highWaterDebug.goto(room) / .stages() (src/view2d/world2d.ts). Every stage room's full
// solution is proven by the bots in tests/stagebots.ts (vitest); this tour checks they draw.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:8138';
const out = process.argv[3] ?? 'e2e-shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.stack ?? String(e)));

// --- Gameplay (stages agent): open with the test-room and debug flags.
await page.goto(url + (url.includes('?') ? '&' : '?') + 'rooms=test&debug');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/0-start.png` });

const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / 2); };
  requestAnimationFrame(f);
}));

// --- Start of run (UI agent): the landing page opens with PLAY selected, so Enter starts the run.
// A fresh browser profile has no save, so PLAY is the first item. Fail fast if play didn't start.
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.highWater.phase() === 'playing', null, { timeout: 5000 });
await page.waitForTimeout(200);
// --- End of start of run.

// Install the in-page bot.
await page.evaluate(() => {
  const T = 16;
  const KEY = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'KeyZ', action: 'KeyX', switch: 'KeyC' };
  const solid = (room, c, r) => {
    if (c < 0) return true;
    if (c >= 20 || r < 0 || r >= 10) return false;
    const ch = room.tiles[r][c];
    if (ch === '#' || ch === 'H' || ch === 'x' || ch === 'W') return true;
    if (ch === '=') return room.bridgesDown;
    if (ch === 'G') return !room.gateOpen;
    return false;
  };
  const obstacleAhead = (g) => {
    const p = g.player;
    const col = Math.floor((p.x + p.w + 10) / T);
    const feet = Math.floor((p.y + p.h - 1) / T);
    const cactus = g.room.cacti.some((k) => k.grown && k.col === col && k.row === feet);
    return !solid(g.room, col, feet + 1) || solid(g.room, col, feet) || cactus;
  };
  let stage = 0;
  const room1 = (g) => {
    const p = g.player; const x = p.x + p.w / 2;
    if (!g.room.bridgesDown && x >= 11 * T) {
      const want = 11 * T + 8;
      if (!p.onGround) return { held: [] };
      if (x > want + 2) return { held: ['left'] };
      if (x < want - 2) return { held: ['right'] };
      return { held: [], press: g.shell ? [] : ['action'] };
    }
    const jump = (p.onGround && obstacleAhead(g)) || (!p.onGround && p.vy < 0);
    return { held: jump ? ['right', 'jump'] : ['right'] };
  };
  const room2 = (g) => {
    const p = g.player; const x = p.x + p.w / 2;
    const boat = g.room.items.find((i) => i.kind === 'boat');
    const cactus = g.room.cacti[0];
    const keys = [];
    const fly = (tx, ty) => {
      if (x < tx - 2) keys.push('right'); else if (x > tx + 2) keys.push('left');
      if (p.y > ty || p.vy > 50) keys.push('jump');
    };
    if (stage === 0 && p.body === 'tank') return { held: [], press: ['switch'] };
    if (stage === 0) {
      fly(11 * T + 8, 2 * T);
      if (Math.abs(x - (11 * T + 8)) < 3 && !g.charge && cactus.grown) return { held: keys, press: ['action'] };
      if (!cactus.grown) stage = 1;
    } else if (stage === 1) {
      fly(boat.x + boat.w / 2, boat.y - p.h - 20);
      if (p.carrying) stage = 2;
    } else if (stage === 2) {
      fly(17 * T + 8, 3 * T);
      if (Math.abs(x - (17 * T + 8)) < 4) stage = 3;
    } else if (stage === 3) {
      if (p.y >= 4 * T) keys.push('jump');
      if (Math.abs(p.vx) < 5 && p.carrying) return { held: keys, press: ['action'] };
      if (!p.carrying) stage = 4;
    } else {
      if (!p.onGround) return { held: [] };
      if (p.body === 'chopper') return { held: [], press: ['switch'] };
      return { held: ['right'] };
    }
    return { held: keys };
  };
  let down = new Set();
  const send = (type, b) => window.dispatchEvent(new KeyboardEvent(type, { code: KEY[b], key: KEY[b] }));
  window.__bot = { running: true, stage: () => stage };
  const loop = () => {
    if (!window.__bot.running) { for (const b of down) send('keyup', b); down.clear(); return; }
    const g = window.highWater.state();
    if (window.highWater.phase() === 'playing' && g.player.deadTicks === 0) {
      const r = (g.room.index === 0 ? room1 : room2)(g);
      const want = new Set(r.held);
      for (const b of r.press ?? []) { if (down.has(b)) { send('keyup', b); down.delete(b); } send('keydown', b); send('keyup', b); }
      for (const b of down) if (!want.has(b)) { send('keyup', b); down.delete(b); }
      for (const b of want) if (!down.has(b)) { send('keydown', b); down.add(b); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

const state = () => page.evaluate(() => {
  const g = window.highWater.state();
  return { phase: window.highWater.phase(), quality: window.highWater.quality(), room: g.room.index, deaths: g.deaths, score: g.score, roomPoints: g.roomPoints, bridges: g.room.bridgesDown, boatsHome: g.room.boatsHome, carrying: !!g.player.carrying, body: g.player.body, loops: g.loops, stage: window.__bot.stage() };
});
async function until(pred, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const s = await state(); if (pred(s)) return true; await page.waitForTimeout(25); }
  return false;
}

const report = { fps, checkpoints: {} };
const mark = async (name, ok) => { report.checkpoints[name] = { ok, ...(await state()) }; };

await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/1-room1-run.png` });
await mark('bridge lowered', await until((s) => s.bridges, 15000));
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/2-room1-bridge.png` });
await mark('room 2 entered', await until((s) => s.room === 1, 10000));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/3-room2.png` });
await mark('boat hooked', await until((s) => s.carrying, 15000));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/4-room2-carrying.png` });
await mark('boat rescued', await until((s) => s.boatsHome > 0, 15000));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/5-room2-rescue.png` });
await mark('looped to room 1', await until((s) => s.loops > 0, 10000));
await page.evaluate(() => { window.__bot.running = false; });
await page.waitForTimeout(300);

// Tour every stage room: jump there, let jets, wind and water run a moment, screenshot it.
await page.evaluate(() => window.highWaterDebug.stages());
const ids = await page.evaluate(() => window.highWaterDebug.rooms());
const toured = [];
for (const id of ids) {
  await page.evaluate((id) => window.highWaterDebug.goto(id), id);
  await page.waitForTimeout(id.startsWith('2-') || id.startsWith('5-') ? 2400 : 1500);
  await page.screenshot({ path: `${out}/stage-${id}.png` });
  const s = await page.evaluate(() => ({ id: window.highWater.state().room.def.id, phase: window.highWater.phase() }));
  toured.push({ id, ok: s.id === id && s.phase === 'playing' });
}
report.stageTour = toured.filter((t) => !t.ok);
report.checkpoints['every stage room drawn'] = { ok: toured.length === 20 && toured.every((t) => t.ok), rooms: toured.length };

// Pause
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/6-paused.png` });
report.pausedPhase = (await state()).phase;
await page.keyboard.press('Escape');

// Sound ran for the whole bot run (Chrome is launched with autoplay allowed), so a broken sound
// recipe would have thrown into the console errors above.
report.audio = await page.evaluate(() => window.highWater.audio());
report.consoleErrors = errors;
console.log(JSON.stringify(report, null, 2));
const failed = Object.values(report.checkpoints).some((c) => !c.ok) || errors.length > 0 || report.pausedPhase !== 'paused' || report.audio !== 'running';
await browser.close();
process.exit(failed ? 1 : 0);
