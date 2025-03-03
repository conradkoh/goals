import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ViewMode } from '@/components/molecules/focus/constants';
import { cn } from '@/lib/utils';
import { DayOfWeek } from '@/lib/constants';
import { FocusMenuBar } from './FocusMenuBar';

interface FocusHeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (newViewMode: ViewMode) => void;
  onClose: () => void;
  children?: React.ReactNode;
  // Navigation props
  selectedWeek?: number;
  selectedDay?: DayOfWeek;
  isAtMinBound?: boolean;
  isAtMaxBound?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  selectedYear?: number;
  selectedQuarter?: 1 | 2 | 3 | 4;
  onYearQuarterChange?: (year: number, quarter: number) => void;
}

/**
 * A pure component that renders the header for focus mode views
 * Includes the FocusMenuBar and close button
 */
export const FocusHeader = memo(
  ({
    viewMode,
    onViewModeChange,
    onClose,
    children,
    selectedWeek,
    selectedDay,
    isAtMinBound,
    isAtMaxBound,
    onPrevious,
    onNext,
    selectedYear,
    selectedQuarter,
    onYearQuarterChange,
  }: FocusHeaderProps) => {
    // Determine if we should use container class based on view mode
    const isQuarterlyView = viewMode === 'quarterly';

    return (
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div
          className={cn(
            'py-4',
            isQuarterlyView ? 'w-full px-4' : 'container mx-auto px-6'
          )}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">Focus Mode</h2>
                  <FocusMenuBar
                    viewMode={viewMode}
                    onViewModeChange={onViewModeChange}
                    selectedWeek={selectedWeek}
                    selectedDay={selectedDay}
                    isAtMinBound={isAtMinBound}
                    isAtMaxBound={isAtMaxBound}
                    onPrevious={onPrevious}
                    onNext={onNext}
                    selectedYear={selectedYear}
                    selectedQuarter={selectedQuarter}
                    onYearQuarterChange={onYearQuarterChange}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground sm:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {children}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

FocusHeader.displayName = 'FocusHeader';
