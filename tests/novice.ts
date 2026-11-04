// A simulated new player, for estimating how long the game takes someone who has never played it
// (Debu: "I am not a gamer - have an agent play it ... make this 8-10 mins long").
//
// It drives each room with that room's stage bot (tests/stagebots.ts), which knows the route, but
// plays it with human limits:
// - It reads before it moves: a pause on entering a room for its messages, longer on a stage's
//   first room (a new idea), and a short regroup after each death.
// - It sees the ground in time (a person plans for a gap they can see coming), but it sees threats
//   late: jets, bombs and the Bomber reach it `react` ticks after they happen (about 250-450 ms),
//   so it dodges late and aims behind a moving target.
// - Its hands are a little slow: every input lands `motor` ticks late (about 30-120 ms), re-rolled
//   every attempt, so a tight jump or a precise drop sometimes fails.
// - It hesitates: now and then it lets go of everything for a moment.
// - It learns: after each death in a room its reactions and hands get 15% quicker there, down to
//   a practised player's (it has seen what's coming).
// - It takes the skip offer after Help.skipDeaths deaths in a room, as the game suggests.
// Every death costs the respawn and a replay of the room from its entrance, as in the real game.
// The numbers are a model, not a measurement: the first stranger playtest calibrates them.

import { Death, Help } from '../src/sim/config';
import { createGame, Game, tick } from '../src/sim/game';
import { Button } from '../src/sim/input';
import { randInt, rngNext, RngHolder } from '../src/sim/rng';
import { GAME_ROOMS } from '../src/sim/stages';
import { input } from './helpers';
import { STAGE_BOTS } from './stagebots';

export interface Profile {
  name: string;
  /** Reaction time to threats (ticks): it sees jets, bombs and the Bomber this late. */
  reactMin: number;
  reactMax: number;
  /** Slop in its hands (ticks): every input lands this late. */
  motorMin: number;
  motorMax: number;
  /** Chance per tick of a hesitation, and its length range (ticks). */
  hesitate: number;
  hesitateMin: number;
  hesitateMax: number;
  /** Reading time on entering a room: a base, per message line, and extra on a stage's first room. */
  readBase: number;
  readPerLine: number;
  newIdea: number;
  /** Pause after a death before moving again (on top of the respawn). */
  regroup: number;
}

const s = (sec: number) => Math.round(sec * 60);

/** The floor that learning brings a player down to. */
const PRACTISED = { react: s(0.18), motor: s(0.02) };

/** Someone who doesn't play games: slow to react, reads everything, hesitates. */
export const NOVICE: Profile = {
  name: 'novice', reactMin: s(0.25), reactMax: s(0.45), motorMin: s(0.03), motorMax: s(0.12), hesitate: 0.004, hesitateMin: s(0.2), hesitateMax: s(0.6),
  readBase: s(1.5), readPerLine: s(1.8), newIdea: s(4), regroup: s(0.8),
};

/** Someone who plays now and then. */
export const CASUAL: Profile = {
  name: 'casual', reactMin: s(0.18), reactMax: s(0.3), motorMin: s(0.02), motorMax: s(0.07), hesitate: 0.002, hesitateMin: s(0.15), hesitateMax: s(0.4),
  readBase: s(1), readPerLine: s(1), newIdea: s(2), regroup: s(0.4),
};

type Threats = Pick<Game['room'], 'jets' | 'bombs' | 'bomber'>;

const threats = (g: Game): Threats => structuredClone({ jets: g.room.jets, bombs: g.room.bombs, bomber: g.room.bomber });

/** The game as the player sees it: everything now, except the threats, which are `react` ticks old. */
function lateView(g: Game, old: Threats): Game {
  return { ...g, room: { ...g.room, ...old } };
}

export interface RoomResult { id: string; seconds: number; deaths: number; skipped: boolean; causes: string[] }

const CAP = s(240); // a room nobody clears in 4 minutes counts as stuck (and skipped)

/** One simulated attempt at room `index` (until it's cleared or skipped), with a seed. */
export function playRoom(index: number, seed: number, prof: Profile): RoomResult {
  const def = GAME_ROOMS[index];
  const g: Game = createGame({ rooms: GAME_ROOMS, startRoom: index });
  const rng: RngHolder = { rngState: seed };
  const firstOfStage = GAME_ROOMS.findIndex((r) => r.stage === def.stage) === index;
  let policy = STAGE_BOTS[def.id]();
  let deaths = 0;
  const causes: string[] = [];
  const roll = () => {
    const learnt = Math.pow(0.85, deaths);
    return {
      react: Math.max(PRACTISED.react, Math.round((prof.reactMin + randInt(rng, prof.reactMax - prof.reactMin + 1)) * learnt)),
      motor: Math.max(PRACTISED.motor, Math.round((prof.motorMin + randInt(rng, prof.motorMax - prof.motorMin + 1)) * learnt)),
    };
  };
  let { react, motor } = roll();
  let seen: Threats[] = [];
  let queue: { held: Button[]; press: Button[] }[] = [];
  let idle = prof.readBase + prof.readPerLine * def.prompts.length + (firstOfStage ? prof.newIdea : 0);
  let pt = 0; // the policy's own clock
  let prev = new Set<Button>();
  let t = 0;
  for (; t < CAP; t++) {
    if (g.room.index !== index || g.complete) return { id: def.id, seconds: t / 60, deaths, skipped: false, causes };
    if (g.player.deadTicks === 0) {
      if (idle > 0) idle--;
      else if (rngNext(rng) < prof.hesitate) idle = prof.hesitateMin + randInt(rng, prof.hesitateMax - prof.hesitateMin + 1);
      seen.push(threats(g));
      if (seen.length > react + 1) seen.shift();
      // A warning or a falling bomb near you interrupts reading: you look up and act.
      const late = seen[0];
      const px = g.player.x + g.player.w / 2;
      if (idle > 0 && (late.jets.some((j) => j.phase === 'warn' && Math.abs(j.aimX - px) < 40) || late.bombs.some((b) => Math.abs(b.x - px) < 40))) idle = 0;
      if (idle === 0) {
        const k = policy(lateView(g, seen[0]), pt++);
        queue.push({ held: k.held, press: k.press ?? [] });
      } else {
        queue.push({ held: [], press: [] });
      }
    }
    const out = queue.length > motor ? queue.shift()! : { held: [] as Button[], press: [] as Button[] };
    const fresh = [...new Set([...out.press, ...out.held.filter((b) => !prev.has(b))])];
    tick(g, input(out.held, fresh));
    prev = new Set([...out.held, ...out.press]);
    if (g.deaths > deaths) {
      deaths = g.deaths;
      causes.push(g.events.find((e) => e.type === 'death')?.cause ?? '?');
      if (deaths >= Help.skipDeaths) return { id: def.id, seconds: (t + 1) / 60, deaths, skipped: true, causes };
      // Start the room over: the bot's script from the top, a fresh reaction time, a regroup.
      policy = STAGE_BOTS[def.id]();
      pt = 0;
      queue = [];
      prev = new Set();
      ({ react, motor } = roll());
      seen = [];
      idle = prof.regroup + Death.respawnTicks;
    }
  }
  return { id: def.id, seconds: t / 60, deaths, skipped: true, causes };
}

export interface RoomSummary { id: string; seconds: number; deaths: number; skipRate: number; causes: string }

/** Average over `runs` seeds for every room, in game order. */
export function estimate(prof: Profile, runs = 20): { rooms: RoomSummary[]; totalSeconds: number } {
  const rooms = GAME_ROOMS.map((def, i) => {
    const rs = Array.from({ length: runs }, (_, k) => playRoom(i, 1000 + k * 7919, prof));
    const avg = (f: (r: RoomResult) => number) => rs.reduce((n, r) => n + f(r), 0) / rs.length;
    const tally: Record<string, number> = {};
    for (const r of rs) for (const c of r.causes) tally[c] = (tally[c] ?? 0) + 1;
    const causes = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(', ');
    return { id: def.id, seconds: avg((r) => r.seconds), deaths: avg((r) => r.deaths), skipRate: avg((r) => (r.skipped ? 1 : 0)), causes };
  });
  return { rooms, totalSeconds: rooms.reduce((n, r) => n + r.seconds, 0) };
}
