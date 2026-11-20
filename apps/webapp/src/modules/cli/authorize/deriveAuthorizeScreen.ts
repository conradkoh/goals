import type {
  AuthorizationRequestStatus,
  AuthorizationRequestView,
} from '@workspace/backend/convex/cli/auth';

/** A terminal-screen state the approval flow has resolved to locally. */
export type LocalOutcome =
  | 'approved'
  | 'denied'
  | 'too_many_attempts'
  | 'expired'
  | 'already_resolved'
  | 'not_found'
  | 'login_disabled';

/** Inline form error: a wrong code with attempts left, or a transport failure worth retrying. */
export type FormError =
  { kind: 'mismatch'; attemptsLeft: number } | { kind: 'network'; action: 'approve' | 'deny' };

/** What the approval page should render right now. */
export type AuthorizeScreen =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      machineName: string;
      environment?: string;
      createdAt?: number;
      expiresAt?: number;
    }
  | { kind: 'approved'; machineName?: string }
  | { kind: 'denied-by-you' }
  | { kind: 'too-many-attempts' }
  | { kind: 'expired'; ttlMinutes?: number }
  | { kind: 'already-approved' }
  | { kind: 'consumed' }
  | { kind: 'denied' }
  | { kind: 'already-handled' }
  | { kind: 'not-found' }
  | { kind: 'login-disabled' };

const MINUTE_MS = 60_000;

/** Outcomes whose screen does not depend on the request view, keyed once to avoid a switch. */
const OUTCOME_SCREENS: Record<Exclude<LocalOutcome, 'approved' | 'expired'>, AuthorizeScreen> = {
  denied: { kind: 'denied-by-you' },
  too_many_attempts: { kind: 'too-many-attempts' },
  already_resolved: { kind: 'already-handled' },
  not_found: { kind: 'not-found' },
  login_disabled: { kind: 'login-disabled' },
};

/** Server statuses that map to a fixed screen (pending and expired need view data). */
const STATUS_SCREENS: Record<
  Exclude<AuthorizationRequestStatus, 'pending' | 'expired'>,
  AuthorizeScreen
> = {
  approved: { kind: 'already-approved' },
  consumed: { kind: 'consumed' },
  denied: { kind: 'denied' },
  not_found: { kind: 'not-found' },
};

/** Rounded request lifetime in minutes, when the view reported both timestamps. */
function getTtlMinutes(view: AuthorizationRequestView | undefined): number | undefined {
  if (view?.createdAt === undefined || view.expiresAt === undefined) return undefined;
  return Math.round((view.expiresAt - view.createdAt) / MINUTE_MS);
}

/** True when a pending request's expiry has passed on the client clock. */
function isPastExpiry(view: AuthorizationRequestView, now: number): boolean {
  return view.expiresAt !== undefined && now >= view.expiresAt;
}

/** Maps an action result the browser cannot re-derive about itself onto its terminal screen. */
function fromOutcome(
  outcome: LocalOutcome,
  view: AuthorizationRequestView | undefined
): AuthorizeScreen {
  if (outcome === 'approved') return { kind: 'approved', machineName: view?.machineName };
  if (outcome === 'expired') return { kind: 'expired', ttlMinutes: getTtlMinutes(view) };
  return OUTCOME_SCREENS[outcome];
}

/** Maps a still-pending request, splitting by client-clock expiry. */
function fromPending(view: AuthorizationRequestView, now: number): AuthorizeScreen {
  if (isPastExpiry(view, now)) return { kind: 'expired', ttlMinutes: getTtlMinutes(view) };
  return {
    kind: 'ready',
    machineName: view.machineName ?? 'Unknown machine',
    environment: view.environment,
    createdAt: view.createdAt,
    expiresAt: view.expiresAt,
  };
}

/** Maps the reactive server view to a screen when this tab has no local outcome. */
function fromView(view: AuthorizationRequestView | undefined, now: number): AuthorizeScreen {
  if (view === undefined) return { kind: 'loading' };
  if (view.status === 'pending') return fromPending(view, now);
  if (view.status === 'expired') return { kind: 'expired', ttlMinutes: getTtlMinutes(view) };
  return STATUS_SCREENS[view.status];
}

/**
 * Single source of truth for the approval screen.
 *
 * A local `outcome` (this tab's own action result) wins over the reactive server view, so
 * "you approved" survives the query flipping to `approved`/`consumed` and the success copy is
 * not replaced mid-read. Expiry is time-derived because the server does not push it.
 */
export function deriveAuthorizeScreen(input: {
  view: AuthorizationRequestView | undefined;
  outcome: LocalOutcome | null;
  now: number;
}): AuthorizeScreen {
  if (input.outcome !== null) return fromOutcome(input.outcome, input.view);
  return fromView(input.view, input.now);
}
