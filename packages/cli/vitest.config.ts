import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `entry.spec.ts` and `skill.e2e.spec.ts` both compile into `dist/`; running test files in
    // parallel lets one spawn a half-written `dist/cli.js` while the other rebuilds it.
    fileParallelism: false,
  },
});
