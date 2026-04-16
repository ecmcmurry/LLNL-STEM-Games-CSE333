import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the built dist/ works inside any iframe/subdirectory
  base: './',
  // Explicitly declare public assets directory so Vite copies it to dist/
  publicDir: 'public',
});
