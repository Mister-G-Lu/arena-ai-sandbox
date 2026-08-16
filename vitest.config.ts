import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest-only config. The app build/dev config lives in vite.config.js.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: false,
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  },
});
