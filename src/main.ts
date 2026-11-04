// Browser shell: keys → bindings → InputCollector, requestAnimationFrame → FrameClock → sim ticks,
// and the screens around play: the landing page, Settings, pause, the skip offer and the results
// card (src/ui/screens.ts). Also the HUD, sound effects, music, saving and the best score.

import { Help } from './sim/config';
import { Autoplay } from './sim/autoplay';
import { createGame, Game, GameEvent, RoomState, tick } from './sim/game';
import { FrameClock, InputCollector } from './sim/input';
import { actionFor, loadSettings, saveSettings } from './settings';
import * as Run from './ui/run';
import { BOATS_IN_GAME, canSkip, currentStage, FINALE, firstRoomOfStage, runFinished, simKeepsTally, skipRoom, stageOf } from './ui/run';
import { clearSave, loadBest, loadSave, recordBest, writeSave } from './ui/save';
import { Ui } from './ui/screens';
import { drawTitleBackdrop, TitleArt } from './ui/title';
import { Sound } from './view/audio';
import { Hud } from './view/hud';
import { Mood, Music } from './view/music';
import { World } from './view/scene';
import { World2D } from './view2d/world2d';

const settings = loadSettings();
const gl = document.getElementById('world') as HTMLCanvasElement;
const uiCanvas = document.getElementById('ui') as HTMLCanvasElement;
const uiCtx = uiCanvas.getContext('2d')!;
const hudCanvas = document.getElementById('hud') as HTMLCanvasElement;
// Look B is the game's look (Debu, 2026-11-03): the 2D view with the generated pixel-art sprites.
// The old 3D diorama stays reachable at ?look=3d (and ?look=pixel) for comparison only. Both views
// offer the same surface, so the rest of this file doesn't care which one runs.
type View = Pick<World, 'update' | 'render' | 'resize' | 'project' | 'setQuality' | 'currentQuality' | 'shakeOn'>;
const look = new URLSearchParams(location.search).get('look');
const world: View = look === '3d' || look === 'pixel' ? new World(gl) : new World2D(gl);
const hud = new Hud(hudCanvas);
const sound = new Sound();
const music = new Music();
const titleArt = new TitleArt();
const clock = new FrameClock();
const input = new InputCollector();

let game: Game = createGame();

/**
 * Watch mode: ?autoplay lets a bot play the whole run (src/sim/autoplay.ts); ?autoplay=2 plays it
 * at double speed. Press Enter on the landing page to start it (that also lets the sound start).
 */
const params = new URLSearchParams(location.search);
const autoplay = params.has('autoplay') ? new Autoplay() : null;
const autoSpeed = Math.max(1, Math.min(4, Number(params.get('autoplay')) || 1));
hud.badge = autoplay ? 'AUTOPLAY' : null;

/** The run's figures that the sim doesn't keep: boats brought home, rooms skipped. */
const run = { boats: 0, skipped: [] as string[], stage: -1, nextSkipOffer: Help.skipDeaths, roomIndex: -1 };

function applySettings(): void {
  sound.volume = settings.sfx;
  music.volume = settings.music;
  world.shakeOn = settings.shake;
}
applySettings();

const ui = new Ui(hud, settings, {
  play: () => startRun(null),
  continueRun: () => startRun(loadSave()),
  resume: () => { ui.open('playing'); clock.reset(performance.now()); },
  restartRoom: () => {
    // A fresh copy of the room; the run's banked score, deaths and loops carry on.
    if (!Run.restartRoom(game)) {
      const g = createGame({ rooms: game.rooms, startRoom: game.room.index });
      Object.assign(g, { score: game.score, deaths: game.deaths, loops: game.loops, entryBody: game.entryBody });
      g.player.body = game.entryBody;
      game = g;
    }
    input.releaseAll();
    ui.open('playing');
    clock.reset(performance.now());
  },
  quitToTitle: () => toTitle(),
  skip: (yes) => {
    if (yes) {
      if (!simKeepsTally(game)) run.skipped.push(game.room.def.name);
      skipRoom(game);
    } else {
      run.nextSkipOffer = game.roomDeaths + Help.skipDeaths;
    }
    ui.open('playing');
    clock.reset(performance.now());
  },
  playAgain: () => startRun(null),
  settingsChanged: () => { saveSettings(settings); applySettings(); },
});

function toTitle(): void {
  game = createGame();
  input.releaseAll();
  ui.hasSave = loadSave() !== null;
  ui.best = loadBest();
  ui.open('title');
}

function startRun(save: ReturnType<typeof loadSave>): void {
  game = createGame();
  if (save) {
    if (!Run.goToRoom(game, save.room)) game = createGame({ startRoom: save.room });
    Object.assign(game, { score: save.score, deaths: save.deaths });
    if (simKeepsTally(game)) Object.assign(game, { boatsSaved: save.boats, hiddenSaved: 0, skipped: [...save.skipped] });
  }
  run.boats = save?.boats ?? 0;
  run.skipped = [...(save?.skipped ?? [])];
  run.stage = -1;
  run.roomIndex = -1;
  input.releaseAll();
  ui.open('playing');
  clock.reset(performance.now());
}

toTitle();

function fit(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  gl.style.width = `${w}px`;
  gl.style.height = `${h}px`;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  uiCanvas.width = Math.round(w * dpr);
  uiCanvas.height = Math.round(h * dpr);
  uiCanvas.style.width = `${w}px`;
  uiCanvas.style.height = `${h}px`;
  world.resize(w, h);
  hud.resize(w, h);
}
window.addEventListener('resize', fit);
fit();

window.addEventListener('keydown', (e) => {
  const b = actionFor(settings.bindings, e.code);
  if (b || e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow') || e.code === 'Backspace') e.preventDefault();
  sound.unlock();
  music.unlock();
  // Settings gets every key first, so any key (even M) can be bound there.
  if (ui.screen === 'settings') { ui.key(e.code, e.repeat); return; }
  if (e.code === 'KeyM' && !e.repeat) {
    sound.muted = music.muted = !sound.muted;
    return;
  }
  if (ui.screen === 'playing') {
    if (e.code === 'Escape' && !e.repeat) { ui.open('paused'); input.releaseAll(); return; }
    if (b && !e.repeat) input.keyDown(b, e.code);
    return;
  }
  ui.key(e.code, e.repeat);
});

window.addEventListener('keyup', (e) => {
  const b = actionFor(settings.bindings, e.code);
  if (b) input.keyUp(b, e.code);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && ui.screen === 'playing') {
    ui.open('paused');
    input.releaseAll();
  }
});

/** The music for where the player is (design: the tone arc). Dawn rooms are the Bomber's. */
function moodFor(): Mood {
  if (ui.screen === 'title') return 'title';
  if (ui.screen === 'results') return 'ending';
  const def = game.room.def;
  if (stageOf(def) === FINALE) return 'bomber';
  return def.light === 'dawn' ? 'bomber' : def.light;
}

/** Called every frame in play: stage changes (banner + save), boats, the skip offer, the end. */
function followRun(events: GameEvent[], before: RoomState): void {
  if (!simKeepsTally(game) && game.room !== before && events.some((e) => e.type === 'roomEnter' || e.type === 'loop')) run.boats += before.boatsHome;
  if (game.room.index !== run.roomIndex) {
    run.roomIndex = game.room.index;
    run.nextSkipOffer = Help.skipDeaths;
  }
  const stage = currentStage(game);
  if (stage.index !== run.stage) {
    run.stage = stage.index;
    ui.showBanner(stage.name, stage.index === FINALE ? 'THE FINALE' : `STAGE ${stage.index + 1}`);
    writeSave({
      room: firstRoomOfStage(game.rooms, stage.index), stage: stage.index, score: game.score, deaths: game.deaths,
      boats: Run.boatsSaved(game, run.boats), skipped: Run.skippedRooms(game, run.skipped),
    });
  }
  if (runFinished(game, events)) {
    finishRun();
    return;
  }
  if (canSkip() && game.roomDeaths >= run.nextSkipOffer && game.player.deadTicks === 0) {
    ui.open('skip');
    input.releaseAll();
  }
}

function finishRun(): void {
  const score = game.score + game.roomPoints;
  const best = loadBest();
  ui.results = {
    score, best: recordBest(score), newBest: score > best,
    boats: simKeepsTally(game) ? Run.boatsSaved(game, 0) : run.boats + game.room.boatsHome,
    boatsInGame: BOATS_IN_GAME, deaths: game.deaths, skipped: Run.skippedRooms(game, run.skipped),
  };
  clearSave();
  ui.hasSave = false;
  ui.open('results');
  input.releaseAll();
}

// Automatic graphics quality: if frames run slow for a while, drop to the lighter setting.
let slowFrames = 0;
let last = performance.now();
let titleTime = 0;
let uiDirty = true;

function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const events: GameEvent[] = [];
  if (ui.screen === 'playing') {
    const before = game.room;
    const n = clock.advance(now);
    for (const ti of input.takeFrame(n)) {
      if (!autoplay) {
        tick(game, ti);
        events.push(...game.events);
        continue;
      }
      for (let k = 0; k < autoSpeed && !game.complete; k++) {
        tick(game, autoplay.next(game));
        events.push(...game.events);
      }
    }
    followRun(events, before);
  }
  // The landing page, Settings opened from it, and the results card sit on the dawn backdrop.
  const title = ui.screen === 'title' || ui.screen === 'results' || (ui.screen === 'settings' && !game.tick);
  // Behind the landing page and results card the game view is covered, so it isn't drawn.
  if (!title) {
    world.update(game, events, ui.screen === 'playing' ? clock.alpha : 1, dt);
    world.render();
  }

  // The landing page's backdrop at full resolution; cleared once play starts.
  let logoBottom: number | null = null;
  if (title) {
    titleTime += dt;
    const r = drawTitleBackdrop(uiCtx, titleArt, uiCanvas.width, uiCanvas.height, titleTime, ui.screen !== 'results');
    logoBottom = r.logo ? r.logoBottom / (uiCanvas.width / window.innerWidth) : null;
    uiDirty = true;
  } else if (uiDirty) {
    uiCtx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
    uiDirty = false;
  }

  hud.addPopups(events);
  if (title) hud.clear();
  else hud.draw(game, settings.bindings, (px, py) => world.project(px, py, window.innerWidth, window.innerHeight), dt, null, ui.screen === 'playing');
  ui.draw(dt, logoBottom);

  sound.play(events);
  const p = game.player;
  sound.setRotor(ui.screen === 'playing' && p.body === 'chopper' && p.deadTicks === 0, p.fuel > 0 && p.vy < 0);
  music.play(moodFor());

  if (settings.quality === 'auto' && world.currentQuality === 'high') {
    slowFrames = dt > 0.024 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames > 90) world.setQuality('low');
  } else if (settings.quality !== 'auto') {
    world.setQuality(settings.quality);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Read-only hook for the browser end-to-end check (tools/e2e.mjs) and screenshots.
(window as unknown as { highWater: object }).highWater = {
  state: () => game,
  phase: () => ui.screen,
  quality: () => world.currentQuality,
  audio: () => sound.state,
  music: () => music.current,
  restart: () => { game = createGame(); },
  /** Ends the run now and shows the results card (for screenshots). */
  finish: () => finishRun(),
};
