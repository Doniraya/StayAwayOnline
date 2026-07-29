import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@stay-away/shared': path.resolve(__dirname, '../shared'),
    },
  },
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
