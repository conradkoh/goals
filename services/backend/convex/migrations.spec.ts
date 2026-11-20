import { describe, expect, test } from 'vitest';

import { sessionCreatedAtBackfill } from './migrations';
import schema from './schema';
import { convexTest } from '../src/util/test';

describe('sessionCreatedAtBackfill', () => {
  test('backfills a missing createdAt from lastActivityAt', () => {
    expect(sessionCreatedAtBackfill({ lastActivityAt: 1_700_000_000_000 })).toEqual({
      createdAt: 1_700_000_000_000,
    });
  });

  test('falls back to lastActiveAt when lastActivityAt is absent', () => {
    expect(sessionCreatedAtBackfill({ lastActiveAt: 1739868668642 })).toEqual({
      createdAt: 1739868668642,
    });
  });

  test('leaves a row that already has createdAt untouched', () => {
    expect(sessionCreatedAtBackfill({ createdAt: 1, lastActivityAt: 2 })).toBeUndefined();
  });

  test('is idempotent: a backfilled row needs no second write', () => {
    const legacy = { lastActiveAt: 1739868668642 };
    const patch = sessionCreatedAtBackfill(legacy);
    expect(sessionCreatedAtBackfill({ ...legacy, ...patch })).toBeUndefined();
  });
});

describe('sessions schema with legacy rows', () => {
  test('accepts a row with neither createdAt nor sessionId', async () => {
    const t = convexTest(schema);
    const id = await t.run((ctx) =>
      ctx.db.insert('sessions', { status: 'active', lastActiveAt: 1739868668642 })
    );
    expect(await t.run((ctx) => ctx.db.get('sessions', id))).toMatchObject({
      lastActiveAt: 1739868668642,
    });
  });

  test('a sessionId-less row is never matched by a by_sessionId lookup', async () => {
    const t = convexTest(schema);
    await t.run((ctx) =>
      ctx.db.insert('sessions', { status: 'active', lastActiveAt: 1739868668642 })
    );
    const found = await t.run((ctx) =>
      ctx.db
        .query('sessions')
        .withIndex('by_sessionId', (q) => q.eq('sessionId', 'any-client-session-id'))
        .first()
    );
    expect(found).toBeNull();
  });
});
