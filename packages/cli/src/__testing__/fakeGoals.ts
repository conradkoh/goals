import { isoWeekOf } from '../iso-week.js';
import type {
  CliGoalCreateArgs,
  CliGoalDetail,
  CliGoalListArgs,
  CliGoalRow,
  CliInitiative,
  CliList,
  CliScope,
} from '../vendor/cli-contract/index.js';

/** A gateway-shaped failure the fake returns for the next `POST /cli/v1/call`. */
export interface GatewayFailure {
  status: number;
  code: string;
  message: string;
}

/** Fields a spec can seed; ids, ownership and derived fields are added by the engine. */
export interface SeedGoalFields {
  /** Defaults to the backend's current user; set to simulate a foreign-owned id. */
  ownerUserId?: string;
  scope: CliScope;
  title: string;
  details?: string;
  isComplete?: boolean;
  completedAt?: number;
  year: number;
  quarter?: number;
  week?: number;
  dayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  parentId?: string;
  initiativeId?: string;
  domainId?: string;
  domainName?: string;
  dueDate?: number;
}

/** Fields a spec can seed for an initiative; ids and ownership are added by the engine. */
export interface SeedInitiativeFields {
  ownerUserId?: string;
  title: string;
  description?: string;
  startDate: number;
  endDate?: number;
}

/** One `/cli/v1/call` request body, as specs assert it. */
export interface RecordedOp {
  op: string;
  args: unknown;
}

/** A gateway answer: HTTP status plus the JSON body it would send. */
export interface CallResult {
  status: number;
  body: unknown;
}

export interface FakeGoals {
  call(op: string | undefined, args: unknown, userId: string): CallResult;
  seedGoal(fields: SeedGoalFields): string;
  seedInitiative(fields: SeedInitiativeFields): string;
  /** Rows of the current user's goals, as `goal.list` would project them. */
  goals(): readonly CliGoalRow[];
}

export interface FakeGoalsOptions {
  /** The harness clock, used for completion timestamps. */
  now: () => number;
  /** The backend's current user id at call time. */
  currentUserId: () => string;
}

interface StoredGoal {
  id: string;
  userId: string;
  scope: CliScope;
  title: string;
  details?: string;
  isComplete: boolean;
  completedAt?: number;
  year: number;
  quarter?: number;
  week?: number;
  dayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  parentId?: string;
  initiativeId?: string;
  domainId?: string;
  domainName?: string;
  dueDate?: number;
}

interface StoredInitiative extends CliInitiative {
  userId: string;
}

const DEFAULT_LIMIT = 200;

function ok<T>(data: T): CallResult {
  return { status: 200, body: { ok: true, data } };
}

function invalid(message: string): CallResult {
  return { status: 400, body: { ok: false, error: { code: 'invalid_argument', message } } };
}

function notFound(): CallResult {
  return { status: 404, body: { ok: false, error: { code: 'not_found', message: 'Not found' } } };
}

/** Drops undefined keys, mirroring the gateway's `compact`. */
function compact<T>(input: T): T {
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>).filter(([, value]) => value !== undefined)
  ) as T;
}

/** Weeks of a quarter: the ISO weeks whose Thursday falls inside it (matches the backend). */
function quarterWeeks(year: number, quarter: number): number[] {
  const weeks: number[] = [];
  const end = new Date(year, quarter * 3, 0, 12);
  for (const day = new Date(year, (quarter - 1) * 3, 1, 12); day <= end;) {
    if (day.getDay() === 4) weeks.push(isoWeekOf(day.getTime()).week);
    day.setDate(day.getDate() + 1);
  }
  return weeks;
}

function boundList<T>(rows: T[], limit?: number): CliList<T> {
  const max = limit ?? DEFAULT_LIMIT;
  return { items: rows.slice(0, max), truncated: rows.length > max };
}

function toRow(goal: StoredGoal): CliGoalRow {
  return compact<CliGoalRow>({
    id: goal.id,
    scope: goal.scope,
    title: goal.title,
    details: goal.details,
    isComplete: goal.isComplete,
    completedAt: goal.completedAt,
    year: goal.year,
    quarter: goal.scope === 'adhoc' ? undefined : goal.quarter,
    week: goal.week,
    dayOfWeek: goal.dayOfWeek,
    parentId: goal.parentId,
    initiativeId: goal.initiativeId,
    domainId: goal.domainId,
    domainName: goal.domainName,
  });
}

/** True when the id is an owned goal of one scope. */
function isScope(goal: StoredGoal | undefined, scope: CliScope): goal is StoredGoal {
  return goal !== undefined && goal.scope === scope;
}

export function createFakeGoals(options: FakeGoalsOptions): FakeGoals {
  const goalsByUser = new Map<string, StoredGoal[]>();
  const initiativesByUser = new Map<string, StoredInitiative[]>();
  let goalCount = 0;
  let initiativeCount = 0;

  function goalsOf(userId: string): StoredGoal[] {
    const existing = goalsByUser.get(userId);
    if (existing !== undefined) return existing;
    const created: StoredGoal[] = [];
    goalsByUser.set(userId, created);
    return created;
  }

  function initiativesOf(userId: string): StoredInitiative[] {
    const existing = initiativesByUser.get(userId);
    if (existing !== undefined) return existing;
    const created: StoredInitiative[] = [];
    initiativesByUser.set(userId, created);
    return created;
  }

  function ownedGoal(userId: string, id: string | undefined): StoredGoal | undefined {
    if (id === undefined) return undefined;
    return goalsOf(userId).find((goal) => goal.id === id);
  }

  function ownedInitiative(userId: string, id: string): StoredInitiative | undefined {
    return initiativesOf(userId).find((initiative) => initiative.id === id);
  }

  function addGoal(fields: SeedGoalFields, userId: string): string {
    goalCount += 1;
    const id = `goal_${goalCount}`;
    goalsOf(userId).push({ ...fields, id, userId, isComplete: fields.isComplete ?? false });
    return id;
  }

  function descendants(userId: string, id: string): StoredGoal[] {
    const found: StoredGoal[] = [];
    const queue = goalsOf(userId).filter((goal) => goal.parentId === id);
    while (queue.length > 0) {
      const [goal] = queue.splice(0, 1);
      if (goal === undefined) break;
      found.push(goal);
      queue.push(...goalsOf(userId).filter((child) => child.parentId === goal.id));
    }
    return found;
  }

  /** Resolves an optional foreign/missing id, 404 like the gateway guard. */
  function missingReference(userId: string, args: CliGoalCreateArgs): boolean {
    if (
      args.initiativeId !== undefined &&
      ownedInitiative(userId, args.initiativeId) === undefined
    ) {
      return true;
    }
    return (
      args.domainId !== undefined &&
      !goalsOf(userId).some((goal) => goal.domainId === args.domainId)
    );
  }

  /** `goal.list` per-scope rules, mirroring `goalRead.ts`. */
  function listViolation(args: CliGoalListArgs): string | undefined {
    if (args.scope === 'quarterly') {
      if (args.quarter === undefined) return 'quarter is required for quarterly goals';
      if (args.week !== undefined) return 'week is not supported for quarterly goals';
      return undefined;
    }
    if (args.scope === 'adhoc') {
      return args.quarter === undefined ? undefined : 'quarter is not supported for adhoc goals';
    }
    return args.quarter === undefined || args.week === undefined
      ? 'quarter and week are required for weekly and daily goals'
      : undefined;
  }

  function matchesList(goal: StoredGoal, args: CliGoalListArgs): boolean {
    if (goal.scope !== args.scope || goal.year !== args.year) return false;
    if (args.scope === 'adhoc') return args.week === undefined || goal.week === args.week;
    return goal.quarter === args.quarter;
  }

  function list(userId: string, args: CliGoalListArgs): CallResult {
    const violation = listViolation(args);
    if (violation !== undefined) return invalid(violation);
    if (
      args.initiativeId !== undefined &&
      ownedInitiative(userId, args.initiativeId) === undefined
    ) {
      return notFound();
    }
    const rows = goalsOf(userId)
      .filter((goal) => matchesList(goal, args))
      .filter((goal) => args.initiativeId === undefined || goal.initiativeId === args.initiativeId)
      .map(toRow);
    return ok(boundList(rows, args.limit));
  }

  function detail(userId: string, id: string): CallResult {
    const goal = ownedGoal(userId, id);
    if (goal === undefined) return notFound();
    const parent = ownedGoal(userId, goal.parentId);
    return ok(
      compact<CliGoalDetail>({
        ...toRow(goal),
        parentTitle: parent?.title,
        dueDate: goal.dueDate,
        children: goalsOf(userId)
          .filter((child) => child.parentId === goal.id)
          .map((child) => ({ id: child.id, title: child.title, isComplete: child.isComplete })),
      })
    );
  }

  /** Period of a weekly/daily child, taken from its parent and checked against the args. */
  function childPeriod(
    userId: string,
    args: CliGoalCreateArgs,
    parentScope: CliScope
  ): { parent: StoredGoal } | CallResult {
    const parent = ownedGoal(userId, args.parentId);
    if (!isScope(parent, parentScope)) return invalid(`parent must be a ${parentScope} goal`);
    if (args.year !== undefined && args.year !== parent.year) {
      return invalid('year/quarter do not match the parent goal');
    }
    if (args.quarter !== undefined && args.quarter !== parent.quarter) {
      return invalid('year/quarter do not match the parent goal');
    }
    return { parent };
  }

  function createQuarterly(userId: string, args: CliGoalCreateArgs): CallResult {
    if (args.parentId !== undefined)
      return invalid('parentId is not supported for quarterly goals');
    if (args.dayOfWeek !== undefined)
      return invalid('dayOfWeek is not supported for quarterly goals');
    if (args.domainId !== undefined)
      return invalid('domainId is not supported for quarterly goals');
    if (args.year === undefined || args.quarter === undefined) {
      return invalid('year and quarter are required for quarterly goals');
    }
    if (args.week !== undefined && !quarterWeeks(args.year, args.quarter).includes(args.week)) {
      return invalid('week is outside the quarter');
    }
    if (missingReference(userId, args)) return notFound();
    const id = addGoal(
      {
        scope: 'quarterly',
        title: args.title.trim(),
        year: args.year,
        quarter: args.quarter,
        ...(args.details === undefined ? {} : { details: args.details }),
        ...(args.initiativeId === undefined ? {} : { initiativeId: args.initiativeId }),
      },
      userId
    );
    return ok({ id });
  }

  function createWeekly(userId: string, args: CliGoalCreateArgs): CallResult {
    if (args.dayOfWeek !== undefined) return invalid('dayOfWeek is not supported for weekly goals');
    if (args.domainId !== undefined) return invalid('domainId is not supported for weekly goals');
    if (args.parentId === undefined) return invalid('parentId is required for weekly goals');
    if (args.week === undefined) return invalid('week is required for weekly goals');
    const parent = childPeriod(userId, args, 'quarterly');
    if ('status' in parent) return parent;
    if (!quarterWeeks(parent.parent.year, parent.parent.quarter ?? 0).includes(args.week)) {
      return invalid('week is outside the quarter');
    }
    if (missingReference(userId, args)) return notFound();
    const id = addGoal(
      {
        scope: 'weekly',
        title: args.title.trim(),
        year: parent.parent.year,
        ...(parent.parent.quarter === undefined ? {} : { quarter: parent.parent.quarter }),
        week: args.week,
        parentId: parent.parent.id,
        ...(args.details === undefined ? {} : { details: args.details }),
        ...(args.initiativeId === undefined ? {} : { initiativeId: args.initiativeId }),
      },
      userId
    );
    return ok({ id });
  }

  function createDaily(userId: string, args: CliGoalCreateArgs): CallResult {
    if (args.domainId !== undefined) return invalid('domainId is not supported for daily goals');
    if (args.parentId === undefined) return invalid('parentId is required for daily goals');
    if (args.week === undefined) return invalid('week is required for daily goals');
    if (args.dayOfWeek === undefined) return invalid('dayOfWeek is required for daily goals');
    const parent = childPeriod(userId, args, 'weekly');
    if ('status' in parent) return parent;
    if (!quarterWeeks(parent.parent.year, parent.parent.quarter ?? 0).includes(args.week)) {
      return invalid('week is outside the quarter');
    }
    if (missingReference(userId, args)) return notFound();
    const id = addGoal(
      {
        scope: 'daily',
        title: args.title.trim(),
        year: parent.parent.year,
        ...(parent.parent.quarter === undefined ? {} : { quarter: parent.parent.quarter }),
        week: args.week,
        parentId: parent.parent.id,
        dayOfWeek: args.dayOfWeek,
        ...(args.details === undefined ? {} : { details: args.details }),
        ...(args.initiativeId === undefined ? {} : { initiativeId: args.initiativeId }),
      },
      userId
    );
    return ok({ id });
  }

  function createAdhoc(userId: string, args: CliGoalCreateArgs): CallResult {
    if (args.quarter !== undefined) return invalid('quarter is not supported for adhoc goals');
    if (args.dayOfWeek !== undefined) return invalid('dayOfWeek is not supported for adhoc goals');
    if (args.year === undefined) return invalid('year is required for adhoc goals');
    if (args.week === undefined) return invalid('week is required for adhoc goals');
    if (args.parentId !== undefined && !isScope(ownedGoal(userId, args.parentId), 'adhoc')) {
      return invalid('parent must be an adhoc goal');
    }
    if (missingReference(userId, args)) return notFound();
    const id = addGoal(
      {
        scope: 'adhoc',
        title: args.title.trim(),
        year: args.year,
        week: args.week,
        ...(args.parentId === undefined ? {} : { parentId: args.parentId }),
        ...(args.details === undefined ? {} : { details: args.details }),
        ...(args.domainId === undefined ? {} : { domainId: args.domainId }),
        ...(args.initiativeId === undefined ? {} : { initiativeId: args.initiativeId }),
      },
      userId
    );
    return ok({ id });
  }

  function create(userId: string, args: CliGoalCreateArgs): CallResult {
    if (args.scope === 'quarterly') return createQuarterly(userId, args);
    if (args.scope === 'weekly') return createWeekly(userId, args);
    if (args.scope === 'daily') return createDaily(userId, args);
    return createAdhoc(userId, args);
  }

  function setComplete(
    userId: string,
    args: {
      id: string;
      isComplete: boolean;
      week?: number;
      includeChildren?: boolean;
    }
  ): CallResult {
    const goal = ownedGoal(userId, args.id);
    if (goal === undefined) return notFound();
    if (goal.scope !== 'adhoc') {
      if (args.week === undefined && goal.scope !== 'quarterly') {
        return invalid('week is required for weekly and daily goals');
      }
      const weeks = quarterWeeks(goal.year, goal.quarter ?? 0);
      const week = args.week ?? weeks[0];
      if (week === undefined || !weeks.includes(week)) {
        return invalid('week is outside the quarter');
      }
    }
    const targets =
      args.includeChildren === true ? [goal, ...descendants(userId, goal.id)] : [goal];
    for (const target of targets) {
      target.isComplete = args.isComplete;
      if (args.isComplete) target.completedAt = options.now();
      else delete target.completedAt;
    }
    return ok({ id: goal.id, isComplete: goal.isComplete });
  }

  function rename(userId: string, id: string, title: string): CallResult {
    const goal = ownedGoal(userId, id);
    if (goal === undefined) return notFound();
    goal.title = title.trim();
    return ok({ id: goal.id });
  }

  function remove(userId: string, id: string): CallResult {
    const goal = ownedGoal(userId, id);
    if (goal === undefined) return notFound();
    const doomed = new Set([goal.id, ...descendants(userId, goal.id).map((child) => child.id)]);
    goalsByUser.set(
      userId,
      goalsOf(userId).filter((candidate) => !doomed.has(candidate.id))
    );
    return ok({ id: goal.id });
  }

  function initiativeDto(initiative: StoredInitiative): CliInitiative {
    return compact<CliInitiative>({
      id: initiative.id,
      title: initiative.title,
      description: initiative.description,
      startDate: initiative.startDate,
      endDate: initiative.endDate,
    });
  }

  function listInitiatives(userId: string, args: { limit?: number }): CallResult {
    const rows = initiativesOf(userId).map(initiativeDto);
    return ok(boundList(rows, args.limit));
  }

  function getInitiative(userId: string, id: string): CallResult {
    const initiative = ownedInitiative(userId, id);
    if (initiative === undefined) return notFound();
    const order: CliScope[] = ['quarterly', 'weekly', 'daily', 'adhoc'];
    const rows = order.flatMap((scope) =>
      goalsOf(userId)
        .filter((goal) => goal.initiativeId === id && goal.scope === scope)
        .map(toRow)
    );
    return ok({
      initiative: initiativeDto(initiative),
      goals: boundList(rows),
    });
  }

  function call(op: string | undefined, args: unknown, userId: string): CallResult {
    if (op === 'goal.list') return list(userId, args as CliGoalListArgs);
    if (op === 'goal.get') return detail(userId, (args as { id?: string }).id ?? '');
    if (op === 'goal.create') return create(userId, args as CliGoalCreateArgs);
    if (op === 'goal.rename') {
      const renameArgs = args as { id: string; title: string };
      return rename(userId, renameArgs.id, renameArgs.title);
    }
    if (op === 'goal.setComplete') {
      return setComplete(
        userId,
        args as { id: string; isComplete: boolean; week?: number; includeChildren?: boolean }
      );
    }
    if (op === 'goal.delete') return remove(userId, (args as { id: string }).id);
    if (op === 'initiative.list') return listInitiatives(userId, args as { limit?: number });
    if (op === 'initiative.get') return getInitiative(userId, (args as { id: string }).id);
    return invalid('Unknown operation');
  }

  return {
    call,
    seedGoal: (fields) => addGoal(fields, fields.ownerUserId ?? options.currentUserId()),
    seedInitiative: (fields) => {
      initiativeCount += 1;
      const id = `init_${initiativeCount}`;
      initiativesOf(fields.ownerUserId ?? options.currentUserId()).push({
        id,
        title: fields.title,
        startDate: fields.startDate,
        ...(fields.description === undefined ? {} : { description: fields.description }),
        ...(fields.endDate === undefined ? {} : { endDate: fields.endDate }),
        userId: fields.ownerUserId ?? options.currentUserId(),
      });
      return id;
    },
    goals: () => goalsOf(options.currentUserId()).map(toRow),
  };
}
