'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewMode } from '@/app/focus/page.constants';
import { DayOfWeek, getDayName } from '@/lib/constants';
import { cn } from '@/lib/utils';

export type FocusMenuBarProps = {
  viewMode?: ViewMode;
  onViewModeChange?: (viewMode: ViewMode) => void;
  selectedWeek?: number;
  selectedDay?: DayOfWeek;
  isAtMinBound?: boolean;
  isAtMaxBound?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  selectedYear?: number;
  selectedQuarter?: 1 | 2 | 3 | 4;
  onYearQuarterChange?: (year: number, quarter: number) => void;
};

export const FocusMenuBar = ({
  viewMode = 'quarterly',
  onViewModeChange,
  selectedWeek,
  selectedDay,
  isAtMinBound = false,
  isAtMaxBound = false,
  onPrevious,
  onNext,
  selectedYear,
  selectedQuarter,
  onYearQuarterChange,
}: FocusMenuBarProps) => {
  // Generate years (current year - 1 to current year + 2)
  const years = selectedYear
    ? Array.from({ length: 4 }, (_, i) => selectedYear - 1 + i)
    : [];

  // Generate quarters
  const quarters = [1, 2, 3, 4];

  const handleYearChange = (year: number) => {
    if (onYearQuarterChange && selectedQuarter) {
      onYearQuarterChange(year, selectedQuarter);
    }
  };

  const handleQuarterChange = (quarter: number) => {
    if (onYearQuarterChange && selectedYear) {
      onYearQuarterChange(selectedYear, quarter as 1 | 2 | 3 | 4);
    }
  };

  const handleViewModeChange = (newViewMode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(newViewMode);
    }
  };

  // Only show year and quarter selectors in quarterly view
  const showYearQuarterSelectors = viewMode === 'quarterly';

  // Show navigation controls for daily and weekly views
  const showNavigationControls = viewMode === 'daily' || viewMode === 'weekly';

  return (
    <div className="bg-background p-3 border-b">
      <div className="max-w-screen-2xl mx-auto px-4 flex justify-center">
        <div
          id="focus-menu-bar"
          className="flex items-center justify-center sm:justify-start gap-3"
        >
          <div className="flex items-center gap-2">
            {showYearQuarterSelectors &&
              selectedYear &&
              selectedQuarter &&
              onYearQuarterChange && (
                <>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => handleYearChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedQuarter.toString()}
                    onValueChange={(value) =>
                      handleQuarterChange(parseInt(value))
                    }
                  >
                    <SelectTrigger className="w-[80px]">
                      <SelectValue placeholder="Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map((quarter) => (
                        <SelectItem key={quarter} value={quarter.toString()}>
                          Q{quarter}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

            {showNavigationControls && onPrevious && onNext && (
              <div className="flex items-center gap-2 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevious}
                  disabled={isAtMinBound}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    isAtMinBound && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {viewMode === 'daily' && selectedDay
                    ? `${getDayName(selectedDay)}`
                    : viewMode === 'weekly' && selectedWeek
                    ? `Week ${selectedWeek}`
                    : ''}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={isAtMaxBound}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-foreground',
                    isAtMaxBound && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Select value={viewMode} onValueChange={handleViewModeChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarterly">Quarterly View</SelectItem>
                <SelectItem value="weekly">Weekly View</SelectItem>
                <SelectItem value="daily">Daily View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};
