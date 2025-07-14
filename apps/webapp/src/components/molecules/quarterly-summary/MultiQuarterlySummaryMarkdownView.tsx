import React from 'react';
import { MultipleQuarterlyGoalsSummary } from '@services/backend/src/usecase/getWeekDetails';
import { generateMultipleQuarterlyGoalsMarkdown } from '@/lib/markdown/quarterlyMarkdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Eye, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/hooks/useClipboard';

interface MultiQuarterlySummaryMarkdownViewProps {
  summaryData: MultipleQuarterlyGoalsSummary;
  className?: string;
}

export function MultiQuarterlySummaryMarkdownView({
  summaryData,
  className,
}: MultiQuarterlySummaryMarkdownViewProps) {
  const { copyToClipboard } = useClipboard();
  
  // Generate markdown for all goals and completed goals only
  const allGoalsMarkdown = React.useMemo(() => {
    return generateMultipleQuarterlyGoalsMarkdown(summaryData, { omitIncomplete: false });
  }, [summaryData]);
  
  const completedGoalsMarkdown = React.useMemo(() => {
    return generateMultipleQuarterlyGoalsMarkdown(summaryData, { omitIncomplete: true });
  }, [summaryData]);

  const handleCopyMarkdown = React.useCallback((markdown: string) => {
    copyToClipboard(markdown, 'Markdown copied to clipboard!');
  }, [copyToClipboard]);

  const handleDownloadMarkdown = React.useCallback((markdown: string, filename: string) => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Markdown Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                All Goals
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Completed Only
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyMarkdown(allGoalsMarkdown)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadMarkdown(
                    allGoalsMarkdown,
                    `Q${summaryData.quarter}-${summaryData.year}-multi-goal-summary.md`
                  )}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
              
              <div className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {allGoalsMarkdown}
                </pre>
              </div>
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyMarkdown(completedGoalsMarkdown)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadMarkdown(
                    completedGoalsMarkdown,
                    `Q${summaryData.quarter}-${summaryData.year}-completed-goals-summary.md`
                  )}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
              
              <div className="border rounded-lg p-4 bg-muted/30 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {completedGoalsMarkdown}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 