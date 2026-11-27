import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'tests/unit/**/*.test.ts',
      'tests/unit/**/*.test.tsx',
      'tests/server/**/*.test.ts',
      'tests/server/**/*.test.mjs',
    ],
    setupFiles: ['./tests/unit/setup.ts'],
  },
});
