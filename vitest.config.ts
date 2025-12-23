import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'services/**/*.ts',
        'components/**/*.tsx',
        'App.tsx',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        'coverage/',
        'vitest.setup.ts',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        'index.tsx',
        'types.ts',
        'server.js',
      ],
      all: true,
      thresholds: {
        lines: 10,
        functions: 25,
        branches: 55,
        statements: 10,
      },
    },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
