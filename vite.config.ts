import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths work both locally (Docker) and on GitHub Pages under /game-highwater/.
  base: './',
  build: { outDir: 'dist', target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 800 },
});
