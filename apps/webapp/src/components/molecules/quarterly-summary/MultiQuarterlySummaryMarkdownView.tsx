import type { MultipleQuarterlyGoalsSummary } from '@workspace/backend/src/usecase/getWeekDetails';
import React from 'react';

import { QuarterlySummaryMarkdownExportView } from './QuarterlySummaryMarkdownExportView';

import { generateMultipleQuarterlyGoalsMarkdown } from '@/lib/markdown/quarterlyMarkdown';

interface MultiQuarterlySummaryMarkdownViewProps {
  summaryData: MultipleQuarterlyGoalsSummary;
  className?: string;
}

export function MultiQuarterlySummaryMarkdownView({
  summaryData,
  className,
}: MultiQuarterlySummaryMarkdownViewProps) {
  const allGoalsMarkdown = React.useMemo(() => {
    return generateMultipleQuarterlyGoalsMarkdown(summaryData, { omitIncomplete: false });
  }, [summaryData]);

  const completedGoalsMarkdown = React.useMemo(() => {
    return generateMultipleQuarterlyGoalsMarkdown(summaryData, { omitIncomplete: true });
  }, [summaryData]);

  return (
    <QuarterlySummaryMarkdownExportView
      title="Markdown Export"
      allTabLabel="All Goals"
      allGoalsMarkdown={allGoalsMarkdown}
      completedGoalsMarkdown={completedGoalsMarkdown}
      allDownloadFilename={`Q${summaryData.quarter}-${summaryData.year}-multi-goal-summary.md`}
      completedDownloadFilename={`Q${summaryData.quarter}-${summaryData.year}-completed-goals-summary.md`}
      className={className}
    />
  );
}
