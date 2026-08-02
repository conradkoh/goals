import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    maxWorkers: 4,
    server: { deps: { inline: ['convex-test'] } },
  },
});
