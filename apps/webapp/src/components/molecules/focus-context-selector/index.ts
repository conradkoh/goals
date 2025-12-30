/**
 * Focus Context Selector Components
 *
 * ## Architecture
 * This component provides modal dialogs for selecting context (year/quarter/week/day) in focus mode.
 * It follows a composable pattern with pre-built variants for different view modes.
 *
 * ## Usage
 *
 * ### Using Pre-composed Variants (Recommended)
 * ```tsx
 * import { QuarterlySelector, WeeklySelector, DailySelector } from '@/components/molecules/focus-context-selector';
 *
 * // Quarterly view
 * <QuarterlySelector
 *   open={isQuarterlyOpen}
 *   onOpenChange={setIsQuarterlyOpen}
 *   year={selectedYear}
 *   quarter={selectedQuarter}
 *   onApply={(year, quarter) => {
 *     setSelectedYear(year);
 *     setSelectedQuarter(quarter);
 *   }}
 * />
 *
 * // Weekly view
 * <WeeklySelector
 *   open={isWeeklyOpen}
 *   onOpenChange={setIsWeeklyOpen}
 *   year={selectedYear}
 *   week={selectedWeek}
 *   onApply={(year, week) => {
 *     setSelectedYear(year);
 *     setSelectedWeek(week);
 *   }}
 * />
 *
 * // Daily view
 * <DailySelector
 *   open={isDailyOpen}
 *   onOpenChange={setIsDailyOpen}
 *   year={selectedYear}
 *   week={selectedWeek}
 *   day={selectedDay}
 *   onApply={(year, week, day) => {
 *     setSelectedYear(year);
 *     setSelectedWeek(week);
 *     setSelectedDay(day);
 *   }}
 * />
 * ```
 *
 * ### Building Custom Compositions
 * ```tsx
 * import { MainView, YearSelector, QuarterSelector } from '@/components/molecules/focus-context-selector/view';
 *
 * <MainView open={isOpen} onOpenChange={setOpen} title="Custom Selector">
 *   <YearSelector value={year} onChange={setYear} />
 *   <QuarterSelector value={quarter} onChange={setQuarter} />
 * </MainView>
 * ```
 */

// Re-export variants (most common usage)
export * from './variants';

// Re-export view components for custom compositions
export * from './view';
