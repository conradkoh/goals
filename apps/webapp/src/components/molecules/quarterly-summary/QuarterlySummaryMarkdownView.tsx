import type { QuarterlyGoalSummary } from '@workspace/backend/src/usecase/getWeekDetails';
import { Check, Copy } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useClipboard } from '@/hooks/useClipboard';
import { generateQuarterlySummaryMarkdown } from '@/lib/markdown/quarterlyMarkdown';
import { cn } from '@/lib/utils';

interface QuarterlySummaryMarkdownViewProps {
  summaryData: QuarterlyGoalSummary;
  className?: string;
}

/**
 * Component that displays the quarterly summary in markdown format.
 * Provides a read-only view of the markdown content with copy to clipboard functionality.
 */
export function QuarterlySummaryMarkdownView({
  summaryData,
  className,
}: QuarterlySummaryMarkdownViewProps) {
  const { copyToClipboard, isCopying } = useClipboard();
  const [justCopied, setJustCopied] = React.useState(false);
  const [omitIncomplete, setOmitIncomplete] = React.useState(false);

  const markdownContent = React.useMemo(() => {
    return generateQuarterlySummaryMarkdown(summaryData, { omitIncomplete });
  }, [summaryData, omitIncomplete]);

  const handleCopy = React.useCallback(async () => {
    const success = await copyToClipboard(
      markdownContent,
      'Quarterly summary markdown copied to clipboard!'
    );

    if (success) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    }
  }, [copyToClipboard, markdownContent]);

  return (
    <Card className={cn('relative', className)}>
      {/* Header with options and copy button */}
      <div className="p-4 border-b bg-muted">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Markdown Export</h3>
            <p className="text-sm text-muted-foreground">
              Copy this markdown to share or save your quarterly summary
            </p>
          </div>

          <Button
            onClick={handleCopy}
            disabled={isCopying}
            variant={justCopied ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'transition-all duration-200',
              justCopied && 'bg-green-600 hover:bg-green-700 text-white'
            )}
          >
            {justCopied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                {isCopying ? 'Copying...' : 'Copy'}
              </>
            )}
          </Button>
        </div>

        {/* Options */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="omit-incomplete"
            checked={omitIncomplete}
            onCheckedChange={(checked) => setOmitIncomplete(checked === true)}
          />
          <label
            htmlFor="omit-incomplete"
            className="text-sm font-medium text-muted-foreground cursor-pointer"
          >
            Show only completed goals
          </label>
        </div>
      </div>

      {/* Markdown content */}
      <div className="p-4">
        <div className="relative">
          <pre className="whitespace-pre-wrap font-mono text-sm bg-muted border rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
            <code className="text-foreground">{markdownContent}</code>
          </pre>

          {/* Fade overlay at bottom when scrollable */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none rounded-b-lg" />
        </div>

        {/* Character count */}
        <div className="mt-3 text-xs text-muted-foreground text-right">
          {markdownContent.length.toLocaleString()} characters
        </div>
      </div>
    </Card>
  );
}
