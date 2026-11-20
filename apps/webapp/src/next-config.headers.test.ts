import { describe, expect, it } from 'vitest';

import nextConfig from '../next.config';

describe('next.config headers', () => {
  it('locks down the /cli/authorize response', async () => {
    const headers = await nextConfig.headers?.();

    expect(headers).toEqual([
      {
        source: '/cli/authorize',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ]);
  });
});
