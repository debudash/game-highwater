// HW: RG-001 lesson carried over — found by River Guard's browser bot (a short sprite crashed the
// render loop). Here: every model is built and has its declared size, so a broken model shows up in
// the unit tests rather than in the browser.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { MODEL_SIZES } from '../src/view/models';

function bounds(o: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3();
  o.updateMatrixWorld(true);
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh || m.userData.hull || m.userData.noBounds) return;
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
  });
  return box.getSize(new THREE.Vector3());
}

describe('models', () => {
  for (const [name, spec] of Object.entries(MODEL_SIZES)) {
    it(`${name} builds at its declared size`, () => {
      const size = bounds(spec.build());
      expect(size.x, `${name} width`).toBeCloseTo(spec.w, 1);
      expect(size.y, `${name} height`).toBeCloseTo(spec.h, 1);
    });
  }
});
