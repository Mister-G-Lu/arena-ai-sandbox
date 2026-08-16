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
    // Stable dependency groups keep the playable shell and route chunks small
    // as authored story content grows. Rolldown's native groups supersede the
    // deprecated Rollup manualChunks compatibility option.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'supabase',
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 3,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 2,
            },
            {
              name: 'validation',
              test: /node_modules[\\/]zod[\\/]/,
              priority: 2,
            },
          ],
        },
      },
    },
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
