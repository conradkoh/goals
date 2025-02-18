'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboard } from '@/hooks/useDashboard';

export const YearQuarterSelector = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentYear, currentQuarter } = useDashboard();

  // Get year and quarter from URL or use current values
  const selectedYear = searchParams.get('year')
    ? parseInt(searchParams.get('year')!)
    : currentYear;
  const selectedQuarter = searchParams.get('quarter')
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

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedYear.toString()}
        onValueChange={(value) =>
          updateUrlParams(parseInt(value), selectedQuarter)
        }
      >
        <SelectTrigger className="w-[120px]">
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
          updateUrlParams(selectedYear, parseInt(value))
        }
      >
        <SelectTrigger className="w-[120px]">
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
    </div>
  );
};
