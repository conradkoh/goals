'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FullscreenDialogContent,
} from '@/components/ui/dialog';

export default function FullscreenDialogTestPage() {
  const [isStandardOpen, setIsStandardOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fullscreen Dialog Test</h1>
          <p className="text-muted-foreground mt-2">
            Testing standard dialog vs fullscreen dialog positioning on mobile and desktop
          </p>
        </div>

        {/* Test Issue Description */}
        <div className="border rounded-lg p-6 space-y-4 bg-yellow-50 dark:bg-yellow-950/20">
          <h2 className="text-xl font-semibold text-yellow-900 dark:text-yellow-100">
            🔍 Issue Being Tested
          </h2>
          <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
            <p>
              The FullscreenDialogContent component was wrapping DialogContent which has
              transform-based centering classes (
              <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
                top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]
              </code>
              ).
            </p>
            <p>
              When{' '}
              <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">inset-0 m-auto</code>{' '}
              was added on top, the transform classes caused the dialog to be positioned off-screen
              on mobile.
            </p>
            <p className="font-medium">
              ✅ Fix: FullscreenDialogContent now directly uses DialogPrimitive.Content with
              inset-based positioning.
            </p>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">Test Dialogs</h2>
          <div className="flex gap-4">
            <Button onClick={() => setIsStandardOpen(true)} variant="outline">
              Open Standard Dialog
            </Button>
            <Button onClick={() => setIsFullscreenOpen(true)} variant="default">
              Open Fullscreen Dialog
            </Button>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="border rounded-lg p-6 space-y-4 bg-blue-50 dark:bg-blue-950/20">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
            📋 Test Instructions
          </h2>
          <div className="space-y-3 text-sm">
            <div className="space-y-2 text-blue-800 dark:text-blue-200">
              <p className="font-medium">Test on Desktop (viewport &gt; 640px):</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Standard Dialog: Should appear centered in viewport</li>
                <li>
                  Fullscreen Dialog: Should fill the screen with rounded corners on larger screens
                </li>
                <li>Both should be properly centered and visible</li>
              </ul>
            </div>
            <div className="space-y-2 text-blue-800 dark:text-blue-200">
              <p className="font-medium">Test on Mobile (viewport ≤ 640px):</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Standard Dialog: Should appear centered with margins</li>
                <li>
                  Fullscreen Dialog: Should fill nearly the entire viewport (with small margins)
                </li>
                <li>
                  <strong>Critical:</strong> Fullscreen dialog should be visible and centered, NOT
                  off-screen
                </li>
                <li>Should handle iOS safe areas properly (notch, home indicator)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-950/50">
          <h3 className="font-medium mb-2">Current Viewport</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Width:</span>{' '}
              <span className="font-mono">
                {typeof window !== 'undefined' ? window.innerWidth : '—'}px
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Height:</span>{' '}
              <span className="font-mono">
                {typeof window !== 'undefined' ? window.innerHeight : '—'}px
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Device Type:</span>{' '}
              {typeof window !== 'undefined' && window.innerWidth < 640 ? 'Mobile' : 'Desktop'}
            </div>
          </div>
        </div>
      </div>

      {/* Standard Dialog */}
      <Dialog open={isStandardOpen} onOpenChange={setIsStandardOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Standard Dialog</DialogTitle>
            <DialogDescription>
              This is a standard centered dialog using transform-based positioning.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This dialog uses the standard DialogContent component with{' '}
              <code className="bg-muted px-1 rounded text-xs">
                top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]
              </code>{' '}
              positioning.
            </p>
            <div className="mt-4 p-4 bg-muted rounded">
              <p className="text-xs">Position: Transform-based centering</p>
              <p className="text-xs">Suitable for: Desktop and standard mobile dialogs</p>
            </div>
          </div>
          <Button onClick={() => setIsStandardOpen(false)}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Dialog */}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <FullscreenDialogContent className="max-h-[calc(100dvh-32px)]">
          <DialogHeader>
            <DialogTitle>Fullscreen Dialog (Mobile Optimized)</DialogTitle>
            <DialogDescription>
              This dialog uses inset-based positioning for better mobile compatibility.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This dialog uses the FullscreenDialogContent component with{' '}
                <code className="bg-muted px-1 rounded text-xs">fixed inset-0 m-auto</code>{' '}
                positioning.
              </p>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  ✅ Expected Behavior:
                </p>
                <ul className="text-xs text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
                  <li>Dialog is fully visible on screen</li>
                  <li>Centered in viewport on both mobile and desktop</li>
                  <li>Respects safe areas on iOS (notch, home indicator)</li>
                  <li>Uses dynamic viewport height (dvh) for iOS Safari compatibility</li>
                  <li>No off-screen positioning issues</li>
                </ul>
              </div>
              <div className="p-4 bg-muted rounded">
                <p className="text-xs font-medium mb-2">Technical Details:</p>
                <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Position: Inset-based (fixed inset-0 m-auto)</li>
                  <li>Height: Uses dvh (dynamic viewport height) for mobile</li>
                  <li>Safe areas: Padding with env(safe-area-inset-bottom)</li>
                  <li>Suitable for: Touch devices and mobile-first interfaces</li>
                </ul>
              </div>
              {/* Add some content to test scrolling */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Scrollable Content Test:</p>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="p-3 bg-muted rounded">
                    <p className="text-sm">Content block {i + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      This content tests vertical scrolling within the dialog.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t pt-4">
            <Button onClick={() => setIsFullscreenOpen(false)} className="w-full">
              Close Dialog
            </Button>
          </div>
        </FullscreenDialogContent>
      </Dialog>
    </div>
  );
}
