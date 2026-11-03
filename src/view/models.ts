// Every model is built here in code from simple shapes: painted wooden toys, flat-shaded.
// No downloaded models or textures (brief: "generate all assets").
// Units: 1 = one 16 px tile. Each model's origin is the bottom centre of its sim hitbox.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { C } from './palette';

const mats = new Map<string, THREE.Material>();

/** Shared flat-shaded painted-wood material for a colour. */
export function paint(color: number, opts: { emissive?: number; transparent?: boolean; opacity?: number } = {}): THREE.MeshLambertMaterial {
  const key = `${color}|${opts.emissive ?? 0}|${opts.opacity ?? 1}`;
  let m = mats.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color, flatShading: true, emissive: opts.emissive ?? 0x000000,
      transparent: opts.transparent ?? false, opacity: opts.opacity ?? 1,
    });
    mats.set(key, m);
  }
  return m;
}

const outlineMat = new THREE.MeshBasicMaterial({ color: C.outline, side: THREE.BackSide });

export function mesh(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, paint(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const rbox = (w: number, h: number, d: number, r = 0.06) => new RoundedBoxGeometry(w, h, d, 1, Math.min(r, w / 2, h / 2, d / 2));
export const cyl = (rTop: number, rBot: number, h: number, seg = 8) => new THREE.CylinderGeometry(rTop, rBot, h, seg);
export const ball = (r: number, detail = 0) => new THREE.IcosahedronGeometry(r, detail);

/**
 * Dark outline on dangerous things only (design: shading choice d). An inverted hull: a slightly
 * larger copy of each mesh, drawn back faces only, in the outline colour.
 */
export function outline(group: THREE.Object3D, thickness = 0.05): THREE.Object3D {
  const meshes: THREE.Mesh[] = [];
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.userData.hull) meshes.push(o as THREE.Mesh); });
  for (const m of meshes) {
    m.geometry.computeBoundingSphere();
    const r = m.geometry.boundingSphere!.radius || 0.5;
    const hull = new THREE.Mesh(m.geometry, outlineMat);
    hull.userData.hull = true;
    hull.scale.setScalar(1 + thickness / r);
    hull.castShadow = false;
    m.add(hull);
  }
  return group;
}

// ---------------------------------------------------------------- hero

export interface TankModel extends THREE.Group { userData: { key: THREE.Object3D; turret: THREE.Object3D; wheels: THREE.Object3D[] } }

export function tank(): TankModel {
  const g = new THREE.Group() as TankModel;
  const D = 0.7;
  // Treads with wheels
  const tread = mesh(rbox(0.98, 0.26, D, 0.1), C.oliveDark, 0, 0.13, 0);
  g.add(tread);
  const wheels: THREE.Object3D[] = [];
  for (const x of [-0.33, -0.11, 0.11, 0.33]) {
    const w = mesh(cyl(0.09, 0.09, D + 0.04, 8), C.brass, x, 0.13, 0);
    w.rotation.x = Math.PI / 2;
    g.add(w);
    wheels.push(w);
  }
  // Hull, stripe, turret, barrel pointing straight up
  g.add(mesh(rbox(0.86, 0.26, D - 0.08, 0.07), C.olive, 0, 0.38, 0));
  g.add(mesh(box(0.87, 0.05, D - 0.06), C.cream, 0, 0.36, 0));
  const turret = new THREE.Group();
  turret.position.set(0, 0.51, 0);
  turret.add(mesh(rbox(0.44, 0.2, 0.42, 0.06), C.olive, 0, 0.1, 0));
  turret.add(mesh(cyl(0.065, 0.075, 0.34, 8), C.oliveDark, 0, 0.36, 0));
  turret.add(mesh(cyl(0.085, 0.085, 0.06, 8), C.brass, 0, 0.52, 0));
  g.add(turret);
  // Brass wind-up key on the back
  const key = new THREE.Group();
  key.position.set(-0.48, 0.42, 0);
  key.add(mesh(cyl(0.025, 0.025, 0.1, 6), C.brass, -0.05, 0, 0).rotateZ(Math.PI / 2));
  const bow = mesh(box(0.04, 0.2, 0.12), C.brass, -0.11, 0, 0);
  key.add(bow);
  g.add(key);
  g.userData = { key, turret, wheels };
  return g;
}

export interface ChopperModel extends THREE.Group { userData: { rotor: THREE.Object3D; tail: THREE.Object3D; hook: THREE.Object3D; line: THREE.Mesh } }

export function chopper(): ChopperModel {
  const g = new THREE.Group() as ChopperModel;
  const D = 0.62;
  // Skids
  for (const z of [-0.22, 0.22]) {
    const s = mesh(cyl(0.025, 0.025, 0.86, 6), C.oliveDark, 0, 0.04, z);
    s.rotation.z = Math.PI / 2;
    g.add(s);
    g.add(mesh(box(0.04, 0.14, 0.04), C.oliveDark, -0.2, 0.11, z));
    g.add(mesh(box(0.04, 0.14, 0.04), C.oliveDark, 0.2, 0.11, z));
  }
  // Body, canopy, stripe, tail boom
  g.add(mesh(rbox(0.66, 0.42, D, 0.14), C.olive, 0.06, 0.38, 0));
  g.add(mesh(box(0.67, 0.05, D + 0.01), C.cream, 0.06, 0.3, 0));
  const canopy = mesh(ball(0.21, 1), 0xa9d8e6, 0.3, 0.44, 0);
  canopy.scale.set(1, 0.9, 1.3);
  g.add(canopy);
  g.add(mesh(rbox(0.5, 0.12, 0.14, 0.05), C.olive, -0.48, 0.46, 0));
  const tail = new THREE.Group();
  tail.position.set(-0.72, 0.52, 0.08);
  tail.add(mesh(box(0.04, 0.3, 0.03), C.oliveDark, 0, 0, 0));
  tail.add(mesh(box(0.3, 0.04, 0.03), C.oliveDark, 0, 0, 0));
  g.add(tail);
  // Mast and main rotor
  g.add(mesh(cyl(0.035, 0.035, 0.12, 6), C.oliveDark, 0.06, 0.64, 0));
  const rotor = new THREE.Group();
  rotor.position.set(0.06, 0.71, 0);
  rotor.add(mesh(box(1.25, 0.025, 0.08), C.oliveDark));
  rotor.add(mesh(box(0.08, 0.025, 1.25), C.oliveDark));
  rotor.add(mesh(cyl(0.06, 0.06, 0.05, 8), C.brass));
  g.add(rotor);
  // Hook line (scaled in y by the view) and hook
  const line = mesh(cyl(0.012, 0.012, 1, 4), C.woodDark, 0, 0, 0);
  line.userData.noBounds = true;
  line.geometry.translate(0, -0.5, 0);
  line.castShadow = false;
  g.add(line);
  const hook = mesh(box(0.1, 0.06, 0.1), C.brass, 0, 0, 0);
  hook.userData.noBounds = true;
  g.add(hook);
  g.userData = { rotor, tail, hook, line };
  return g;
}

// ---------------------------------------------------------------- things

export function crate(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(0.94, 0.94, 0.8), C.wood, 0, 0.47, 0));
  // Frame planks on the front and back faces
  for (const z of [0.41, -0.41]) {
    g.add(mesh(box(1, 0.12, 0.04), C.woodDark, 0, 0.06, z));
    g.add(mesh(box(1, 0.12, 0.04), C.woodDark, 0, 0.88, z));
    g.add(mesh(box(0.12, 0.94, 0.04), C.woodDark, -0.44, 0.47, z));
    g.add(mesh(box(0.12, 0.94, 0.04), C.woodDark, 0.44, 0.47, z));
    const d = mesh(box(1.18, 0.1, 0.04), C.woodDark, 0, 0.47, z);
    d.rotation.z = Math.PI / 4;
    d.scale.x = 0.95;
    g.add(d);
  }
  return g;
}

export interface BoatModel extends THREE.Group { userData: { bar: THREE.Mesh; barBack: THREE.Mesh; crew: THREE.Object3D[] } }

// The boat: a little toy tug, bow to the right. Its hull is a side profile (keel and sheer line)
// extruded across the river, then pinched to a point at the bow and flared at the gunwale, so it
// reads as a boat from the side and from above. Three bands: red below the waterline, cream
// topsides, a varnished rail and deck on top.
const BOAT_X0 = -0.56; // transom
const BOAT_X1 = 0.62; // stem
const BOAT_HALF = 0.3; // half-beam
const boatKeel = (x: number) => {
  const t = (x - BOAT_X0) / (BOAT_X1 - BOAT_X0);
  const stern = t < 0.08 ? (0.08 - t) * 0.9 : 0; // the transom sits a little out of the water
  const bow = t > 0.62 ? ((t - 0.62) / 0.38) ** 2 * 0.4 : 0; // the stem sweeps up
  return stern + bow;
};
const boatSheer = (x: number) => {
  const t = (x - BOAT_X0) / (BOAT_X1 - BOAT_X0);
  return 0.34 + 0.05 * (1 - t) ** 2 + 0.13 * t ** 3; // dips amidships, rises to the bow
};

function boatBand(lo: (x: number) => number, hi: (x: number) => number, color: number): THREE.Mesh {
  const N = 28;
  const xs = Array.from({ length: N + 1 }, (_, i) => BOAT_X0 + ((BOAT_X1 - BOAT_X0) * i) / N)
    .filter((x) => hi(x) - lo(x) > 0.002);
  const shape = new THREE.Shape();
  xs.forEach((x, i) => (i ? shape.lineTo(x, lo(x)) : shape.moveTo(x, lo(x))));
  for (let i = xs.length - 1; i >= 0; i--) shape.lineTo(xs[i], hi(xs[i]));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2 * BOAT_HALF, bevelEnabled: false });
  geo.translate(0, 0, -BOAT_HALF);
  // Pinch the bow in plan view and flare the sides out towards the gunwale.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = Math.min(1, Math.max(0, (x - 0.05) / (BOAT_X1 - 0.05)));
    const plan = Math.max(0.04, Math.sqrt(1 - u * u)) * (x < BOAT_X0 + 0.1 ? 0.92 : 1);
    const flare = 0.72 + 0.28 * Math.min(1, y / 0.32);
    pos.setZ(i, pos.getZ(i) * plan * flare);
  }
  geo.computeVertexNormals();
  return mesh(geo, color);
}

export function boat(): BoatModel {
  const g = new THREE.Group() as BoatModel;
  const WATERLINE = 0.13;
  const RAIL = 0.045;
  g.add(boatBand(boatKeel, (x) => Math.min(boatSheer(x) - RAIL, Math.max(boatKeel(x), WATERLINE)), C.stripe));
  g.add(boatBand((x) => Math.max(boatKeel(x), WATERLINE), (x) => boatSheer(x) - RAIL, C.hull));
  g.add(boatBand((x) => Math.max(boatKeel(x), boatSheer(x) - RAIL), boatSheer, C.wood));
  // Wheelhouse: cream box, dark windows, a blue roof with an overhang, a red funnel behind it
  const deck = boatSheer(-0.2);
  g.add(mesh(rbox(0.4, 0.28, 0.36, 0.04), C.hull, -0.2, deck + 0.14, 0));
  for (const x of [-0.3, -0.12]) g.add(mesh(box(0.11, 0.09, 0.02), C.window, x, deck + 0.17, 0.18));
  g.add(mesh(box(0.02, 0.09, 0.24), C.window, 0.0, deck + 0.17, 0));
  g.add(mesh(rbox(0.5, 0.05, 0.44, 0.02), C.peg2, -0.2, deck + 0.3, 0));
  g.add(mesh(cyl(0.055, 0.065, 0.16, 8), C.stripe, -0.36, deck + 0.4, 0));
  g.add(mesh(cyl(0.058, 0.058, 0.035, 8), C.hull, -0.36, deck + 0.42, 0));
  // Life ring on the wheelhouse side, a mast with a pennant at the bow
  const ring = mesh(new THREE.TorusGeometry(0.055, 0.02, 6, 10), C.red, -0.21, deck + 0.06, 0.19);
  g.add(ring);
  const mx = 0.5;
  g.add(mesh(cyl(0.015, 0.015, 0.3, 5), C.woodDark, mx, boatSheer(mx) + 0.15, 0));
  const flag = mesh(box(0.12, 0.07, 0.01), C.peg1, mx - 0.065, boatSheer(mx) + 0.26, 0);
  g.add(flag);
  // Crew: two peg people on the foredeck, waving while they're carried
  const crew: THREE.Object3D[] = [];
  [[0.13, C.peg1], [0.3, C.peg2]].forEach(([x, col]) => {
    const p = new THREE.Group();
    p.position.set(x, boatSheer(x) - 0.01, 0);
    p.add(mesh(cyl(0.05, 0.06, 0.16, 8), col, 0, 0.08, 0));
    p.add(mesh(ball(0.055, 1), C.skin, 0, 0.21, 0));
    g.add(p);
    crew.push(p);
  });
  // Drowning-timer bar (River Guard's boat timer bar), shown above the boat while it's in the water
  const barBack = new THREE.Mesh(box(0.8, 0.07, 0.04), new THREE.MeshBasicMaterial({ color: C.plaque }));
  barBack.position.set(0, 1.0, 0.32);
  barBack.userData.noBounds = true;
  g.add(barBack);
  const bar = new THREE.Mesh(box(0.76, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: C.foam }));
  bar.geometry.translate(0.38, 0, 0);
  bar.position.set(-0.38, 1.0, 0.33);
  bar.userData.noBounds = true;
  g.add(bar);
  g.userData = { bar, barBack, crew };
  return g;
}

export function cactus(): THREE.Group {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(mesh(cyl(0.14, 0.17, 0.72, 7), C.cactus, 0, 0.36, 0));
  inner.add(mesh(ball(0.14, 0), C.cactus, 0, 0.72, 0));
  const armL = mesh(cyl(0.075, 0.085, 0.26, 6), C.cactus, -0.22, 0.44, 0);
  inner.add(armL);
  inner.add(mesh(cyl(0.06, 0.06, 0.16, 6), C.cactus, -0.14, 0.33, 0).rotateZ(Math.PI / 2));
  const armR = mesh(cyl(0.075, 0.085, 0.2, 6), C.cactus, 0.21, 0.54, 0);
  inner.add(armR);
  inner.add(mesh(cyl(0.06, 0.06, 0.14, 6), C.cactus, 0.13, 0.46, 0).rotateZ(Math.PI / 2));
  // Spikes: little red tips, so it never looks harmless
  for (const [x, y] of [[0, 0.86], [-0.22, 0.6], [0.21, 0.68], [0.16, 0.25], [-0.15, 0.18]]) {
    inner.add(mesh(cyl(0, 0.035, 0.09, 4), C.red, x, y, 0.12));
  }
  outline(inner);
  g.add(inner);
  g.userData.inner = inner;
  return g;
}

export function mine(): THREE.Group {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(mesh(ball(0.28, 1), C.mine, 0, 0.3, 0));
  for (const [x, y, z] of [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0.7, 0.7, 0], [-0.7, 0.7, 0], [0, 0.7, 0.7], [0, 0.7, -0.7]]) {
    const s = mesh(cyl(0, 0.05, 0.14, 4), C.mine, x * 0.3, 0.3 + y * 0.3, z * 0.3);
    s.lookAt(new THREE.Vector3(x * 2, 0.3 + y * 2, z * 2));
    s.rotateX(Math.PI / 2);
    inner.add(s);
  }
  outline(inner);
  const light = new THREE.Mesh(ball(0.06, 0), new THREE.MeshBasicMaterial({ color: C.red }));
  light.position.set(0, 0.6, 0.05);
  inner.add(light);
  g.add(inner);
  g.userData = { inner, light };
  return g;
}

export function target(): THREE.Group {
  const g = new THREE.Group();
  // A board hanging on a rope; its red-and-cream rings face the player (shell-hittable cue).
  const rope = mesh(cyl(0.015, 0.015, 3, 4), C.woodDark, 0, 2.45, 0);
  rope.castShadow = false;
  g.add(rope);
  // The board pivots at its top edge (y = 0.92) so a hit swings it up.
  const board = new THREE.Group();
  board.position.set(0, 0.92, 0);
  const face = new THREE.Group();
  face.position.set(0, -0.44, 0);
  face.rotation.x = Math.PI / 2; // disc faces the camera (+z)
  face.add(mesh(cyl(0.42, 0.42, 0.1, 12), C.wood));
  const rings: [number, number][] = [[0.36, C.cream], [0.26, C.red], [0.16, C.cream], [0.07, C.red]];
  rings.forEach(([r, col], i) => face.add(mesh(cyl(r, r, 0.02, 12), col, 0, 0.06 + i * 0.004, 0)));
  board.add(face);
  g.add(board);
  g.userData.board = board;
  return g;
}

export function shell(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.07, 0.07, 0.22, 6), C.brass, 0, 0.11, 0));
  g.add(mesh(cyl(0, 0.07, 0.12, 6), C.red, 0, 0.28, 0));
  return g;
}

export function charge(): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(ball(0.15, 1), C.bomb, 0, 0.15, 0));
  g.add(mesh(box(0.31, 0.06, 0.31), C.red, 0, 0.15, 0));
  return g;
}

export function tree(seed: number): THREE.Group {
  const g = new THREE.Group();
  const h = 0.6 + (seed % 5) * 0.12;
  g.add(mesh(cyl(0.06, 0.08, h, 6), C.woodDark, 0, h / 2, 0));
  const top = mesh(seed % 2 ? cyl(0, 0.42, 0.9, 7) : ball(0.38, 0), seed % 3 ? C.grassDark : C.grass, 0, h + 0.3, 0);
  g.add(top);
  return g;
}

export function tower(height: number): THREE.Group {
  const g = new THREE.Group();
  g.add(mesh(box(1.5, height, 1.6), C.stone, 0, height / 2, -0.6));
  for (let i = 0; i < 3; i++) g.add(mesh(box(0.34, 0.3, 1.6), C.stone, -0.55 + i * 0.55, height + 0.15, -0.6));
  g.add(mesh(cyl(0, 1.0, 0.9, 4), C.roof, 0, height + 0.75, -0.6).rotateY(Math.PI / 4));
  // Courses of darker stone
  for (let y = 0.5; y < height; y += 0.9) g.add(mesh(box(1.52, 0.05, 1.62), C.stoneDark, 0, y, -0.6));
  return g;
}

export function portcullis(rows: number): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.07, rows, 0.07), C.woodDark, -0.36 + i * 0.24, rows / 2, 0.2));
  for (let y = 0.3; y < rows; y += 0.5) g.add(mesh(box(0.9, 0.06, 0.07), C.woodDark, 0, y, 0.2));
  return g;
}

/** Declared sizes (tiles) for the size test (RG-001 lesson: every model has its declared size). */
export const MODEL_SIZES: Record<string, { build: () => THREE.Object3D; w: number; h: number }> = {
  tank: { build: tank, w: 1.1, h: 1.06 },
  chopper: { build: chopper, w: 1.55, h: 0.75 },
  crate: { build: crate, w: 1.0, h: 0.94 },
  boat: { build: boat, w: 1.18, h: 0.85 },
  cactus: { build: cactus, w: 0.55, h: 0.95 },
  mine: { build: mine, w: 0.7, h: 0.7 },
};
