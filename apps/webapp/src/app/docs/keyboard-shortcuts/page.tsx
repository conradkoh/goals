import { Command, Keyboard, LayoutGrid, MousePointerClick } from 'lucide-react';
import type { Metadata } from 'next';
import { DocHeader, DocInfoCard, DocSection } from '../components/primitives';

export const metadata: Metadata = {
  title: 'Keyboard Shortcuts - Goals Documentation',
  description:
    'Learn about all the keyboard shortcuts available in Goals to boost your productivity',
};

export default function KeyboardShortcutsPage() {
  return (
    <div className="space-y-8">
      <DocHeader
        icon={<Keyboard className="h-4 w-4" />}
        badge="Keyboard Shortcuts"
        title="Keyboard Shortcuts"
        description="Master Goals with keyboard shortcuts. Learn all the shortcuts available to help you work more efficiently."
        badgeColor="slate"
      />

      <div className="grid gap-8">
        <DocSection
          title="View Navigation"
          icon={<LayoutGrid className="h-5 w-5" />}
          variant="primary"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Quickly switch between different views to focus on your goals at various levels.
            </p>

            <div className="space-y-4">
              <div className="bg-card rounded-lg p-4 border shadow-sm">
                <h3 className="font-medium text-foreground mb-2">View Switching</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  When no element is focused, use these shortcuts to switch views:
                </p>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded">Q</span>
                    <span className="text-muted-foreground">Switch to Quarterly View</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded">W</span>
                    <span className="text-muted-foreground">Switch to Weekly View</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded">D</span>
                    <span className="text-muted-foreground">Switch to Daily View</span>
                  </div>
                </div>
              </div>

              <DocInfoCard variant="default">
                <p className="flex items-start gap-2">
                  <span className="font-semibold">Note:</span>
                  <span>
                    View switching shortcuts only work when no element is focused (i.e., when
                    clicking on the background) and no modifier keys (Ctrl, Alt, Shift,
                    Meta/Command) are pressed.
                  </span>
                </p>
              </DocInfoCard>
            </div>
          </div>
        </DocSection>

        <DocSection
          title="Global Actions"
          icon={<Command className="h-5 w-5" />}
          variant="secondary"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Navigate through the application quickly using these global shortcuts.
            </p>

            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">⌘/Ctrl + K</span>
                  <span className="text-muted-foreground">Jump to quarter</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">Esc</span>
                  <span className="text-muted-foreground">
                    Close popups / Cancel current action
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DocSection>

        <DocSection
          title="Form Actions"
          icon={<MousePointerClick className="h-5 w-5" />}
          variant="neutral"
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Common shortcuts for working with forms and text inputs.
            </p>

            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded">⌘/Ctrl + Enter</span>
                  <span className="text-muted-foreground">Submit form</span>
                </div>
              </div>
            </div>
          </div>
        </DocSection>
      </div>
    </div>
  );
}
