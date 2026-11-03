// RG-001 lesson, carried to look B: River Guard's browser bot caught a render crash from a short
// sprite. Here every built image listed in public/art/sizes.json must exist with exactly that size,
// and every sprite the 2D view draws must have either built art or a code placeholder, so a missing
// or broken image shows up in the unit tests rather than in the browser.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLACEHOLDERS } from '../src/view2d/placeholders';
import { SPRITES } from '../src/view2d/sprites';

const ART = `${process.cwd()}/public/art`;
const join = (...parts: string[]) => parts.join('/');
const sizes: Record<string, [number, number]> = existsSync(join(ART, 'sizes.json'))
  ? JSON.parse(readFileSync(join(ART, 'sizes.json'), 'utf-8'))
  : {};

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): [number, number] {
  const b = readFileSync(file);
  expect(String.fromCharCode(b[1], b[2], b[3]), `${file} is a PNG`).toBe('PNG');
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return [v.getUint32(16), v.getUint32(20)];
}

describe('look-B art', () => {
  for (const [name, [w, h]] of Object.entries(sizes)) {
    it(`${name} is built at its listed size`, () => {
      const file = join(ART, `${name}.${name.startsWith('bg-') ? 'webp' : 'png'}`);
      expect(existsSync(file), file).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(0);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      if (file.endsWith('.png')) expect(pngSize(file)).toEqual([w, h]);
    });
  }

  it('every sprite the 2D view draws has art or a placeholder', () => {
    for (const name of Object.keys(SPRITES)) {
      expect(name in sizes || typeof PLACEHOLDERS[name] === 'function', name).toBe(true);
    }
  });
});
