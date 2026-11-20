/**
 * Wire contract shared by the `goals` CLI and the backend gateway.
 *
 * This module is intentionally type-only apart from `CLI_OP_NAMES`: the CLI
 * compiles against it without pulling the Convex runtime, and the backend
 * imports it with `import type` so nothing resolves in the Convex bundle.
 * The only structural dependency is the quarterly markdown summary shape that
 * `export.quarterSummary` returns.
 */

import type { MarkdownQuarterSummary } from '../quarterly-markdown/types';

/** Goal families exposed by the gateway. */
export type CliScope = 'quarterly' | 'weekly' | 'daily' | 'adhoc';

/** Error codes the gateway can return. */
export type CliErrorCode =
  | 'invalid_argument'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'payload_too_large'
  | 'login_disabled'
  | 'internal';

/** Error payload carried by every failed gateway response. */
export interface CliErrorBody {
  error: { code: CliErrorCode; message: string };
}

/** Discriminated success/error response for `/cli/v1/call`. */
export type CliResponse<T> = { ok: true; data: T } | ({ ok: false } & CliErrorBody);

/** A goal as returned by list ops. Adhoc rows never expose `quarter`. */
export interface CliGoalRow {
  id: string;
  scope: CliScope;
  title: string;
  details?: string;
  isComplete: boolean;
  completedAt?: number;
  year: number;
  quarter?: number;
  week?: number;
  dayOfWeek?: number;
  parentId?: string;
  initiativeId?: string;
  domainId?: string;
  domainName?: string;
}

/** A single goal with its parent title, due date and direct children. */
export interface CliGoalDetail extends CliGoalRow {
  parentTitle?: string;
  dueDate?: number;
  children: { id: string; title: string; isComplete: boolean }[];
}

/** An initiative as returned by the gateway. */
export interface CliInitiative {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate?: number;
}

/** A bounded list plus whether more rows existed. */
export interface CliList<T> {
  items: T[];
  truncated: boolean;
}

/** Arguments of `goal.list`. */
export interface CliGoalListArgs {
  scope: CliScope;
  year: number;
  quarter?: number;
  week?: number;
  initiativeId?: string;
  limit?: number;
}

/** Arguments of `goal.create`. */
export interface CliGoalCreateArgs {
  scope: CliScope;
  title: string;
  details?: string;
  year?: number;
  quarter?: number;
  week?: number;
  parentId?: string;
  dayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  domainId?: string;
  initiativeId?: string;
}

/** Complete operation registry: every op's args and result type. */
export interface CliOpMap {
  'auth.whoami': {
    args: Record<string, never>;
    result: {
      userId: string;
      name: string;
      email?: string;
      credentialId: string;
      machineName: string;
      environment?: string;
      createdAt: number;
      expiresAt: number;
    };
  };
  'goal.list': { args: CliGoalListArgs; result: CliList<CliGoalRow> };
  'goal.get': { args: { id: string }; result: CliGoalDetail };
  'goal.create': { args: CliGoalCreateArgs; result: { id: string } };
  'goal.rename': { args: { id: string; title: string }; result: { id: string } };
  'goal.setComplete': {
    args: { id: string; isComplete: boolean; week?: number; includeChildren?: boolean };
    result: { id: string; isComplete: boolean };
  };
  'goal.delete': { args: { id: string }; result: { id: string } };
  'initiative.list': { args: { limit?: number }; result: CliList<CliInitiative> };
  'initiative.get': {
    args: { id: string };
    result: { initiative: CliInitiative; goals: CliList<CliGoalRow> };
  };
  'export.quarterSummary': {
    args: {
      year: number;
      quarter: 1 | 2 | 3 | 4;
      goalIds?: string[];
      includeAdhoc?: boolean;
      adhocDomainIds?: string[];
    };
    result: { summary: MarkdownQuarterSummary };
  };
}

/** Every op name the gateway accepts. */
export type CliOpName = keyof CliOpMap;

// Compile-time exhaustive: adding an op to CliOpMap without listing it here is
// an error, and so is an extra key.
const OP_NAME_SET: Record<CliOpName, true> = {
  'auth.whoami': true,
  'goal.list': true,
  'goal.get': true,
  'goal.create': true,
  'goal.rename': true,
  'goal.setComplete': true,
  'goal.delete': true,
  'initiative.list': true,
  'initiative.get': true,
  'export.quarterSummary': true,
};

/** Sorted op names; the gateway registry must declare exactly these keys. */
export const CLI_OP_NAMES = (Object.keys(OP_NAME_SET) as CliOpName[]).sort();

/** Body of `POST /cli/auth/requests`. */
export interface LoginRequestBody {
  installationId: string;
  machineName: string;
  environment?: string;
}

/** Response of `POST /cli/auth/requests`. */
export interface LoginRequestResponse {
  requestId: string;
  deviceCode: string;
  userCode: string;
  expiresAt: number;
  intervalMs: number;
}

/** Outcome of polling `POST /cli/auth/token`. */
export type TokenExchangeResponse =
  | { status: 'pending'; intervalMs: number }
  | {
      status: 'approved';
      token: string;
      tokenId: string;
      expiresAt: number;
      account: { userId: string; name: string; email?: string };
    }
  | { status: 'denied' }
  | { status: 'expired' | 'consumed' }
  | { status: 'not_found' };
