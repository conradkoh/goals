import { WeekProvider } from '@/hooks/useWeek';

interface WeekCardProps {
  weekLabel: string;
  mondayDate: string;
  weekNumber: number;
  children?: React.ReactNode;
}

export const WeekCard = ({
  weekLabel,
  mondayDate,
  weekNumber,
  children,
}: WeekCardProps) => {
  return (
    <WeekProvider weekNumber={weekNumber}>
      <div className="w-[calc(100%/6)] shrink-0 flex flex-col border rounded-lg shadow bg-white h-full">
        <div className="border-b p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">{mondayDate}</p>
            <h2 className="text-lg font-semibold">{weekLabel}</h2>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-6 overflow-y-auto">{children}</div>
      </div>
    </WeekProvider>
  );
};
