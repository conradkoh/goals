import { ArrowRight, BookText, Download, HelpCircle, Keyboard, PlayCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DocCard, DocHeader, DocList, DocListItem } from './components/primitives';

export const metadata: Metadata = {
  title: 'Goals Documentation',
  description: 'Documentation for Goals',
};

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <DocHeader
        icon={<BookText className="h-4 w-4" />}
        badge="Documentation"
        title="Goals Documentation"
        description="Welcome to the Goals documentation. Here you'll find comprehensive guides and resources to help you get the most out of the app."
        badgeColor="blue"
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <DocCard
          title="Installation Guide"
          description="Learn how to install and set up Goals"
          icon={<Download className="h-5 w-5" />}
          href="/docs/installation"
          variant="blue"
        >
          <p className="text-sm text-slate-600 mb-4">
            Get started with the Goals installation process for macOS with Safari and Raycast
            integration.
          </p>
          <DocList>
            <DocListItem variant="blue">Safari installation as a Progressive Web App</DocListItem>
            <DocListItem variant="blue">System requirements for optimal performance</DocListItem>
            <DocListItem variant="blue">Raycast integration for quick access</DocListItem>
          </DocList>
        </DocCard>

        <DocCard
          title="Getting Started"
          description="Learn how to use Goals effectively"
          icon={<PlayCircle className="h-5 w-5" />}
          href="/docs/terminology"
          variant="indigo"
        >
          <p className="text-sm text-slate-600 mb-4">
            Understand how to use Goals effectively with quarterly, weekly, and daily planning to
            achieve your objectives.
          </p>
          <DocList>
            <DocListItem variant="indigo">Setting effective quarterly goals</DocListItem>
            <DocListItem variant="indigo">
              Managing weekly objectives and tracking progress
            </DocListItem>
            <DocListItem variant="indigo">
              Organizing daily tasks for maximum productivity
            </DocListItem>
          </DocList>
        </DocCard>

        <DocCard
          title="Keyboard Shortcuts"
          description="Work more efficiently with keyboard shortcuts"
          icon={<Keyboard className="h-5 w-5" />}
          href="/docs/keyboard-shortcuts"
          variant="blue"
        >
          <p className="text-sm text-slate-600 mb-4">
            Master Goals with keyboard shortcuts to navigate and perform actions quickly without
            using the mouse.
          </p>
          <DocList>
            <DocListItem variant="blue">
              View switching between daily, weekly, and quarterly views
            </DocListItem>
            <DocListItem variant="blue">Global navigation shortcuts</DocListItem>
            <DocListItem variant="blue">Form and text editing shortcuts</DocListItem>
          </DocList>
        </DocCard>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">Need more help?</h3>
              <p className="text-sm text-slate-600">
                If you have any questions or need assistance, check out our support resources.
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 font-medium whitespace-nowrap"
          >
            <Link href="/app" className="flex items-center gap-1.5">
              Go to Dashboard
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
