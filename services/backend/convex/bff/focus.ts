import { v } from 'convex/values';
import { SessionIdArg } from 'convex-helpers/server/sessions';

import { getWeekGoalsTree } from '../../src/usecase/getWeekDetails';
import { requireLogin } from '../../src/usecase/requireLogin';
import type { Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { query } from '../_generated/server';

export type BreadcrumbSegment = {
  label: string;
  type: 'quarter' | 'parent' | 'grandparent' | 'domain';
};

export type FocusedGoalItem = {
  _id: Id<'goals'>;
  title: string;
  isComplete: boolean;
  isAdhoc: boolean;
  year: number;
  quarter: number;
  weekNumber?: number;
  depth: number;
  indentLevel: number;
  breadcrumb: BreadcrumbSegment[];
};

export type FocusedViewData = {
  urgent: FocusedGoalItem[];
  weeklyGoals: FocusedGoalItem[];
  dailyGoals: FocusedGoalItem[];
  adhocTasks: FocusedGoalItem[];
};

export const getFocusedViewData = query({
  args: {
    ...SessionIdArg,
    year: v.number(),
    quarter: v.number(),
    weekNumber: v.number(),
    dayOfWeek: v.number(),
  },
  handler: async (ctx, args): Promise<FocusedViewData> => {
    const { sessionId, year, quarter, weekNumber, dayOfWeek } = args;
    const user = await requireLogin(ctx, sessionId);
    const userId = user._id;

    const [urgent, weeklyGoals, dailyGoals, adhocTasks] = await Promise.all([
      getUrgentGoals(ctx, { userId, year, quarter, weekNumber, dayOfWeek }),
      getWeeklyGoals(ctx, { userId, year, quarter, weekNumber }),
      getDailyGoalsForDay(ctx, { userId, year, quarter, weekNumber, dayOfWeek }),
      getAdhocTasksFlattened(ctx, { userId, year, weekNumber }),
    ]);

    return { urgent, weeklyGoals, dailyGoals, adhocTasks };
  },
});

// ── Urgent Goals ──────────────────────────────────────────────────────────────

async function getUrgentGoals(
  ctx: QueryCtx,
  args: {
    userId: Id<'users'>;
    year: number;
    quarter: number;
    weekNumber: number;
    dayOfWeek: number;
  }
): Promise<FocusedGoalItem[]> {
  const { userId, year, quarter, weekNumber, dayOfWeek } = args;

  const fireGoals = await ctx.db
    .query('fireGoals')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();

  if (fireGoals.length === 0) return [];

  const goalDocs = await Promise.all(fireGoals.map(async (fg) => ctx.db.get('goals', fg.goalId)));

  let filtered = goalDocs
    .filter((g) => g !== null)
    .filter((g) => {
      if (g.adhoc) {
        return g.year === year && g.adhoc.weekNumber === weekNumber;
      }
      return g.year === year && g.quarter === quarter;
    })
    .filter((g) => g.depth !== 0 || g.adhoc)
    .filter((g) => !g.isBacklog); // Exclude backlog goals from urgent section

  // For daily goals, filter by day of week
  const dailyGoals = filtered.filter((g) => g.depth === 2 && !g.adhoc);
  const dailyGoalStates = await Promise.all(
    dailyGoals.map(async (g) => {
      const state = await ctx.db
        .query('goalStateByWeek')
        .withIndex('by_user_and_goal_and_year_and_quarter_and_week', (q) =>
          q
            .eq('userId', userId)
            .eq('goalId', g._id)
            .eq('year', year)
            .eq('quarter', quarter)
            .eq('weekNumber', weekNumber)
        )
        .first();
      return { goalId: g._id, dayOfWeek: state?.daily?.dayOfWeek ?? null };
    })
  );

  const dailyGoalDayMap = new Map(dailyGoalStates.map((s) => [s.goalId.toString(), s.dayOfWeek]));

  filtered = filtered.filter((g) => {
    if (g.depth === 2 && !g.adhoc) {
      return dailyGoalDayMap.get(g._id.toString()) === dayOfWeek;
    }
    return true;
  });

  return Promise.all(
    filtered.map(async (g) => {
      const breadcrumb = await resolveGoalBreadcrumb(ctx, g, { year, quarter });
      return {
        _id: g._id,
        title: g.title,
        isComplete: g.isComplete ?? false,
        isAdhoc: Boolean(g.adhoc),
        year: g.year,
        quarter: g.quarter,
        weekNumber: g.adhoc?.weekNumber ?? weekNumber,
        depth: g.depth,
        indentLevel: 0,
        breadcrumb,
      };
    })
  );
}

// ── Weekly Goals ──────────────────────────────────────────────────────────────

async function getWeeklyGoals(
  ctx: QueryCtx,
  args: {
    userId: Id<'users'>;
    year: number;
    quarter: number;
    weekNumber: number;
  }
): Promise<FocusedGoalItem[]> {
  const { userId, year, quarter, weekNumber } = args;

  const weekTree = await getWeekGoalsTree(ctx, { userId, year, quarter, weekNumber });

  const result: FocusedGoalItem[] = [];

  for (const qGoal of weekTree.quarterlyGoals) {
    if (!qGoal.state?.isStarred && !qGoal.state?.isPinned) continue;

    for (const wGoal of qGoal.children) {
      result.push({
        _id: wGoal._id,
        title: wGoal.title,
        isComplete: wGoal.isComplete ?? false,
        isAdhoc: false,
        year,
        quarter,
        weekNumber,
        depth: wGoal.depth,
        indentLevel: 0,
        breadcrumb: [
          { label: `Q${quarter} ${year}`, type: 'quarter' },
          { label: qGoal.title, type: 'parent' },
        ],
      });
    }
  }

  return result;
}

// ── Daily Goals ───────────────────────────────────────────────────────────────

async function getDailyGoalsForDay(
  ctx: QueryCtx,
  args: {
    userId: Id<'users'>;
    year: number;
    quarter: number;
    weekNumber: number;
    dayOfWeek: number;
  }
): Promise<FocusedGoalItem[]> {
  const { userId, year, quarter, weekNumber, dayOfWeek } = args;

  const weekTree = await getWeekGoalsTree(ctx, { userId, year, quarter, weekNumber });

  const result: FocusedGoalItem[] = [];

  for (const qGoal of weekTree.quarterlyGoals) {
    for (const wGoal of qGoal.children) {
      for (const dGoal of wGoal.children) {
        if (dGoal.state?.daily?.dayOfWeek === dayOfWeek) {
          result.push({
            _id: dGoal._id,
            title: dGoal.title,
            isComplete: dGoal.isComplete ?? false,
            isAdhoc: false,
            year,
            quarter,
            weekNumber,
            depth: dGoal.depth,
            indentLevel: 0,
            breadcrumb: [
              { label: `Q${quarter} ${year}`, type: 'quarter' },
              { label: qGoal.title, type: 'grandparent' },
              { label: wGoal.title, type: 'parent' },
            ],
          });
        }
      }
    }
  }

  return result;
}

// ── Adhoc Tasks ───────────────────────────────────────────────────────────────

type AdhocNode = {
  _id: Id<'goals'>;
  title: string;
  isComplete: boolean;
  year: number;
  quarter: number;
  depth: number;
  parentId?: Id<'goals'>;
  adhoc?: { weekNumber?: number };
  domainName?: string;
  children: AdhocNode[];
};

async function getAdhocTasksFlattened(
  ctx: QueryCtx,
  args: {
    userId: Id<'users'>;
    year: number;
    weekNumber: number;
  }
): Promise<FocusedGoalItem[]> {
  const { userId, year, weekNumber } = args;

  const allAdhocGoals = await ctx.db
    .query('goals')
    .withIndex('by_user_and_adhoc_year_week', (q) =>
      q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNumber)
    )
    .collect();

  // Filter out backlog goals — they should not appear in the focused view
  const adhocGoals = allAdhocGoals.filter((g) => !g.isBacklog);

  // Resolve domains
  const domainIds = [
    ...new Set(
      adhocGoals.map((g) => g.domainId).filter((id): id is Id<'domains'> => id !== undefined)
    ),
  ];
  const domainDocs = await Promise.all(domainIds.map((id) => ctx.db.get('domains', id)));
  const domainMap = new Map(domainDocs.filter((d) => d !== null).map((d) => [d._id, d.name]));

  // Build hierarchy
  const goalMap = new Map<string, AdhocNode>();
  const rootGoals: AdhocNode[] = [];

  for (const goal of adhocGoals) {
    goalMap.set(goal._id, {
      _id: goal._id,
      title: goal.title,
      isComplete: goal.isComplete ?? false,
      year: goal.year,
      quarter: goal.quarter,
      depth: goal.depth,
      parentId: goal.parentId,
      adhoc: goal.adhoc,
      domainName: goal.domainId ? domainMap.get(goal.domainId) : undefined,
      children: [],
    });
  }

  for (const goal of goalMap.values()) {
    if (goal.parentId && goalMap.has(goal.parentId)) {
      goalMap.get(goal.parentId)!.children.push(goal);
    } else {
      rootGoals.push(goal);
    }
  }

  // Flatten with indent levels
  const result: FocusedGoalItem[] = [];

  function flattenNode(node: AdhocNode, indentLevel: number, parentTitle?: string) {
    const breadcrumb: BreadcrumbSegment[] = [];
    if (node.domainName) {
      breadcrumb.push({ label: node.domainName, type: 'domain' });
    }
    if (parentTitle) {
      breadcrumb.push({ label: parentTitle, type: 'parent' });
    }

    result.push({
      _id: node._id,
      title: node.title,
      isComplete: node.isComplete,
      isAdhoc: true,
      year: node.year,
      quarter: node.quarter,
      weekNumber: node.adhoc?.weekNumber,
      depth: node.depth,
      indentLevel,
      breadcrumb,
    });

    for (const child of node.children) {
      flattenNode(child, indentLevel + 1, node.title);
    }
  }

  for (const root of rootGoals) {
    flattenNode(root, 0);
  }

  return result;
}

// ── Breadcrumb Resolution ─────────────────────────────────────────────────────

async function resolveGoalBreadcrumb(
  ctx: QueryCtx,
  goal: {
    _id: Id<'goals'>;
    depth: number;
    parentId?: Id<'goals'>;
    adhoc?: unknown;
    domainId?: Id<'domains'>;
  },
  opts: { year: number; quarter: number }
): Promise<BreadcrumbSegment[]> {
  const segments: BreadcrumbSegment[] = [];
  const isAdhoc = !!goal.adhoc || !!goal.domainId;

  if (isAdhoc) {
    if (goal.domainId) {
      const domain = await ctx.db.get('domains', goal.domainId);
      if (domain) {
        segments.push({ label: domain.name, type: 'domain' });
      }
    }
    if (goal.parentId) {
      const parent = await ctx.db.get('goals', goal.parentId);
      if (parent) {
        segments.push({ label: parent.title, type: 'parent' });
      }
    }
  } else {
    segments.push({ label: `Q${opts.quarter} ${opts.year}`, type: 'quarter' });

    if (goal.depth === 1 && goal.parentId) {
      const parent = await ctx.db.get('goals', goal.parentId);
      if (parent) {
        segments.push({ label: parent.title, type: 'parent' });
      }
    }

    if (goal.depth === 2 && goal.parentId) {
      const parent = await ctx.db.get('goals', goal.parentId);
      if (parent) {
        if (parent.parentId) {
          const grandParent = await ctx.db.get('goals', parent.parentId);
          if (grandParent) {
            segments.push({ label: grandParent.title, type: 'grandparent' });
          }
        }
        segments.push({ label: parent.title, type: 'parent' });
      }
    }
  }

  return segments;
}
