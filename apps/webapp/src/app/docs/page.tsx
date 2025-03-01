import { Metadata } from 'next';
import Link from 'next/link';
import { Download, BookText, ArrowRight, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DocHeader,
  DocCard,
  DocList,
  DocListItem,
} from './components/primitives';

export const metadata: Metadata = {
  title: 'Goals App Documentation',
  description: 'Documentation for the Goals App',
};

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <DocHeader
        icon={<BookText className="h-4 w-4" />}
        badge="Documentation"
        title="Goals App Documentation"
        description="Welcome to the Goals App documentation. Here you'll find comprehensive guides and resources to help you get the most out of the app."
        badgeColor="blue"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <DocCard
          title="Installation Guide"
          description="Learn how to install and set up the Goals App"
          icon={<Download className="h-5 w-5" />}
          href="/docs/installation"
          variant="blue"
        >
          <p className="text-sm text-slate-600">
            Get started with the Goals App installation process for macOS with
            Safari and Raycast integration.
          </p>
          <DocList>
            <DocListItem variant="blue">
              Safari installation as a Progressive Web App
            </DocListItem>
            <DocListItem variant="blue">
              System requirements for optimal performance
            </DocListItem>
            <DocListItem variant="blue">
              Raycast integration for quick access
            </DocListItem>
          </DocList>
        </DocCard>

        <DocCard
          title="Getting Started"
          description="Learn how to use the Goals App effectively"
          icon={<PlayCircle className="h-5 w-5" />}
          href="/docs/terminology"
          variant="indigo"
        >
          <p className="text-sm text-slate-600">
            Understand how to use the Goals App effectively with quarterly,
            weekly, and daily planning to achieve your objectives.
          </p>
          <DocList>
            <DocListItem variant="indigo">
              Setting effective quarterly goals
            </DocListItem>
            <DocListItem variant="indigo">
              Managing weekly objectives and tracking progress
            </DocListItem>
            <DocListItem variant="indigo">
              Organizing daily tasks for maximum productivity
            </DocListItem>
          </DocList>
        </DocCard>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">
              Need more help?
            </h3>
            <p className="text-sm text-slate-600">
              If you have any questions or need assistance, check out our
              support resources.
            </p>
          </div>
          <Button
            asChild
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
