'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
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
  selectedYear: propSelectedYear,
  selectedQuarter: propSelectedQuarter,
}: FocusMenuBarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentYear, currentQuarter } = useDashboard();

  // Get year and quarter from props or URL or use current values
  const selectedYear =
    propSelectedYear !== undefined
      ? propSelectedYear
      : searchParams.get('year')
      ? parseInt(searchParams.get('year')!)
      : currentYear;

  const selectedQuarter =
    propSelectedQuarter !== undefined
      ? propSelectedQuarter
      : searchParams.get('quarter')
      ? (parseInt(searchParams.get('quarter')!) as 1 | 2 | 3 | 4)
      : currentQuarter;

  // Generate years (current year - 1 to current year + 2)
  const years = Array.from({ length: 4 }, (_, i) => currentYear - 1 + i);

  // Generate quarters
  const quarters = [1, 2, 3, 4];

  const updateUrlParams = (year: number, quarter: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('year', year.toString());
    params.set('quarter', quarter.toString());
    router.push(`/dashboard?${params.toString()}`);
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
            {showYearQuarterSelectors && (
              <>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) =>
                    updateUrlParams(parseInt(value), selectedQuarter)
                  }
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
                    updateUrlParams(
                      selectedYear,
                      parseInt(value) as 1 | 2 | 3 | 4
                    )
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
