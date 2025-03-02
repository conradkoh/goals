'use client';

import {
  Download,
  Monitor,
  Apple,
  Command,
  Bell,
  RefreshCw,
  Save,
  Laptop,
  Globe,
  Rocket,
  Smartphone,
  Share2,
  Plus,
  Home,
} from 'lucide-react';
import {
  DocHeader,
  DocSection,
  DocInfoCard,
  DocFeatureCard,
  DocList,
  DocListItem,
} from '../components/primitives';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';

export default function InstallationGuidePage() {
  const [platform, setPlatform] = useState<'macos' | 'ios'>('macos');

  useEffect(() => {
    // Detect platform based on user agent
    const userAgent = navigator.userAgent.toLowerCase();
    if (
      userAgent.includes('iphone') ||
      userAgent.includes('ipad') ||
      userAgent.includes('ipod')
    ) {
      setPlatform('ios');
    } else if (userAgent.includes('mac')) {
      setPlatform('macos');
    }
  }, []);

  return (
    <div className="space-y-8">
      <DocHeader
        icon={<Download className="h-4 w-4" />}
        badge="Installation"
        title="Installation Guide"
        description="Learn how to install and set up Goals on your device."
        badgeColor="blue"
      />

      <Tabs
        defaultValue={platform}
        value={platform}
        onValueChange={(value) => setPlatform(value as 'macos' | 'ios')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="macos" className="flex items-center gap-2">
            <Apple className="h-4 w-4" />
            <span>macOS</span>
          </TabsTrigger>
          <TabsTrigger value="ios" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>iOS</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="macos" className="space-y-8">
          <DocSection
            title="System Requirements"
            icon={<Laptop className="h-5 w-5" />}
            variant="primary"
          >
            <DocList>
              <DocListItem variant="blue">
                macOS 11 (Big Sur) or newer
              </DocListItem>
              <DocListItem variant="blue">Safari 14 or newer</DocListItem>
              <DocListItem variant="blue">
                Raycast (optional, for hotkey access)
              </DocListItem>
              <DocListItem variant="blue">
                Internet connection for initial setup and syncing
              </DocListItem>
            </DocList>
          </DocSection>

          <DocSection
            title="Safari Installation"
            icon={<Apple className="h-5 w-5" />}
            variant="secondary"
          >
            <div className="space-y-6">
              <p className="text-slate-700">
                Follow these steps to install Goals as a Progressive Web App
                (PWA) using Safari:
              </p>

              <div className="space-y-4">
                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    Step 1: Visit the Website
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    Open Safari and navigate to{' '}
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      goals.duskfare.com
                    </span>
                  </p>
                  <DocInfoCard variant="note">
                    <p>
                      Make sure you're using Safari browser, as it provides the
                      best installation experience on macOS.
                    </p>
                  </DocInfoCard>
                </div>

                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Command className="h-4 w-4 text-blue-600" />
                    Step 2: Add to Dock
                  </h3>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      To add Goals to your dock:
                    </p>
                    <DocList>
                      <DocListItem variant="blue">
                        Click on the "Share" button in Safari's toolbar (square
                        with arrow pointing up)
                      </DocListItem>
                      <DocListItem variant="blue">
                        Scroll down in the share menu and select "Add to Dock"
                      </DocListItem>
                      <DocListItem variant="blue">
                        In the dialog that appears, you can edit the name if
                        desired
                      </DocListItem>
                      <DocListItem variant="blue">
                        Click "Add" to complete the process
                      </DocListItem>
                    </DocList>
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-blue-600" />
                    Step 3: Launch the App
                  </h3>
                  <p className="text-sm text-slate-600">
                    Click on the Goals icon in your dock to launch it. The app
                    will open in its own window, separate from Safari, providing
                    a native app-like experience.
                  </p>
                </div>
              </div>
            </div>
          </DocSection>

          <DocSection
            title="Raycast Integration"
            icon={<Command className="h-5 w-5" />}
            variant="neutral"
          >
            <div className="space-y-6">
              <p className="text-slate-700">
                For quick access to Goals, you can set up a hotkey using
                Raycast:
              </p>

              <div className="space-y-4">
                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Download className="h-4 w-4 text-indigo-600" />
                    Step 1: Install Raycast
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    If you don't already have Raycast installed:
                  </p>
                  <DocList>
                    <DocListItem variant="indigo">
                      Visit{' '}
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        raycast.com
                      </span>{' '}
                      and download the installer
                    </DocListItem>
                    <DocListItem variant="indigo">
                      Open the downloaded file and follow the installation
                      instructions
                    </DocListItem>
                    <DocListItem variant="indigo">
                      Launch Raycast after installation
                    </DocListItem>
                  </DocList>
                </div>

                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Command className="h-4 w-4 text-indigo-600" />
                    Step 2: Configure Hotkey
                  </h3>
                  <DocList>
                    <DocListItem variant="indigo">
                      Open Raycast (default hotkey is{' '}
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        Option (⌥) + Space
                      </span>
                      )
                    </DocListItem>
                    <DocListItem variant="indigo">
                      Type "Extensions" and select "Extensions" from the results
                    </DocListItem>
                    <DocListItem variant="indigo">
                      Click the "+" button and select "Add Application"
                    </DocListItem>
                    <DocListItem variant="indigo">
                      Find and select "Goals" from your Applications
                    </DocListItem>
                    <DocListItem variant="indigo">
                      Click on the newly added Goals in the extensions list
                    </DocListItem>
                    <DocListItem variant="indigo">
                      Click "Add Hotkey" and press your desired key combination
                      (e.g.,{' '}
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                        ⌘ + G
                      </span>
                      )
                    </DocListItem>
                    <DocListItem variant="indigo">
                      Click "Save" to confirm your hotkey
                    </DocListItem>
                  </DocList>
                </div>
              </div>

              <DocInfoCard variant="default">
                <p className="flex items-start gap-2">
                  <span className="font-semibold">Tip:</span>
                  <span>
                    You can now quickly open Goals from anywhere on your Mac by
                    pressing your configured hotkey.
                  </span>
                </p>
              </DocInfoCard>
            </div>
          </DocSection>
        </TabsContent>

        <TabsContent value="ios" className="space-y-8">
          <DocSection
            title="System Requirements"
            icon={<Smartphone className="h-5 w-5" />}
            variant="primary"
          >
            <DocList>
              <DocListItem variant="blue">iOS 14 or newer</DocListItem>
              <DocListItem variant="blue">Safari browser</DocListItem>
              <DocListItem variant="blue">
                Internet connection for initial setup and syncing
              </DocListItem>
            </DocList>
          </DocSection>

          <DocSection
            title="Safari Installation"
            icon={<Apple className="h-5 w-5" />}
            variant="secondary"
          >
            <div className="space-y-6">
              <p className="text-slate-700">
                Follow these steps to install Goals as a Progressive Web App
                (PWA) on your iOS device:
              </p>

              <div className="space-y-4">
                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    Step 1: Visit the Website
                  </h3>
                  <p className="text-sm text-slate-600 mb-2">
                    Open Safari on your iOS device and navigate to{' '}
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      goals.duskfare.com
                    </span>
                  </p>
                  <DocInfoCard variant="note">
                    <p>
                      Make sure you're using Safari browser, as other browsers
                      on iOS don't support adding websites to the home screen as
                      PWAs.
                    </p>
                  </DocInfoCard>
                </div>

                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-blue-600" />
                    Step 2: Open Share Menu
                  </h3>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Tap the Share button in Safari:
                    </p>
                    <DocList>
                      <DocListItem variant="blue">
                        Tap the Share button at the bottom of the screen (square
                        with an arrow pointing up)
                      </DocListItem>
                      <DocListItem variant="blue">
                        If you don't see the toolbar, scroll up slightly to make
                        it appear
                      </DocListItem>
                    </DocList>
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-blue-600" />
                    Step 3: Add to Home Screen
                  </h3>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Add Goals to your home screen:
                    </p>
                    <DocList>
                      <DocListItem variant="blue">
                        Scroll down in the share menu and tap "Add to Home
                        Screen"
                      </DocListItem>
                      <DocListItem variant="blue">
                        You can edit the name if desired
                      </DocListItem>
                      <DocListItem variant="blue">
                        Tap "Add" in the top-right corner to complete the
                        process
                      </DocListItem>
                    </DocList>
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-5 shadow-sm">
                  <h3 className="font-medium mb-3 text-slate-900 flex items-center gap-2">
                    <Home className="h-4 w-4 text-blue-600" />
                    Step 4: Launch the App
                  </h3>
                  <p className="text-sm text-slate-600">
                    Tap the Goals icon on your home screen to launch it. The app
                    will open in its own window, separate from Safari, providing
                    a native app-like experience with full-screen mode.
                  </p>
                </div>
              </div>
            </div>
          </DocSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
