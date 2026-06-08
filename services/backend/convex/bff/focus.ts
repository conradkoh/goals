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
  isStarred?: boolean;
  isPinned?: boolean;
};

export type FocusedViewData = {
  urgent: FocusedGoalItem[];
  quarterlyGoals: FocusedGoalItem[];
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

    const [urgent, quarterlyGoals, weeklyGoals, dailyGoals, adhocTasks] = await Promise.all([
      getUrgentGoals(ctx, { userId, year, quarter, weekNumber, dayOfWeek }),
      getQuarterlyGoals(ctx, { userId, year, quarter, weekNumber }),
      getWeeklyGoals(ctx, { userId, year, quarter, weekNumber }),
      getDailyGoalsForDay(ctx, { userId, year, quarter, weekNumber, dayOfWeek }),
      getAdhocTasksFlattened(ctx, { userId, year, weekNumber }),
    ]);

    return { urgent, quarterlyGoals, weeklyGoals, dailyGoals, adhocTasks };
  },
});

// ── Quarterly Goals ───────────────────────────────────────────────────────────

async function getQuarterlyGoals(
  ctx: QueryCtx,
  args: {
    userId: Id<'users'>;
    year: number;
    quarter: number;
    weekNumber: number;
  }
): Promise<FocusedGoalItem[]> {
  const { userId, year, quarter, weekNumber } = args;

  const goals = await ctx.db
    .query('goals')
    .withIndex('by_user_and_year_and_quarter', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter)
    )
    .collect();

  const weekStates = await ctx.db
    .query('goalStateByWeek')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('weekNumber', weekNumber)
    )
    .collect();

  const stateByGoalId = new Map(weekStates.map((s) => [s.goalId.toString(), s]));

  return goals
    .filter((g) => g.depth === 0 && !g.adhoc && !g.isBacklog && !g.isComplete)
    .sort((a, b) => {
      const aState = stateByGoalId.get(a._id.toString());
      const bState = stateByGoalId.get(b._id.toString());
      const aStar = aState?.isStarred ? 1 : 0;
      const bStar = bState?.isStarred ? 1 : 0;
      if (aStar !== bStar) return bStar - aStar;
      const aPin = aState?.isPinned ? 1 : 0;
      const bPin = bState?.isPinned ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      return a._creationTime - b._creationTime;
    })
    .map((g) => {
      const state = stateByGoalId.get(g._id.toString());
      return {
        _id: g._id,
        title: g.title,
        isComplete: g.isComplete ?? false,
        isAdhoc: false,
        year: g.year,
        quarter: g.quarter,
        weekNumber: undefined,
        depth: 0,
        indentLevel: 0,
        breadcrumb: [],
        isStarred: state?.isStarred ?? false,
        isPinned: state?.isPinned ?? false,
      };
    });
}

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

  // Fetch ALL goalStateByWeek entries for the current week in a single indexed query,
  // then filter in memory. Avoids N+1 lookups when the user has many fire goals.
  const weekStates = await ctx.db
    .query('goalStateByWeek')
    .withIndex('by_user_and_year_and_quarter_and_week', (q) =>
      q.eq('userId', userId).eq('year', year).eq('quarter', quarter).eq('weekNumber', weekNumber)
    )
    .collect();

  const goalStateMap = new Map(weekStates.map((s) => [s.goalId.toString(), s]));

  // Only include non-adhoc goals that have a state for the current week
  filtered = filtered.filter((g) => {
    if (g.adhoc) return true;
    return goalStateMap.has(g._id.toString());
  });

  // For daily goals, additionally filter by day of week
  filtered = filtered.filter((g) => {
    if (g.depth === 2 && !g.adhoc) {
      return goalStateMap.get(g._id.toString())?.daily?.dayOfWeek === dayOfWeek;
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

  // Get fire goals so we can exclude them from weekly goals
  const fireGoals = await ctx.db
    .query('fireGoals')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();

  const fireGoalIds = new Set(fireGoals.map((fg) => fg.goalId.toString()));

  const weekTree = await getWeekGoalsTree(ctx, { userId, year, quarter, weekNumber });

  const result: FocusedGoalItem[] = [];

  for (const qGoal of weekTree.quarterlyGoals) {
    if (!qGoal.state?.isStarred && !qGoal.state?.isPinned) continue;

    for (const wGoal of qGoal.children) {
      // Filter out fire goals - they should only appear in the urgent section
      if (fireGoalIds.has(wGoal._id.toString())) continue;

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

  // Get fire goals so we can exclude them from daily goals
  const fireGoals = await ctx.db
    .query('fireGoals')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();

  const fireGoalIds = new Set(fireGoals.map((fg) => fg.goalId.toString()));

  const weekTree = await getWeekGoalsTree(ctx, { userId, year, quarter, weekNumber });

  const result: FocusedGoalItem[] = [];

  for (const qGoal of weekTree.quarterlyGoals) {
    for (const wGoal of qGoal.children) {
      for (const dGoal of wGoal.children) {
        // Filter out fire goals - they should only appear in the urgent section
        if (fireGoalIds.has(dGoal._id.toString())) continue;

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

  // Get fire goals so we can exclude them from adhoc tasks
  const fireGoals = await ctx.db
    .query('fireGoals')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();

  const fireGoalIds = new Set(fireGoals.map((fg) => fg.goalId.toString()));

  const allAdhocGoals = await ctx.db
    .query('goals')
    .withIndex('by_user_and_adhoc_year_week', (q) =>
      q.eq('userId', userId).eq('year', year).eq('adhoc.weekNumber', weekNumber)
    )
    .collect();

  // Filter out backlog goals — they should not appear in the focused view
  // Also filter out fire goals — urgent goals should only appear in the urgent section
  const adhocGoals = allAdhocGoals.filter(
    (g) => !g.isBacklog && !fireGoalIds.has(g._id.toString())
  );

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
