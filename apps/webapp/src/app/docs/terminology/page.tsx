import { Metadata } from 'next';
import {
  Star,
  Pin,
  CheckSquare,
  BookText,
  LayoutGrid,
  Calendar,
  CalendarDays,
  Layers,
  PlayCircle,
  Target,
  ListChecks,
} from 'lucide-react';
import {
  DocHeader,
  DocSection,
  DocFeatureCard,
  DocInfoCard,
} from '../components/primitives';

export const metadata: Metadata = {
  title: 'Getting Started - Goals Documentation',
  description: 'Learn how to use Goals and understand its core concepts',
};

export default function GettingStartedPage() {
  return (
    <div className="space-y-8">
      <DocHeader
        icon={<PlayCircle className="h-4 w-4" />}
        badge="Getting Started"
        title="Getting Started with Goals"
        description="Learn how to use Goals effectively and understand the different types of goals to maximize your productivity."
        badgeColor="indigo"
      />

      <div className="grid gap-8">
        <DocSection
          title="How Goals Works"
          icon={<Target className="h-5 w-5" />}
          variant="primary"
        >
          <div className="space-y-4">
            <p className="text-slate-700">
              Goals helps you organize your objectives using a hierarchical
              approach, breaking down large goals into manageable tasks. This
              structure makes it easier to track progress and stay focused on
              what matters.
            </p>
            <DocInfoCard variant="default">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
                <div className="bg-indigo-100 text-indigo-800 font-medium px-4 py-2 rounded-md">
                  Quarterly Goals
                </div>
                <div className="text-slate-400">→</div>
                <div className="bg-blue-100 text-blue-800 font-medium px-4 py-2 rounded-md">
                  Weekly Goals
                </div>
                <div className="text-slate-400">→</div>
                <div className="bg-slate-100 text-slate-800 font-medium px-4 py-2 rounded-md">
                  Daily Goals
                </div>
              </div>
            </DocInfoCard>
            <p className="text-slate-700">
              Start by setting your quarterly goals, then break them down into
              weekly objectives, and finally into daily tasks. This approach
              helps you maintain focus while making consistent progress toward
              your larger ambitions.
            </p>
          </div>
        </DocSection>

        <DocSection
          title="Setting Quarterly Goals"
          icon={<Calendar className="h-5 w-5" />}
          variant="secondary"
        >
          <div className="space-y-6">
            <p className="text-slate-700">
              Quarterly goals represent your major objectives for a three-month
              period. These are the high-level achievements you're working
              toward.
            </p>

            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                How to use quarterly goals:
              </h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <DocFeatureCard
                  title="Star Important Goals"
                  description="Click the star icon to mark a goal as important. Starred goals are highlighted for emphasis and easier tracking."
                  icon={
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  }
                  variant="indigo"
                />
                <DocFeatureCard
                  title="Pin Goals"
                  description="Click the pin icon to pin a goal to the top of your list for quick access to your most relevant objectives."
                  icon={<Pin className="h-4 w-4 fill-blue-500 text-blue-500" />}
                  variant="indigo"
                />
              </div>
            </div>

            <p className="text-slate-700">
              We recommend setting 3-5 quarterly goals that align with your
              long-term vision. Each goal should be specific enough to measure
              but broad enough to encompass multiple weeks of work.
            </p>
          </div>
        </DocSection>

        <DocSection
          title="Managing Weekly Goals"
          icon={<CalendarDays className="h-5 w-5" />}
          variant="neutral"
        >
          <div className="space-y-6">
            <p className="text-slate-700">
              Weekly goals are specific objectives you aim to accomplish within
              a week. They help break down quarterly goals into actionable steps
              and provide a clear focus for each week.
            </p>

            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                How to use weekly goals:
              </h3>
              <div className="space-y-4">
                <DocFeatureCard
                  title="Track Completion"
                  description="Check off weekly goals as you complete them. This helps you visualize your progress throughout the week."
                  icon={<CheckSquare className="h-4 w-4 text-green-500" />}
                  variant="blue"
                />

                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
                      <span className="text-xs font-bold">i</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 mb-1">
                        Weekly Planning
                      </h4>
                      <p className="text-sm text-slate-600">
                        Set aside time each Sunday or Monday to review your
                        quarterly goals and plan your weekly objectives. Aim for
                        3-7 weekly goals that directly contribute to your
                        quarterly targets.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DocSection>

        <DocSection
          title="Organizing Daily Tasks"
          icon={<ListChecks className="h-5 w-5" />}
          variant="primary"
        >
          <div className="space-y-6">
            <p className="text-slate-700">
              Daily goals are the specific tasks you plan to accomplish in a
              single day. They are the most granular level of planning and help
              you make consistent daily progress.
            </p>

            <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                How to use daily goals:
              </h3>
              <div className="space-y-4">
                <DocFeatureCard
                  title="Daily Planning"
                  description="Each morning (or the night before), review your weekly goals and set 3-5 specific tasks to accomplish that day."
                  icon={<CheckSquare className="h-4 w-4 text-green-500" />}
                  variant="blue"
                />

                <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
                    <span className="text-xs font-bold">i</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">
                      Focus Mode
                    </h4>
                    <p className="text-sm text-slate-600">
                      Use the Focus Mode to concentrate on your daily tasks
                      without distractions. This view shows only what you need
                      to accomplish today, helping you stay on track.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DocSection>

        <DocSection
          title="Using Different Views"
          icon={<LayoutGrid className="h-5 w-5" />}
          variant="secondary"
        >
          <div className="space-y-4">
            <p className="text-slate-700">
              Goals offers different views to help you focus on your goals at
              various levels. Switch between these views based on your current
              planning needs.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <h3 className="font-medium text-slate-900 mb-2">
                  Quarterly View
                </h3>
                <p className="text-sm text-slate-600">
                  Use this view for big-picture planning and to track progress
                  on your major objectives. Great for monthly reviews and
                  adjustments.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <h3 className="font-medium text-slate-900 mb-2">Weekly View</h3>
                <p className="text-sm text-slate-600">
                  Perfect for mid-term planning and tracking. Review this view
                  at the beginning and end of each week to assess progress.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <h3 className="font-medium text-slate-900 mb-2">Daily View</h3>
                <p className="text-sm text-slate-600">
                  Your go-to view for daily planning and execution. Check this
                  first thing in the morning to plan your day.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <h3 className="font-medium text-slate-900 mb-2">Focus Mode</h3>
                <p className="text-sm text-slate-600">
                  A distraction-free view that shows only your current day's
                  tasks. Perfect for when you need to concentrate on execution.
                </p>
              </div>
            </div>
          </div>
        </DocSection>
      </div>
    </div>
  );
}
