/** A single goal log entry: an epoch-ms timestamp plus its HTML content. */
export interface MarkdownGoalLog {
  logDate: number;
  content: string;
}

/** A daily goal as rendered in quarterly markdown. */
export interface MarkdownDailyGoal {
  title: string;
  details?: string;
  isComplete: boolean;
  logs?: MarkdownGoalLog[];
}

/** A weekly goal as rendered in quarterly markdown. */
export interface MarkdownWeeklyGoal extends MarkdownDailyGoal {
  children?: MarkdownDailyGoal[];
}

/** An adhoc goal as rendered in quarterly markdown; the week number groups it in the output. */
export interface MarkdownAdhocGoal extends MarkdownDailyGoal {
  adhoc?: { weekNumber: number };
}

/** One quarterly goal with its weekly goals grouped by week number. */
export interface MarkdownQuarterlyGoalSummary {
  quarterlyGoal: {
    title: string;
    details?: string;
    isComplete: boolean;
    completedAt?: number;
    logs?: MarkdownGoalLog[];
  };
  weeklyGoalsByWeek: Record<number, MarkdownWeeklyGoal[]>;
  quarter: number;
  year: number;
  weekRange: { startWeek: number; endWeek: number };
}

/** All quarterly goals (and optional adhoc goals) for a single quarter. */
export interface MarkdownQuarterSummary {
  quarterlyGoals: MarkdownQuarterlyGoalSummary[];
  adhocGoals?: MarkdownAdhocGoal[];
  year: number;
  quarter: number;
  weekRange: { startWeek: number; endWeek: number };
}

/** Options shared by every quarterly markdown generator. */
export interface QuarterlySummaryMarkdownOptions {
  omitIncomplete?: boolean;
  /** epoch ms for the "Generated on" footer; default Date.now() */
  now?: number;
  /** IANA zone for all date rendering; default = system zone (webapp behavior unchanged) */
  timeZone?: string;
}
