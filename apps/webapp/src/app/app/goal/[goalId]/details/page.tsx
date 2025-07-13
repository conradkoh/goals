'use client';

import React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Id } from '@services/backend/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Edit2, Pin, Star, FileText } from 'lucide-react';
import { DateTime } from 'luxon';
import { useWeek, useWeekWithoutDashboard, WeekProviderWithoutDashboard } from '@/hooks/useWeek';
import { useCurrentDateTime } from '@/hooks/useCurrentDateTime';
import { DayOfWeek, getDayName } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { CreateGoalInput } from '@/components/atoms/CreateGoalInput';
import { GoalDetailsContent } from '@/components/molecules/goal-details/GoalDetailsContent';
import { GoalDetailsChildrenList } from '@/components/molecules/goal-details/GoalDetailsChildrenList';
import { GoalEditPopover } from '@/components/atoms/GoalEditPopover';
import { QuarterlyGoalSummaryPopover } from '@/components/molecules/quarterly-summary';
import {
  GoalStarPin,
  GoalStarPinContainer,
} from '@/components/atoms/GoalStarPin';
import { FireGoalsProvider } from '@/contexts/FireGoalsContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/modules/auth/useSession';
import { useQuarterWeekInfo } from '@/hooks/useQuarterWeekInfo';

/**
 * Renders the full-screen goal details page.
 * This page displays a detailed view of a goal with all its functionality
 * in a truly full-screen layout.
 *
 * @returns {JSX.Element} The rendered goal details page.
 */
export default function GoalDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId } = useSession();
  
  const goalId = params.goalId as Id<'goals'>;
  
  // Get current date info for week data
  const currentDateTime = useCurrentDateTime();
  const currentYear = currentDateTime.year;
  const currentQuarter = Math.ceil(currentDateTime.month / 3) as 1 | 2 | 3 | 4;
  const { currentWeekNumber } = useQuarterWeekInfo(currentYear, currentQuarter);

  // Fetch week data for the current week
  const weekData = useWeekWithoutDashboard({
    year: currentYear,
    quarter: currentQuarter,
    week: currentWeekNumber,
  });

  // Find the goal in the week data
  const goal = React.useMemo(() => {
    if (!weekData?.tree?.allGoals) return null;
    return weekData.tree.allGoals.find(g => g._id === goalId) || null;
  }, [weekData, goalId]);

  // Set page title based on goal name
  React.useEffect(() => {
    const originalTitle = document.title;
    
    if (goal?.title) {
      document.title = `${goal.title} - Goal Details`;
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [goal?.title]);

  const handleGoBack = React.useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/app/dashboard');
    }
  }, [router]);

  const handleGoHome = React.useCallback(() => {
    router.push('/app/dashboard');
  }, [router]);

  if (!weekData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading week data...</p>
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Goal not found</p>
          <Button onClick={handleGoBack} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <WeekProviderWithoutDashboard weekData={weekData}>
      <GoalDetailsPageContent 
        goal={goal}
        onGoBack={handleGoBack}
        onGoHome={handleGoHome}
      />
    </WeekProviderWithoutDashboard>
  );
}

// Inner component that uses the week context
const GoalDetailsPageContent = ({ 
  goal, 
  onGoBack, 
  onGoHome 
}: { 
  goal: any; 
  onGoBack: () => void; 
  onGoHome: () => void; 
}) => {
  const {
    weekNumber,
    year,
    quarter,
    createWeeklyGoalOptimistic,
    createDailyGoalOptimistic,
    updateQuarterlyGoalStatus,
    toggleGoalCompletion,
  } = useWeek();
  const currentDateTime = useCurrentDateTime();

  const [newWeeklyGoalTitle, setNewWeeklyGoalTitle] = React.useState('');
  const [newDailyGoalTitle, setNewDailyGoalTitle] = React.useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = React.useState<DayOfWeek>(
    () => (currentDateTime.weekday as DayOfWeek)
  );

  const shouldShowChildGoals = goal && (goal.depth === 0 || goal.depth === 1);
  const isQuarterlyGoal = goal?.depth === 0;
  const isWeeklyGoal = goal?.depth === 1;
  const isComplete = goal.isComplete;
  const isStarred = goal.state?.isStarred || false;
  const isPinned = goal.state?.isPinned || false;

  const handleToggleStar = async () => {
    if (isQuarterlyGoal) {
      await updateQuarterlyGoalStatus({
        goalId: goal._id,
        weekNumber,
        year,
        quarter,
        isStarred: !isStarred,
        isPinned: false,
      });
    }
  };

  const handleTogglePin = async () => {
    if (isQuarterlyGoal) {
      await updateQuarterlyGoalStatus({
        goalId: goal._id,
        weekNumber,
        year,
        quarter,
        isStarred: false,
        isPinned: !isPinned,
      });
    }
  };

  const handleToggleCompletion = async (isComplete: boolean) => {
    await toggleGoalCompletion({
      goalId: goal._id,
      weekNumber,
      isComplete,
    });
  };

  const handleSaveTitle = async (title: string, details?: string) => {
    // This would need to be implemented based on your goal update mutation
    console.log('Save title:', title, details);
  };

  const handleCreateWeeklyGoal = async () => {
    const trimmedTitle = newWeeklyGoalTitle.trim();
    if (trimmedTitle && isQuarterlyGoal) {
      try {
        setNewWeeklyGoalTitle('');
        await createWeeklyGoalOptimistic(goal._id, trimmedTitle);
      } catch (error) {
        console.error('Failed to create weekly goal:', error);
        setNewWeeklyGoalTitle(trimmedTitle);
      }
    }
  };

  const handleCreateDailyGoal = async () => {
    const trimmedTitle = newDailyGoalTitle.trim();
    if (trimmedTitle && isWeeklyGoal) {
      try {
        setNewDailyGoalTitle('');

        const dateTimestamp = DateTime.fromObject({
          weekNumber,
          weekYear: year,
        })
          .startOf('week')
          .plus({ days: selectedDayOfWeek - 1 })
          .toMillis();

        await createDailyGoalOptimistic(
          goal._id,
          trimmedTitle,
          selectedDayOfWeek,
          dateTimestamp
        );
      } catch (error) {
        console.error('Failed to create daily goal:', error);
        setNewDailyGoalTitle(trimmedTitle);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onGoHome}
                  className="flex items-center gap-1 h-8 px-2"
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </Button>
                <span>/</span>
                <span>Goal Details</span>
                {goal.title && (
                  <>
                    <span>/</span>
                    <span className="font-medium text-foreground truncate max-w-xs">
                      {goal.title}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isQuarterlyGoal && (
                <GoalStarPinContainer>
                  <GoalStarPin
                    value={{
                      isStarred,
                      isPinned,
                    }}
                    onStarred={handleToggleStar}
                    onPinned={handleTogglePin}
                  />
                </GoalStarPinContainer>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isQuarterlyGoal && (
                <QuarterlyGoalSummaryPopover
                  quarterlyGoal={goal}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>View Summary</span>
                    </Button>
                  }
                />
              )}
              <GoalEditPopover
                title={goal.title}
                details={goal.details}
                onSave={handleSaveTitle}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FireGoalsProvider>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            {/* Goal Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  className="flex-shrink-0"
                  checked={isComplete}
                  onCheckedChange={(checked) => handleToggleCompletion(checked === true)}
                />
                <h1 className="text-xl font-semibold break-words flex-1 leading-tight">
                  {goal.title}
                </h1>
              </div>
            </div>

            {/* Status indicators */}
            {isQuarterlyGoal && (isStarred || isPinned) && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                {isStarred && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>Starred</span>
                  </div>
                )}
                {isPinned && (
                  <div className="flex items-center gap-2">
                    <Pin className="h-4 w-4 fill-blue-400 text-blue-400" />
                    <span>Pinned</span>
                  </div>
                )}
              </div>
            )}

            {/* Display completion date if the goal is complete */}
            {isComplete && goal.completedAt && (
              <div className="text-sm text-muted-foreground mb-4">
                Completed on{' '}
                {DateTime.fromMillis(goal.completedAt).toFormat('LLL d, yyyy')}
              </div>
            )}

            {/* Goal Details */}
            {goal.details && (
              <>
                <Separator className="my-4" />
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-3">Details</h2>
                  <GoalDetailsContent title={goal.title} details={goal.details} />
                </div>
              </>
            )}

            {/* Child Goals */}
            {shouldShowChildGoals &&
              goal &&
              ((goal.children && goal.children.length > 0) ||
                isQuarterlyGoal ||
                isWeeklyGoal) && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-4">
                    {isQuarterlyGoal && (
                      <>
                        {goal.children && goal.children.length > 0 && (
                          <div>
                            <h2 className="text-lg font-semibold mb-3">Weekly Goals</h2>
                            <GoalDetailsChildrenList
                              parentGoal={goal}
                              title="Weekly Goals"
                            />
                          </div>
                        )}
                        <div className="pl-4">
                          <h3 className="text-base font-medium mb-2">Add Weekly Goal</h3>
                          <CreateGoalInput
                            placeholder="Add a new weekly goal..."
                            value={newWeeklyGoalTitle}
                            onChange={setNewWeeklyGoalTitle}
                            onSubmit={handleCreateWeeklyGoal}
                            onEscape={() => setNewWeeklyGoalTitle('')}
                          />
                        </div>
                      </>
                    )}
                    {isWeeklyGoal && (
                      <>
                        {goal.children && goal.children.length > 0 && (
                          <div>
                            <h2 className="text-lg font-semibold mb-3">Daily Goals</h2>
                            <GoalDetailsChildrenList
                              parentGoal={goal}
                              title="Daily Goals"
                            />
                          </div>
                        )}
                        <div className="pl-4">
                          <h3 className="text-base font-medium mb-2">Add Daily Goal</h3>
                          <CreateGoalInput
                            placeholder="Add a new daily goal..."
                            value={newDailyGoalTitle}
                            onChange={setNewDailyGoalTitle}
                            onSubmit={handleCreateDailyGoal}
                            onEscape={() => setNewDailyGoalTitle('')}
                          >
                            <div className="mt-3">
                              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Day of Week
                              </label>
                              <Select
                                value={selectedDayOfWeek.toString()}
                                onValueChange={(value) =>
                                  setSelectedDayOfWeek(parseInt(value) as DayOfWeek)
                                }
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.values(DayOfWeek).map((value) => (
                                    <SelectItem key={value} value={value.toString()}>
                                      {getDayName(value)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </CreateGoalInput>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
          </div>
        </FireGoalsProvider>
      </div>
    </div>
  );
}; 