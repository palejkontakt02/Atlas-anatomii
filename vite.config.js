import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: { outDir: 'dist', chunkSizeWarningLimit: 1000 },
  test: { include: ['tests/**/*.test.js'] },
});
