// One palette for the whole game (design: "Look"). Every model, effect and HUD colour comes from
// here, so the world stays one set of painted wooden toys. Stage lighting changes the light, never
// these colours.

export const C = {
  // Hero
  olive: 0x6b7f3a,
  oliveDark: 0x45542a,
  cream: 0xf2e6c8,
  brass: 0xd1a33c,
  // Danger (always with a dark outline)
  red: 0xd9482b,
  bomb: 0x2a2a30,
  jet: 0x8a97a8,
  cactus: 0x4e9a4a,
  mine: 0x34343c,
  outline: 0x1e1a1d,
  // Boats
  hull: 0xf4ead6,
  stripe: 0xc8402a,
  peg1: 0xe9b44c,
  peg2: 0x4d7ea8,
  peg3: 0xd06d8c,
  skin: 0xf0c9a0,
  window: 0x2f4a5e,
  // Land
  grass: 0x7fb24a,
  grassDark: 0x5f9440,
  sand: 0xe3c48f,
  soil: 0x9a6b43,
  soilDark: 0x7a5236,
  rock: 0x7d7468,
  rockDark: 0x5f574f,
  stone: 0xb9afa0,
  stoneDark: 0x958a7c,
  roof: 0xa8473a,
  wood: 0xb07a45,
  woodDark: 0x80552e,
  // Water
  water: 0x3fb0b8,
  waterDeep: 0x1d5e73,
  foam: 0xe9f5f2,
  // HUD
  plaque: 0x3b2a1e,
  plaqueEdge: 0x6e4c33,
  ink: 0xf2e6c8,
  inkDim: 0xb9a888,
} as const;

export type LightName = 'morning' | 'noon' | 'afternoon' | 'dusk' | 'night' | 'dawn';

export interface LightPreset {
  skyTop: number;
  skyBottom: number;
  sun: number;
  sunIntensity: number;
  /** Sun direction: azimuth around the scene (rad) and elevation above the horizon (rad). */
  azimuth: number;
  elevation: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  fog: number;
}

export const LIGHTS: Record<LightName, LightPreset> = {
  morning: {
    skyTop: 0x8ccbe8, skyBottom: 0xf6ecd2, sun: 0xfff1d6, sunIntensity: 2.4, azimuth: -0.7, elevation: 0.85,
    hemiSky: 0xcfe8f5, hemiGround: 0x8a7a55, hemiIntensity: 1.3, fog: 0xe8ecdc,
  },
  noon: {
    skyTop: 0x5fb1e6, skyBottom: 0xd8eef7, sun: 0xffffff, sunIntensity: 2.8, azimuth: -0.3, elevation: 1.25,
    hemiSky: 0xd6ecf8, hemiGround: 0x8a7a55, hemiIntensity: 1.4, fog: 0xd8eaf0,
  },
  afternoon: {
    skyTop: 0x7fb4d8, skyBottom: 0xf0d79a, sun: 0xffdfa8, sunIntensity: 2.5, azimuth: 0.6, elevation: 0.7,
    hemiSky: 0xd9e2e8, hemiGround: 0x8a6e45, hemiIntensity: 1.2, fog: 0xece0bc,
  },
  dusk: {
    skyTop: 0x5a4f8c, skyBottom: 0xf08a4b, sun: 0xff9a55, sunIntensity: 2.2, azimuth: 0.9, elevation: 0.32,
    hemiSky: 0xb58fb0, hemiGround: 0x5a4535, hemiIntensity: 1.0, fog: 0xd99a78,
  },
  night: {
    skyTop: 0x0f1630, skyBottom: 0x2a3a66, sun: 0x9fb8ff, sunIntensity: 1.2, azimuth: -0.5, elevation: 0.9,
    hemiSky: 0x5068a8, hemiGround: 0x1c1e2a, hemiIntensity: 0.8, fog: 0x2a3456,
  },
  dawn: {
    skyTop: 0x7d86c4, skyBottom: 0xf7b48a, sun: 0xffc69a, sunIntensity: 2.3, azimuth: 0.2, elevation: 0.4,
    hemiSky: 0xe3c2c8, hemiGround: 0x6a5040, hemiIntensity: 1.1, fog: 0xf0c0a0,
  },
};

export const css = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;
