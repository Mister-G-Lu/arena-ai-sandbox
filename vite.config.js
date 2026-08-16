import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this project from /arena-ai-sandbox/.
  // Relative assets keep both Pages and local previews working.
  base: './',
  build: {
    outDir: 'docs',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
