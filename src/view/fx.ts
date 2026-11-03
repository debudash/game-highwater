// Cosmetic particles: dust, wooden chips, splashes and confetti. View-only, so Math.random is fine
// here; nothing feeds back into the sim. Particles shrink away instead of fading, so they can share
// materials.

import * as THREE from 'three';
import { C } from './palette';
import { paint } from './models';

type Kind = 'dust' | 'chip' | 'drop' | 'confetti' | 'spark';

interface P {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  kind: Kind;
  floor: number;
}

const GEO = {
  dust: new THREE.IcosahedronGeometry(1, 0),
  chip: new THREE.BoxGeometry(1, 0.5, 0.6),
  drop: new THREE.IcosahedronGeometry(1, 0),
  confetti: new THREE.BoxGeometry(1, 0.12, 0.6),
  spark: new THREE.IcosahedronGeometry(1, 0),
};

export class Fx {
  private pool: P[] = [];
  private live: P[] = [];
  constructor(private scene: THREE.Scene) {}

  private take(kind: Kind, color: number): P {
    let p = this.pool.pop();
    if (!p) {
      const mesh = new THREE.Mesh(GEO[kind], paint(color));
      mesh.castShadow = false;
      p = { mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, max: 1, size: 1, kind, floor: -99 };
      this.scene.add(mesh);
    }
    p.kind = kind;
    p.mesh.geometry = GEO[kind];
    p.mesh.material = kind === 'spark' ? sparkMat(color) : paint(color);
    p.mesh.visible = true;
    this.live.push(p);
    return p;
  }

  private emit(kind: Kind, colors: number[], x: number, y: number, n: number, speed: number, size: number, life: number, up = 1, floor = -99): void {
    for (let i = 0; i < n; i++) {
      const p = this.take(kind, colors[i % colors.length]);
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      p.mesh.position.set(x + (Math.random() - 0.5) * 0.2, y, (Math.random() - 0.5) * 0.4);
      p.vel.set(Math.cos(a) * s, Math.abs(Math.sin(a)) * s * up + speed * 0.3 * up, (Math.random() - 0.5) * s * 0.6);
      p.spin.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
      p.size = size * (0.6 + Math.random() * 0.8);
      p.max = p.life = life * (0.7 + Math.random() * 0.6);
      p.floor = floor;
      p.mesh.scale.setScalar(p.size);
    }
  }

  dust(x: number, y: number, n = 6) { this.emit('dust', [C.sand, C.cream], x, y + 0.05, n, 1.2, 0.08, 0.45, 0.5); }
  chips(x: number, y: number, colors: number[], n = 14) { this.emit('chip', colors, x, y, n, 4, 0.09, 1.1, 1.2, y - 2); }
  splash(x: number, y: number, n = 12) { this.emit('drop', [C.water, C.foam], x, y, n, 3, 0.07, 0.7, 1.4); }
  confetti(x: number, y: number) { this.emit('confetti', [C.red, C.peg1, C.peg2, C.peg3, C.cream], x, y, 26, 4, 0.1, 1.6, 1.4); }
  sparks(x: number, y: number) { this.emit('spark', [C.brass, 0xffe08a], x, y, 10, 3, 0.06, 0.35, 1); }
  rotorWash(x: number, y: number) { this.emit('drop', [C.foam], x, y, 2, 1.5, 0.05, 0.4, 0.6); }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.live.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      const g = p.kind === 'dust' ? -0.5 : p.kind === 'confetti' ? 3 : 12;
      p.vel.y -= g * dt;
      if (p.kind === 'confetti') p.vel.multiplyScalar(1 - 2.5 * dt);
      if (p.kind === 'dust') p.vel.multiplyScalar(1 - 4 * dt);
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.mesh.position.y < p.floor) {
        p.mesh.position.y = p.floor;
        p.vel.y *= -0.4;
        p.vel.x *= 0.6;
      }
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      const t = p.life / p.max;
      const s = p.kind === 'dust' ? p.size * (1.6 - 0.6 * t) * Math.min(1, t * 3) : p.size * Math.min(1, t * 2.5);
      p.mesh.scale.setScalar(s);
    }
  }
}

const sparkMats = new Map<number, THREE.Material>();
function sparkMat(color: number): THREE.Material {
  let m = sparkMats.get(color);
  if (!m) sparkMats.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
