// The 2.5D toy-diorama view (design: "Look"). It reads the sim and never writes it.
//
// World units: 1 = one 16 px tile. Sim y grows downward; world y grows upward, with y = 0 at the
// bottom of the room. Rooms sit side by side along x in "slots": each room you enter takes the next
// slot, so the camera always slides forward.
//
// Depth (z): the playfield is z = 0. Terrain runs from the cutaway front face at z = +1 back to
// z = -1.5; the landscape behind continues to the horizon.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { RenderPixelatedPass } from 'three/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Boat, Cactus, Chopper, ROOM_H, ROOM_W, Switch, TILE } from '../sim/config';
import type { Game, GameEvent, RoomState } from '../sim/game';
import { Fx } from './fx';
import * as M from './models';
import { C, LIGHTS, LightName, LightPreset } from './palette';

const FRONT = 1.0;
const BACK = -1.5;
const DEPTH = FRONT - BACK;
const FOV = 30;
const TILT = (12 * Math.PI) / 180;
const SLIDE_S = 0.5;

export type Quality = 'high' | 'low';

/** Sim px → world units. */
export const wx = (px: number) => px / TILE;
export const wy = (py: number) => (ROOM_H * TILE - py) / TILE;

// ---------------------------------------------------------------- geometry helpers

function hash(a: number, b: number, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A box as non-indexed geometry with one colour per face: [+x, -x, +y, -y, +z, -z]. */
function colourBox(w: number, h: number, d: number, x: number, y: number, z: number, faces: number[]): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(x, y, z);
  const col = new Float32Array(36 * 3);
  const c = new THREE.Color();
  for (let f = 0; f < 6; f++) {
    c.setHex(faces[f]);
    for (let v = 0; v < 6; v++) col.set([c.r, c.g, c.b], (f * 6 + v) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

const uniform = (col: number) => [col, col, col, col, col, col];

const vcMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const waterMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.62, depthWrite: false });
const surfaceMat = new THREE.MeshLambertMaterial({ color: C.water, flatShading: true, transparent: true, opacity: 0.55, depthWrite: false });
const foamMat = new THREE.MeshLambertMaterial({ color: C.foam, flatShading: true });
const glowMat = new THREE.MeshBasicMaterial({ color: 0xffa14a });

// ---------------------------------------------------------------- look prototype (?look=pixel)
// Art-direction prototype for Debu's look check: the same 3D scene rendered as pixel art. It renders
// at a low resolution with nearest-neighbour upscaling and edge outlines (RenderPixelatedPass), and
// swaps the smooth Lambert shading for three-band toon shading so surfaces read as hand-shaded pixels.
export const PIXEL_LOOK = typeof location !== 'undefined' && new URLSearchParams(location.search).get('look') === 'pixel';
/** Screen pixels per art pixel: about 440 art pixels across the screen. */
const pixelSize = (w: number) => Math.max(2, Math.round(w / 440));

const toonRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const toonMats = new Map<THREE.Material, THREE.Material>();
function toonOf(m: THREE.Material): THREE.Material {
  if (!(m instanceof THREE.MeshLambertMaterial)) return m;
  let t = toonMats.get(m);
  if (!t) {
    t = new THREE.MeshToonMaterial({
      color: m.color, vertexColors: m.vertexColors, gradientMap: toonRamp, emissive: m.emissive,
      transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite,
    });
    toonMats.set(m, t);
  }
  return t;
}
/** In the pixel look, swap every Lambert material under `o` for its toon twin. */
function toonify(o: THREE.Object3D): void {
  if (!PIXEL_LOOK) return;
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh && !Array.isArray(m.material)) m.material = toonOf(m.material);
  });
}

// ---------------------------------------------------------------- room view

interface RoomView {
  slot: number;
  x0: number;
  group: THREE.Group;
  items: Map<number, THREE.Object3D>;
  cacti: THREE.Object3D[];
  mines: THREE.Object3D[];
  targets: THREE.Object3D[];
  cracked: Map<string, THREE.Object3D>;
  bridge: THREE.Object3D | null;
  bridgeAngle: number;
  gate: THREE.Object3D | null;
  gateLift: number;
  gateRows: number;
  surfaces: { mesh: THREE.Mesh; base: Float32Array }[];
  light: LightName;
}

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 400);
  private composer: EffectComposer;
  private tiltH: ShaderPass;
  private tiltV: ShaderPass;
  private pixelPass: RenderPixelatedPass | null = null;
  private sun = new THREE.DirectionalLight(0xffffff, 2.5);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.2);
  private skyCanvas = document.createElement('canvas');
  private skyTex: THREE.CanvasTexture;
  private fog = new THREE.Fog(0xffffff, 30, 110);
  private fx: Fx;
  private quality: Quality = 'high';

  private room: RoomView | null = null;
  private leaving: RoomView | null = null;
  private lastRoom: RoomState | null = null;
  private slot = 0;
  private camX = 10;
  private slideFrom = 10;
  private slideT = 1;
  private shake = 0;
  private light: LightPreset = { ...LIGHTS.morning };

  private player = new THREE.Group();
  private tank = M.tank();
  private chopper = M.chopper();
  private shellM = M.shell();
  private chargeM = M.charge();
  private bodyShown: 'tank' | 'chopper' = 'tank';
  private squash = 0;
  private squashV = 0;
  private time = 0;
  private washT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.skyCanvas.width = 4;
    this.skyCanvas.height = 256;
    this.skyTex = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = this.skyTex;
    this.scene.fog = this.fog;

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -14; sc.right = 14; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 80;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    this.player.add(this.tank, this.chopper);
    this.chopper.visible = false;
    this.shellM.visible = false;
    this.chargeM.visible = false;
    this.scene.add(this.player, this.shellM, this.chargeM);
    this.fx = new Fx(this.scene);

    this.composer = new EffectComposer(this.renderer);
    this.tiltH = new ShaderPass(HorizontalTiltShiftShader);
    this.tiltV = new ShaderPass(VerticalTiltShiftShader);
    this.tiltH.uniforms.r.value = this.tiltV.uniforms.r.value = 0.55;
    if (PIXEL_LOOK) {
      this.renderer.setPixelRatio(1);
      this.pixelPass = new RenderPixelatedPass(pixelSize(window.innerWidth), this.scene, this.camera, { normalEdgeStrength: 0.35, depthEdgeStrength: 0.6 });
      this.composer.addPass(this.pixelPass);
      toonify(this.player);
      toonify(this.shellM);
      toonify(this.chargeM);
    } else {
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.composer.addPass(this.tiltH);
      this.composer.addPass(this.tiltV);
    }
    this.composer.addPass(new OutputPass());

    this.applyLight(LIGHTS.morning);
  }

  setQuality(q: Quality): void {
    if (q === this.quality) return;
    this.quality = q;
    const size = q === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(size, size);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.renderer.setPixelRatio(q === 'high' && !PIXEL_LOOK ? Math.min(window.devicePixelRatio, 2) : 1);
    this.resize(window.innerWidth, window.innerHeight);
  }

  get currentQuality(): Quality { return this.quality; }

  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    this.pixelPass?.setPixelSize(pixelSize(w));
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const strength = 2.2;
    this.tiltH.uniforms.h.value = strength / (w * this.renderer.getPixelRatio());
    this.tiltV.uniforms.v.value = strength / (h * this.renderer.getPixelRatio());
  }

  /** Screen position (CSS px) of a sim point, for HUD prompts and popups. */
  project(px: number, py: number, w: number, h: number): { x: number; y: number } {
    const v = new THREE.Vector3((this.room?.x0 ?? 0) + wx(px), wy(py), 0).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
  }

  // ---------------------------------------------------------------- per frame

  update(g: Game, events: GameEvent[], alpha: number, dt: number): void {
    this.time += dt;
    const entered = events.some((e) => e.type === 'roomEnter' || e.type === 'loop');
    if (g.room !== this.lastRoom) {
      if (entered || !this.room) {
        if (this.leaving) this.disposeRoom(this.leaving);
        this.leaving = this.room;
        if (this.room) this.slot++;
        this.room = this.buildRoom(g.room, this.slot);
        if (this.leaving) {
          this.slideFrom = this.camX;
          this.slideT = 0;
        } else {
          this.camX = this.room.x0 + ROOM_W / 2;
        }
      } else {
        // Respawn: the room resets, so rebuild it in place.
        const old = this.room;
        this.room = this.buildRoom(g.room, this.slot);
        this.disposeRoom(old);
      }
      this.lastRoom = g.room;
    }
    const rv = this.room!;
    this.handleEvents(g, events, rv);

    // Camera slide between rooms and light blend towards the room's preset.
    if (this.slideT < 1) {
      this.slideT = Math.min(1, this.slideT + dt / SLIDE_S);
      const t = this.slideT < 0.5 ? 2 * this.slideT * this.slideT : 1 - (-2 * this.slideT + 2) ** 2 / 2;
      this.camX = this.slideFrom + (rv.x0 + ROOM_W / 2 - this.slideFrom) * t;
      if (this.slideT === 1 && this.leaving) {
        this.disposeRoom(this.leaving);
        this.leaving = null;
      }
    } else {
      this.camX = rv.x0 + ROOM_W / 2;
    }
    this.blendLight(LIGHTS[rv.light], Math.min(1, dt * 2.5));

    this.updateRoom(g, rv, dt);
    this.updatePlayer(g, rv, alpha, dt);
    this.updateProjectiles(g, rv);
    this.fx.update(dt);
    this.placeCamera(dt);
  }

  render(): void {
    if (this.quality === 'high' || PIXEL_LOOK) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private placeCamera(dt: number): void {
    const aspect = this.camera.aspect;
    const half = Math.tan((FOV * Math.PI) / 360);
    const viewH = ROOM_H + 1.6;
    const viewW = ROOM_W + 0.6;
    const d = Math.max(viewH / 2 / half, viewW / 2 / (half * aspect));
    const target = new THREE.Vector3(this.camX, ROOM_H / 2 - 0.3, 0);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const s = this.shake * this.shake * 0.25;
    this.camera.position.set(
      target.x + (Math.random() - 0.5) * s,
      target.y + Math.sin(TILT) * d + (Math.random() - 0.5) * s,
      Math.cos(TILT) * d,
    );
    this.camera.lookAt(target);
    // The sun follows the room so its shadow map always covers the playfield.
    const L = this.light;
    const dir = new THREE.Vector3(Math.sin(L.azimuth) * Math.cos(L.elevation), Math.sin(L.elevation), Math.cos(L.azimuth) * Math.cos(L.elevation));
    this.sun.target.position.set(this.camX, 4, 0);
    this.sun.position.copy(this.sun.target.position).addScaledVector(dir, 40);
  }

  /** Camera shake can be turned off in Settings. */
  shakeOn = true;

  shakeBy(amount: number): void {
    if (!this.shakeOn) return;
    this.shake = Math.min(1, Math.max(this.shake, amount));
  }

  // ---------------------------------------------------------------- lighting

  private applyLight(p: LightPreset): void {
    this.light = { ...p };
    this.paintLight();
  }

  private blendLight(to: LightPreset, k: number): void {
    const L = this.light;
    const mix = (a: number, b: number) => {
      const ca = new THREE.Color(a);
      ca.lerp(new THREE.Color(b), k);
      return ca.getHex();
    };
    const same = L.skyTop === to.skyTop && L.sun === to.sun && Math.abs(L.elevation - to.elevation) < 1e-4;
    if (same) return;
    for (const key of ['skyTop', 'skyBottom', 'sun', 'hemiSky', 'hemiGround', 'fog'] as const) {
      L[key] = Math.abs(L[key] - to[key]) < 2 ? to[key] : mix(L[key], to[key]);
    }
    for (const key of ['sunIntensity', 'azimuth', 'elevation', 'hemiIntensity'] as const) {
      L[key] += (to[key] - L[key]) * k;
      if (Math.abs(L[key] - to[key]) < 1e-3) L[key] = to[key];
    }
    if (k >= 1) Object.assign(L, to);
    this.paintLight();
  }

  private paintLight(): void {
    const L = this.light;
    const ctx = this.skyCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, `#${L.skyTop.toString(16).padStart(6, '0')}`);
    grad.addColorStop(0.75, `#${L.skyBottom.toString(16).padStart(6, '0')}`);
    grad.addColorStop(1, `#${L.skyBottom.toString(16).padStart(6, '0')}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 256);
    this.skyTex.needsUpdate = true;
    this.sun.color.setHex(L.sun);
    this.sun.intensity = L.sunIntensity;
    this.hemi.color.setHex(L.hemiSky);
    this.hemi.groundColor.setHex(L.hemiGround);
    this.hemi.intensity = L.hemiIntensity;
    this.fog.color.setHex(L.fog);
  }

  // ---------------------------------------------------------------- building a room

  private buildRoom(room: RoomState, slot: number): RoomView {
    const x0 = slot * ROOM_W;
    const group = new THREE.Group();
    group.position.x = x0;
    const rv: RoomView = {
      slot, x0, group, items: new Map(), cacti: [], mines: [], targets: [], cracked: new Map(),
      bridge: null, bridgeAngle: room.bridgesDown ? 0 : 1, gate: null, gateLift: room.gateOpen ? 1 : 0,
      gateRows: 0, surfaces: [], light: room.def.light,
    };
    const T = room.tiles;
    const solidGeo: THREE.BufferGeometry[] = [];
    const waterGeo: THREE.BufferGeometry[] = [];
    const isGround = (c: number, r: number) => r >= 0 && r < ROOM_H && c >= 0 && c < ROOM_W && '#Hx'.includes(T[r][c]);
    const yOf = (row: number) => ROOM_H - row - 0.5;

    for (let col = 0; col < ROOM_W; col++) {
      let depth = -1;
      for (let row = 0; row < ROOM_H; row++) {
        const ch = T[row][col];
        const x = col + 0.5;
        const y = yOf(row);
        if (ch === '#' || ch === 'W') {
          const top = !isGround(col, row - 1);
          depth = top ? 0 : depth + 1;
          const rocky = depth >= 3 || (depth === 2 && hash(col, row) > 0.5);
          const face = depth <= 1 ? C.soil : rocky ? (hash(col, row, 1) > 0.5 ? C.rock : C.rockDark) : C.soilDark;
          if (top) {
            solidGeo.push(colourBox(1, 0.8, DEPTH, x, y - 0.1, (FRONT + BACK) / 2, uniform(face)));
            solidGeo.push(colourBox(1.0, 0.2, DEPTH + 0.04, x, y + 0.4, (FRONT + BACK) / 2, [C.grassDark, C.grassDark, C.grass, C.grass, C.grassDark, C.grass]));
            // Grass tufts and the odd flower along the top edge
            for (let i = 0; i < 3; i++) {
              const h = hash(col, row, i + 7);
              if (h < 0.55) continue;
              solidGeo.push(colourBox(0.06, 0.14 + h * 0.1, 0.06, x - 0.35 + i * 0.35, y + 0.55, FRONT - 0.1 - h * 0.5, uniform(h > 0.9 ? C.peg1 : C.grassDark)));
            }
          } else {
            solidGeo.push(colourBox(1, 1, DEPTH, x, y, (FRONT + BACK) / 2, uniform(face)));
          }
          // Pebbles and roots on the cut face
          const h = hash(col, row, 3);
          if (h > 0.55) solidGeo.push(colourBox(0.18 + h * 0.12, 0.1, 0.06, x - 0.2 + h * 0.3, y - 0.2 + h * 0.3, FRONT + 0.02, uniform(depth <= 1 ? C.soilDark : C.stoneDark)));
          if (depth === 1 && h < 0.3) solidGeo.push(colourBox(0.04, 0.4, 0.04, x + 0.2, y + 0.2, FRONT + 0.02, uniform(C.woodDark)));
        } else if (ch === 'H') {
          depth = 0;
          solidGeo.push(colourBox(1, 0.22, DEPTH, x, y + 0.39, (FRONT + BACK) / 2, [C.woodDark, C.woodDark, C.wood, C.woodDark, C.woodDark, C.wood]));
          solidGeo.push(colourBox(1, 0.78, DEPTH - 0.4, x, y - 0.11, (FRONT + BACK) / 2 - 0.1, uniform(C.soil)));
          for (const px of [-0.3, 0.3]) solidGeo.push(colourBox(0.12, 0.8, 0.12, x + px, y - 0.1, FRONT - 0.05, uniform(C.woodDark)));
          solidGeo.push(colourBox(1.01, 0.03, DEPTH + 0.01, x, y + 0.42, (FRONT + BACK) / 2, uniform(C.woodDark)));
        } else if (ch === 'x') {
          depth = 0;
          const g = new THREE.Group();
          g.add(M.mesh(M.box(1, 1, DEPTH), C.stone, 0, 0, (FRONT + BACK) / 2));
          for (let i = 0; i < 3; i++) {
            const crack = M.mesh(M.box(0.5, 0.05, DEPTH + 0.02), C.outline, -0.15 + i * 0.15, 0.3 - i * 0.25, (FRONT + BACK) / 2);
            crack.rotation.z = (i % 2 ? 1 : -1) * 0.5;
            g.add(crack);
          }
          const glow = new THREE.Mesh(M.box(0.9, 0.04, DEPTH * 0.9), glowMat);
          glow.position.set(0, 0.51, (FRONT + BACK) / 2);
          g.add(glow);
          g.position.set(x, y, 0);
          group.add(g);
          rv.cracked.set(`${col},${row}`, g);
        } else if (ch === '~') {
          const top = T[row - 1]?.[col] !== '~';
          let d = 0;
          for (let r = row; r > 0 && T[r - 1][col] === '~'; r--) d++;
          const col1 = new THREE.Color(C.water).lerp(new THREE.Color(C.waterDeep), Math.min(1, d / 2.5)).getHex();
          waterGeo.push(colourBox(1, top ? 0.9 : 1, DEPTH, x, top ? y - 0.05 : y, (FRONT + BACK) / 2, uniform(col1)));
        } else {
          depth = -1;
        }
      }
      // Bedrock under the room, so the diorama slice reads as solid ground (but not under a pit).
      if (T[ROOM_H - 1][col] !== '.') {
        solidGeo.push(colourBox(1, 1.2, DEPTH, col + 0.5, -0.6, (FRONT + BACK) / 2, uniform(hash(col, 99) > 0.5 ? C.rockDark : C.rock)));
      }
    }
    if (solidGeo.length) {
      const m = new THREE.Mesh(mergeGeometries(solidGeo), vcMat);
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
    if (waterGeo.length) {
      const m = new THREE.Mesh(mergeGeometries(waterGeo), waterMat);
      m.renderOrder = 2;
      group.add(m);
    }
    this.buildWaterSurfaces(room, rv);
    this.buildBridge(room, rv);
    this.buildGate(room, rv);
    this.buildBackdrop(room, rv);

    for (const it of room.items) {
      const o = it.kind === 'crate' ? M.crate() : M.boat();
      group.add(o);
      rv.items.set(it.id, o);
    }
    for (const _ of room.cacti) {
      const o = M.cactus();
      group.add(o);
      rv.cacti.push(o);
    }
    for (const _ of room.mines) {
      const o = M.mine();
      group.add(o);
      rv.mines.push(o);
    }
    for (const t of room.targets) {
      const o = M.target();
      o.position.set(t.col + 0.5, yOf(t.row) - 0.5, 0);
      group.add(o);
      rv.targets.push(o);
    }
    toonify(group);
    this.scene.add(group);
    return rv;
  }

  private buildWaterSurfaces(room: RoomState, rv: RoomView): void {
    const T = room.tiles;
    for (let row = 0; row < ROOM_H; row++) {
      let col = 0;
      while (col < ROOM_W) {
        if (T[row][col] !== '~' || T[row - 1]?.[col] === '~') { col++; continue; }
        const start = col;
        while (col < ROOM_W && T[row][col] === '~' && T[row - 1]?.[col] !== '~') col++;
        const len = col - start;
        const y = ROOM_H - row - 0.1;
        // Animated surface running from the cut face back towards the horizon (the river continues).
        const geo = new THREE.PlaneGeometry(len, 30, len * 4, 24);
        geo.rotateX(-Math.PI / 2);
        geo.translate(start + len / 2, y, FRONT - 15);
        const mesh = new THREE.Mesh(geo, surfaceMat);
        mesh.renderOrder = 3;
        mesh.receiveShadow = true;
        rv.group.add(mesh);
        rv.surfaces.push({ mesh, base: Float32Array.from(geo.attributes.position.array as Float32Array) });
        // Foam line along the cut face
        const foam = new THREE.Mesh(M.box(len, 0.06, 0.08), foamMat);
        foam.position.set(start + len / 2, y + 0.02, FRONT + 0.02);
        rv.group.add(foam);
      }
    }
  }

  private buildBridge(room: RoomState, rv: RoomView): void {
    const cells: [number, number][] = [];
    room.tiles.forEach((r, row) => r.forEach((ch, col) => { if (ch === '=') cells.push([col, row]); }));
    if (!cells.length) return;
    const c0 = Math.min(...cells.map((c) => c[0]));
    const c1 = Math.max(...cells.map((c) => c[0]));
    const row = cells[0][1];
    const len = c1 - c0 + 1;
    const pivot = new THREE.Group();
    pivot.position.set(c0, ROOM_H - row, 0);
    for (let i = 0; i < len * 3; i++) {
      pivot.add(M.mesh(M.box(0.3, 0.18, DEPTH - 0.3), i % 2 ? C.wood : C.woodDark, 0.17 + i * 0.333, -0.09, (FRONT + BACK) / 2));
    }
    pivot.add(M.mesh(M.box(len, 0.08, 0.1), C.woodDark, len / 2, -0.2, FRONT - 0.2));
    pivot.add(M.mesh(M.box(len, 0.08, 0.1), C.woodDark, len / 2, -0.2, BACK + 0.3));
    // Chains up to a post
    const post = M.mesh(M.box(0.16, 2.2, 0.16), C.woodDark, c0 - 0.1, ROOM_H - row + 1.0, FRONT - 0.3);
    rv.group.add(post);
    rv.group.add(pivot);
    rv.bridge = pivot;
  }

  private buildGate(room: RoomState, rv: RoomView): void {
    const rows: number[] = [];
    let gcol = -1;
    room.tiles.forEach((r, row) => r.forEach((ch, col) => { if (ch === 'G') { rows.push(row); gcol = col; } }));
    if (!rows.length) return;
    const bottom = ROOM_H - Math.max(...rows) - 1;
    const height = rows.length;
    const tower = M.tower(ROOM_H + 1.2);
    tower.position.set(gcol + 0.6, -1.2, -0.4);
    rv.group.add(tower);
    const gate = M.portcullis(height);
    gate.position.set(gcol + 0.5, bottom, 0);
    gate.userData.bottom = bottom;
    rv.group.add(gate);
    rv.gate = gate;
    rv.gateRows = height;
  }

  private buildBackdrop(room: RoomState, rv: RoomView): void {
    const g = rv.group;
    const groundY = 2 - 0.15;
    // Ground plane to the horizon
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W + 0.02, 120), M.paint(C.grass));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(ROOM_W / 2, groundY, BACK - 60);
    plane.receiveShadow = true;
    g.add(plane);
    // Trees near the playfield, hills behind, a castle far upriver
    const s = rv.slot + 1;
    const waterCols = new Set<number>();
    room.tiles.forEach((r) => r.forEach((ch, c) => { if (ch === '~') waterCols.add(c); }));
    for (let i = 0; i < 14; i++) {
      const x = hash(s, i, 1) * ROOM_W;
      if (waterCols.has(Math.floor(x))) continue;
      const t = M.tree(Math.floor(hash(s, i, 2) * 100));
      t.position.set(x, groundY, BACK - 0.8 - hash(s, i, 3) * 6);
      t.scale.setScalar(0.9 + hash(s, i, 4) * 0.8);
      g.add(t);
    }
    for (let i = 0; i < 9; i++) {
      const hill = M.mesh(M.ball(1, 0), [C.grassDark, C.grass, C.sand][i % 3], hash(s, i, 5) * (ROOM_W + 8) - 4, groundY, BACK - 14 - hash(s, i, 6) * 30);
      hill.scale.set(4 + hash(s, i, 7) * 5, 1.5 + hash(s, i, 8) * 3, 3 + hash(s, i, 9) * 3);
      hill.castShadow = false;
      g.add(hill);
    }
    if (rv.slot % 2 === 0) {
      const castle = new THREE.Group();
      for (const [x, h] of [[-1.6, 3], [0, 4.2], [1.6, 3]]) {
        const tw = M.tower(h);
        tw.position.x = x;
        castle.add(tw);
      }
      castle.add(M.mesh(M.box(3.2, 2, 1.4), C.stone, 0, 1, -0.6));
      castle.position.set(ROOM_W * 0.75, groundY, -60);
      castle.scale.setScalar(2.2);
      g.add(castle);
    }
  }

  private disposeRoom(rv: RoomView): void {
    this.scene.remove(rv.group);
    rv.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.material === vcMat) m.geometry.dispose();
      if (m.isMesh && (m.material === waterMat || m.material === surfaceMat)) m.geometry.dispose();
    });
  }

  // ---------------------------------------------------------------- updating a room

  private updateRoom(g: Game, rv: RoomView, dt: number): void {
    const room = g.room;
    const t = this.time;
    for (const it of room.items) {
      const o = rv.items.get(it.id);
      if (!o) continue;
      o.visible = !it.rescued;
      const bob = it.floating ? Math.sin(t * 2.4 + it.id) * 0.04 : 0;
      const tx = wx(it.x + it.w / 2);
      const ty = wy(it.y + it.h) + bob;
      // A freshly hooked item is reeled up to the chopper over a moment instead of snapping (HW-001).
      if (it.carried && o.userData.reel !== false) {
        o.position.x += (tx - o.position.x) * Math.min(1, dt * 20);
        o.position.y += (ty - o.position.y) * Math.min(1, dt * 12);
        if (Math.abs(ty - o.position.y) < 0.02) o.userData.reel = false;
      } else {
        o.position.set(tx, ty, 0);
        if (!it.carried) o.userData.reel = true;
      }
      o.rotation.z = it.floating ? Math.sin(t * 1.7 + it.id) * 0.06 : it.carried ? Math.sin(t * 3) * 0.05 : 0;
      if (it.kind === 'boat') {
        const b = o as M.BoatModel;
        const show = it.floating && !it.carried;
        b.userData.bar.visible = b.userData.barBack.visible = show;
        b.userData.bar.scale.x = Math.max(0.02, it.drownLeft / Boat.drownTicks);
        (b.userData.bar.material as THREE.MeshBasicMaterial).color.setHex(it.drownLeft / Boat.drownTicks < 0.3 ? C.red : C.foam);
        b.userData.crew.forEach((p, i) => { p.rotation.z = it.carried ? Math.sin(t * 8 + i) * 0.3 : Math.sin(t * 2 + i) * 0.08; });
      }
    }
    room.cacti.forEach((k, i) => {
      const o = rv.cacti[i];
      o.visible = k.grown;
      o.position.set(k.col + 0.5, ROOM_H - k.row - 1, 0);
      const grow = Math.min(1, k.age / Cactus.sproutTicks);
      const s = 0.35 + 0.65 * (1 - (1 - grow) ** 3);
      o.scale.set(s * (1 + Math.sin(t * 3 + i) * 0.02), s, s);
    });
    room.mines.forEach((m, i) => {
      const o = rv.mines[i];
      o.visible = m.alive;
      o.position.set(wx(m.x + m.w / 2), wy(m.y + m.h) + Math.sin(t * 2 + i) * 0.04, 0);
      o.rotation.y = t * 0.6;
      const light = (o.userData as { light: THREE.Mesh }).light;
      light.visible = Math.floor(t * 3) % 2 === 0;
    });
    room.targets.forEach((tg, i) => {
      const o = rv.targets[i];
      // A hit board swings up on its rope, so it reads as "done" at a glance.
      const board = o.userData.board as THREE.Object3D;
      const want = tg.hit ? -1.4 : Math.sin(t * 1.3 + i) * 0.05;
      board.rotation.x += (want - board.rotation.x) * Math.min(1, dt * 6);
      o.position.y = ROOM_H - tg.row - 1 + Math.sin(t * 1.5 + i) * 0.03;
    });
    for (const [key, obj] of rv.cracked) {
      const [c, r] = key.split(',').map(Number);
      obj.visible = room.tiles[r][c] === 'x';
    }
    if (rv.bridge) {
      const want = room.bridgesDown ? 0 : 1;
      rv.bridgeAngle += (want - rv.bridgeAngle) * Math.min(1, dt * 5);
      rv.bridge.rotation.z = rv.bridgeAngle * 1.35;
    }
    if (rv.gate) {
      const want = room.gateOpen ? 1 : 0;
      rv.gateLift += (want - rv.gateLift) * Math.min(1, dt * 2);
      rv.gate.position.y = (rv.gate.userData.bottom as number) + rv.gateLift * (rv.gateRows + 1);
    }
    for (const s of rv.surfaces) {
      const pos = s.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const a = pos.array as Float32Array;
      for (let i = 0; i < a.length; i += 3) {
        const x = s.base[i];
        const z = s.base[i + 2];
        a[i + 1] = s.base[i + 1] + Math.sin(x * 2.2 + t * 2.1) * 0.035 + Math.sin(z * 1.3 + t * 1.4) * 0.03;
      }
      pos.needsUpdate = true;
    }
  }

  private updatePlayer(g: Game, rv: RoomView, alpha: number, dt: number): void {
    const p = g.player;
    const dead = p.deadTicks > 0;
    this.player.visible = !dead;
    const x = p.px + (p.x - p.px) * alpha;
    const y = p.py + (p.y - p.py) * alpha;
    this.player.position.set(rv.x0 + wx(x + p.w / 2), wy(y + p.h), 0);

    // Fold animation between bodies: the old one shrinks as the new one grows.
    if (p.body !== this.bodyShown && p.foldTicks === 0) this.bodyShown = p.body;
    const fold = p.foldTicks > 0 ? p.foldTicks / Switch.foldTicks : 0;
    const newBody = p.body === 'tank' ? this.tank : this.chopper;
    const oldBody = p.body === 'tank' ? this.chopper : this.tank;
    newBody.visible = true;
    oldBody.visible = fold > 0.02;
    const grow = 1 - fold;
    // Squash and stretch: a spring driven by landings and jumps.
    this.squashV += (-this.squash * 220 - this.squashV * 16) * dt;
    this.squash += this.squashV * dt;
    const sq = Math.max(-0.35, Math.min(0.35, this.squash));
    const stretch = p.body === 'tank' && p.vy < -60 ? 0.08 : 0;
    newBody.scale.set((1 + sq * 0.8 - stretch * 0.5) * grow, (1 - sq + stretch) * Math.max(0.05, grow), grow);
    oldBody.scale.setScalar(Math.max(0.01, fold));

    const face = p.facing;
    this.tank.rotation.y = 0;
    this.tank.scale.x *= face;
    const tu = this.tank.userData;
    tu.wheels.forEach((w) => { w.rotation.y -= (p.vx / TILE) * dt * 5; });
    tu.key.rotation.x += dt * (2 + Math.abs(p.vx) / 30);

    const cu = this.chopper.userData;
    this.chopper.scale.x *= face;
    const thrust = p.body === 'chopper' && p.fuel > 0 && p.vy < 20;
    cu.rotor.rotation.y += dt * (thrust ? 32 : p.body === 'chopper' ? 20 : 4);
    cu.tail.rotation.z += dt * 30;
    this.chopper.rotation.z = -(p.vx / Chopper.maxSpeed) * 0.22;
    this.chopper.position.y = Math.sin(this.time * 6) * 0.02;
    // Hook line: runs from the skids down to the load, so it visibly reels the load in.
    let line = 0;
    if (p.carrying) {
      const o = rv.items.get(p.carrying.id);
      const top = o ? o.position.y + p.carrying.h / TILE : 0;
      line = o ? Math.max(Chopper.hangGap / TILE + 0.05, this.player.position.y - top) : 0;
    }
    cu.line.visible = cu.hook.visible = line > 0.01;
    cu.line.scale.y = Math.max(0.01, line);
    cu.hook.position.y = -line;

    // Rotor wash on water below the chopper
    if (p.body === 'chopper' && !dead) {
      this.washT -= dt;
      const below = this.waterBelow(g, p.x + p.w / 2, p.y + p.h);
      if (below !== null && below - (p.y + p.h) < 40 && this.washT <= 0) {
        this.washT = 0.06;
        this.fx.rotorWash(rv.x0 + wx(p.x + p.w / 2), wy(below));
      }
    }
  }

  private waterBelow(g: Game, x: number, y: number): number | null {
    const col = Math.floor(x / TILE);
    for (let row = Math.max(0, Math.floor(y / TILE)); row < ROOM_H; row++) {
      const ch = g.room.tiles[row]?.[col];
      if (ch === '~') return row * TILE;
      if (ch && ch !== '.') return null;
    }
    return null;
  }

  private updateProjectiles(g: Game, rv: RoomView): void {
    const s = g.shell;
    this.shellM.visible = !!s;
    if (s) this.shellM.position.set(rv.x0 + wx(s.x + s.w / 2), wy(s.y + s.h), 0);
    const c = g.charge;
    this.chargeM.visible = !!c;
    if (c) {
      this.chargeM.position.set(rv.x0 + wx(c.x + c.w / 2), wy(c.y + c.h), 0);
      this.chargeM.rotation.z += 0.2;
    }
  }

  // ---------------------------------------------------------------- events → effects

  private handleEvents(g: Game, events: GameEvent[], rv: RoomView): void {
    const X = (px: number) => rv.x0 + wx(px);
    for (const e of events) {
      const x = X(e.x);
      const y = wy(e.y);
      switch (e.type) {
        case 'jump':
          this.squash = -0.18;
          this.squashV = 0;
          this.fx.dust(x, y, 4);
          break;
        case 'land': {
          const k = Math.min(1, (e.n ?? 0) / 400);
          this.squash = 0.12 + 0.2 * k;
          this.squashV = 0;
          this.fx.dust(x, y, 3 + Math.round(k * 6));
          if (k > 0.7) this.shakeBy(0.35);
          break;
        }
        case 'fire':
          this.squash = 0.1;
          this.fx.sparks(x, y + 0.6);
          break;
        case 'shellPoof':
        case 'targetHit':
          this.fx.chips(x, y, [C.wood, C.cream, C.red], 8);
          break;
        case 'bridgeDown':
          this.shakeBy(0.25);
          break;
        case 'blast':
          this.fx.chips(x, y, [C.woodDark, C.brass, C.red, C.bomb], 16);
          this.fx.sparks(x, y);
          this.shakeBy(0.45);
          break;
        case 'cactusGone':
          this.fx.chips(x, y, [C.cactus, C.grassDark, C.red], 12);
          break;
        case 'cactusSprout':
          this.fx.dust(x, y, 4);
          break;
        case 'mineClear':
          this.fx.chips(x, y, [C.mine, C.red, C.bomb], 14);
          this.fx.splash(x, y, 10);
          break;
        case 'floorBreak':
          this.fx.chips(x, y, [C.stone, C.stoneDark], 16);
          this.shakeBy(0.4);
          break;
        case 'splash':
          this.fx.splash(x, y, 14);
          break;
        case 'switch':
          this.fx.sparks(x, y);
          this.fx.dust(x, y - 0.3, 5);
          break;
        case 'hook':
        case 'setDown':
          this.fx.dust(x, y, 3);
          break;
        case 'rescue':
          this.fx.confetti(x, y + 0.5);
          break;
        case 'gateOpen':
          this.shakeBy(0.3);
          break;
        case 'death':
          this.fx.chips(x, y, e.n === 0 ? [C.olive, C.oliveDark, C.brass, C.cream] : [C.olive, C.cream, 0xa9d8e6, C.oliveDark], 22);
          this.shakeBy(0.6);
          break;
        case 'boatLost':
          this.fx.chips(x, y, [C.hull, C.stripe, C.wood], 18);
          this.fx.splash(x, y, 12);
          break;
        case 'respawn':
          this.fx.sparks(x, y);
          break;
      }
    }
    void g;
  }
}
