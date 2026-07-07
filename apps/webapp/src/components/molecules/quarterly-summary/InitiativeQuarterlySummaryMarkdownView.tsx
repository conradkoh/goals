import type { InitiativeQuarterSummary } from '@workspace/backend/src/usecase/getWeekDetails';
import React from 'react';

import { QuarterlySummaryMarkdownExportView } from './QuarterlySummaryMarkdownExportView';

import { generateInitiativeQuarterSummaryMarkdown } from '@/lib/markdown/initiativeQuarterlyMarkdown';

interface InitiativeQuarterlySummaryMarkdownViewProps {
  summaryData: InitiativeQuarterSummary;
  className?: string;
}

export function InitiativeQuarterlySummaryMarkdownView({
  summaryData,
  className,
}: InitiativeQuarterlySummaryMarkdownViewProps) {
  const allGoalsMarkdown = React.useMemo(() => {
    return generateInitiativeQuarterSummaryMarkdown(summaryData, { omitIncomplete: false });
  }, [summaryData]);

  const completedGoalsMarkdown = React.useMemo(() => {
    return generateInitiativeQuarterSummaryMarkdown(summaryData, { omitIncomplete: true });
  }, [summaryData]);

  return (
    <QuarterlySummaryMarkdownExportView
      title="Initiative Markdown Export"
      allTabLabel="All Work"
      allGoalsMarkdown={allGoalsMarkdown}
      completedGoalsMarkdown={completedGoalsMarkdown}
      allDownloadFilename={`Q${summaryData.quarter}-${summaryData.year}-initiative-summary.md`}
      completedDownloadFilename={`Q${summaryData.quarter}-${summaryData.year}-initiative-completed-summary.md`}
      className={className}
    />
  );
}
