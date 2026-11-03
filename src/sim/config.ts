// Every feel number lives here, so tuning never touches logic (CLAUDE.md "Feel numbers").
// Units: pixels and ticks. One tick = 1/60 s. The world is a 16 px tile grid; y grows downward.

export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;
export const ms = (n: number) => Math.round((n / 1000) * TICK_HZ); // ms → ticks

export const TILE = 16;
export const ROOM_W = 20; // tiles
export const ROOM_H = 10; // tiles
export const ROOM_PX_W = ROOM_W * TILE;
export const ROOM_PX_H = ROOM_H * TILE;

/** Player hitbox, the same for both bodies so a switch never pushes you into a wall. */
export const PLAYER_W = 14;
export const PLAYER_H = 12;

export const Tank = {
  maxSpeed: 110, // px/s
  accelGround: 900, // px/s²
  decelGround: 1300,
  accelAir: 620,
  decelAir: 500,
  /** Jump height ≈ 3 tiles: v0²/(2·gUp) = 267²/(2·741) ≈ 48 px. */
  jumpSpeed: 267,
  gravityUp: 741,
  gravityDown: 1300,
  /** Releasing Jump while rising multiplies the upward speed by this (variable height). */
  jumpCut: 0.45,
  maxFall: 420,
  coyoteTicks: ms(100),
  bufferTicks: ms(120),
};

export const Chopper = {
  maxSpeed: 100,
  maxSpeedCarrying: 75,
  accel: 520,
  decel: 420,
  thrust: 980, // upward accel while Jump is held
  gravity: 520,
  maxRise: 120,
  maxDrift: 70, // fall speed while not thrusting
  maxSinkEmpty: 55, // fall speed with an empty tank
  fuelTicks: ms(3000), // seconds of thrust
  refillTicksPerTick: 6, // a full tank refills in 0.5 s on the ground
  hangGap: 2, // px between chopper and a carried item
};

export const Switch = {
  foldTicks: ms(150),
  /** Chopper → tank in the air: start the drop at least this fast (px/s, downward). */
  dropStartSpeed: 140,
};

export const Shell = { speed: 360, w: 4, h: 6 };

export const Charge = {
  startSpeed: 40,
  gravity: 900,
  maxFall: 380,
  w: 6,
  h: 6,
  blastRadius: 14,
};

export const Cactus = {
  regrowTicks: ms(4000),
  sproutTicks: ms(360),
  /** The hitbox is inset from the 16 px tile so a near miss is a miss. */
  inset: 3,
};

export const Mine = { speed: 18, w: 10, h: 10 };

export const Boat = { w: 16, h: 10, drownTicks: ms(30000) };
export const Crate = { w: 16, h: 16 };

export const Pickup = {
  /** The hook is automatic (HW-001): it takes a crate or boat this close below the chopper. */
  reachX: 16, // px between centres, about a tile either side
  reachDown: 32, // px from the chopper's skids to the item's top, about 2 tiles
  /** The crate you just set down can be hooked again once you're this far from it. */
  rearmDistance: 24,
};

/**
 * Jets (stage 2 on). A cross jet flies level across the room again and again until shot, and
 * drops a bomb whenever it passes over you. A dive jet shows a warning at the top of the screen
 * over where you are, then dives straight down that column, skims the ground and climbs away.
 * Both die to one shell. Each room has a fixed set: shot jets never come back.
 */
export const Jet = {
  w: 20,
  h: 10,
  crossSpeed: 80, // px/s
  /** Pause offscreen between passes. */
  passGapTicks: ms(1600),
  /** A cross jet drops when its centre is this close to yours (px)... */
  dropWindow: 8,
  /** ...and no more often than this. */
  bombCooldownTicks: ms(1200),
  /** Ticks per tile of the stagger in a jet's first entry (its column in the map). */
  staggerTicks: ms(250),
  /** Dive jets: the warning lasts this long before the dive, and the aim locks when it starts. */
  warnTicks: ms(900),
  diveSpeed: 190,
  climbSpeed: 150,
  /** It levels out this far above the ground or water under its column (px). */
  skim: 4,
  firstDiveTicks: ms(1000),
  diveGapTicks: ms(2600),
  /**
   * The harmless jet ('h', decision 28): stage 1's first taste of jets. A slow cross jet that drops
   * no bombs and can't hurt you; shooting it is optional and pays the usual points.
   */
  harmlessSpeed: 45,
};

export const Bomb = {
  w: 6,
  h: 8,
  /**
   * HW-002: bombs fall slowly enough for a human to get clear. The shortest drop in the game (about
   * 55 px, from a jet at row 1 or 2 to a tank on high ground) takes about 0.85 s: 350 ms to react,
   * 0.2 s to drive out of reach, and a quarter of a second to spare (tests/fairness.test.ts).
   * Was gravity 420 and maxFall 300, which landed in 0.52-0.65 s.
   */
  gravity: 160,
  maxFall: 110,
  /** Cracked floor within this distance of the burst breaks (px): a bomb anywhere on a 2-tile crack opens it. */
  blastRadius: 20,
  /** The burst kills you within this distance of your centre (px). */
  killRadius: 15,
};

/** Stage 5 gusts: a room's wind blows in timed gusts that push the chopper and the charge. */
export const Wind = {
  /** Ticks to ramp a gust up and down. */
  rampTicks: ms(500),
  /** The charge drifts this much more than the chopper (it is light). */
  chargeFactor: 1.3,
};

export const Death = { respawnTicks: ms(400) };

export const Points = { jet: 100, mine: 200, boat: 500 };

/** Ghost hint and skip offer (design Q2). */
export const Help = { hintDeaths: 5, skipDeaths: 10 };
