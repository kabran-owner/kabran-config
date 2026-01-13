import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/node/**/*.test.mjs'],
    globals: false,
    environment: 'node',
    isolate: true,
    mockReset: true,
    coverage: {
      provider: 'v8',
      include: ['src/scripts/**/*.mjs'],
      exclude: ['src/scripts/ci/**', 'src/scripts/deploy/**'],
    },
  },
});
