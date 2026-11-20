import { Badge } from '@/components/ui/badge';

/**
 * Renders the CLI-reported environment as a plain-text badge.
 *
 * `environment` is an untrusted CLI string: it is rendered as text only, and long values are
 * truncated with a title tooltip so they cannot distort the layout.
 */
export function CliEnvironmentBadge({ environment }: { environment?: string }) {
  if (!environment) return <Badge variant="outline">Not reported</Badge>;
  if (environment === 'production') return <Badge>production</Badge>;
  return (
    <Badge variant="secondary" className="max-w-40 truncate" title={environment}>
      {environment}
    </Badge>
  );
}
