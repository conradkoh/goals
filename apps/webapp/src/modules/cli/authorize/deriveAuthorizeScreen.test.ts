import type { AuthorizationRequestView } from '@workspace/backend/convex/cli/auth';
import { describe, expect, it } from 'vitest';

import { deriveAuthorizeScreen } from './deriveAuthorizeScreen';

const createdAt = 1_700_000_000_000;
const expiresAt = createdAt + 10 * 60_000;

function pendingView(overrides: Partial<AuthorizationRequestView> = {}): AuthorizationRequestView {
  return {
    status: 'pending',
    machineName: "Conrad's MacBook Pro",
    environment: 'local',
    createdAt,
    expiresAt,
    ...overrides,
  };
}

describe('deriveAuthorizeScreen', () => {
  it('shows loading while the view is undefined', () => {
    expect(deriveAuthorizeScreen({ view: undefined, outcome: null, now: createdAt })).toEqual({
      kind: 'loading',
    });
  });

  it('maps a pending request to the ready screen', () => {
    expect(deriveAuthorizeScreen({ view: pendingView(), outcome: null, now: createdAt })).toEqual({
      kind: 'ready',
      machineName: "Conrad's MacBook Pro",
      environment: 'local',
      createdAt,
      expiresAt,
    });
  });

  it('falls back to Unknown machine when the CLI did not report one', () => {
    const view = pendingView({ machineName: undefined });
    expect(deriveAuthorizeScreen({ view, outcome: null, now: createdAt })).toMatchObject({
      kind: 'ready',
      machineName: 'Unknown machine',
    });
  });

  it('treats a pending request past expiresAt as expired', () => {
    expect(deriveAuthorizeScreen({ view: pendingView(), outcome: null, now: expiresAt })).toEqual({
      kind: 'expired',
      ttlMinutes: 10,
    });
  });

  it('maps approved, consumed and denied statuses', () => {
    expect(
      deriveAuthorizeScreen({ view: { status: 'approved' }, outcome: null, now: createdAt })
    ).toEqual({ kind: 'already-approved' });
    expect(
      deriveAuthorizeScreen({ view: { status: 'consumed' }, outcome: null, now: createdAt })
    ).toEqual({ kind: 'consumed' });
    expect(
      deriveAuthorizeScreen({ view: { status: 'denied' }, outcome: null, now: createdAt })
    ).toEqual({ kind: 'denied' });
  });

  it('maps the expired and not_found statuses', () => {
    expect(
      deriveAuthorizeScreen({ view: { status: 'expired' }, outcome: null, now: createdAt })
    ).toEqual({ kind: 'expired', ttlMinutes: undefined });
    expect(
      deriveAuthorizeScreen({ view: { status: 'not_found' }, outcome: null, now: createdAt })
    ).toEqual({ kind: 'not-found' });
  });

  it('maps local outcomes to their terminal screens', () => {
    expect(
      deriveAuthorizeScreen({ view: pendingView(), outcome: 'approved', now: createdAt })
    ).toEqual({ kind: 'approved', machineName: "Conrad's MacBook Pro" });
    expect(
      deriveAuthorizeScreen({ view: pendingView(), outcome: 'denied', now: createdAt })
    ).toEqual({ kind: 'denied-by-you' });
    expect(
      deriveAuthorizeScreen({ view: pendingView(), outcome: 'too_many_attempts', now: createdAt })
    ).toEqual({ kind: 'too-many-attempts' });
    expect(
      deriveAuthorizeScreen({ view: pendingView(), outcome: 'expired', now: createdAt })
    ).toEqual({ kind: 'expired', ttlMinutes: 10 });
    expect(
      deriveAuthorizeScreen({ view: pendingView(), outcome: 'already_resolved', now: createdAt })
    ).toEqual({ kind: 'already-handled' });
    expect(
      deriveAuthorizeScreen({ view: pendingView(), outcome: 'not_found', now: createdAt })
    ).toEqual({ kind: 'not-found' });
    expect(
      deriveAuthorizeScreen({ view: pendingView(), outcome: 'login_disabled', now: createdAt })
    ).toEqual({ kind: 'login-disabled' });
  });

  it('lets a local outcome win over a later server status', () => {
    expect(
      deriveAuthorizeScreen({ view: { status: 'consumed' }, outcome: 'approved', now: createdAt })
    ).toEqual({ kind: 'approved', machineName: undefined });
    expect(
      deriveAuthorizeScreen({
        view: { status: 'denied' },
        outcome: 'too_many_attempts',
        now: createdAt,
      })
    ).toEqual({ kind: 'too-many-attempts' });
  });
});
