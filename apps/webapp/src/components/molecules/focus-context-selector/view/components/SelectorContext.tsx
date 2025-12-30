import type { DayOfWeek } from '@workspace/backend/src/constants';
import { create } from 'zustand';

export interface _SelectorState {
  year: number;
  quarter: 1 | 2 | 3 | 4;
  week: number;
  day: DayOfWeek;
  setYear: (year: number) => void;
  setQuarter: (quarter: 1 | 2 | 3 | 4) => void;
  setWeek: (week: number) => void;
  setDay: (day: DayOfWeek) => void;
  reset: (initialState: Partial<_SelectorState>) => void;
}

export const useSelectorStore = create<_SelectorState>((set) => ({
  year: new Date().getFullYear(),
  quarter: Math.floor((new Date().getMonth() + 2) / 3) as 1 | 2 | 3 | 4,
  week: 1,
  day: 1,
  setYear: (year) => set({ year }),
  setQuarter: (quarter) => set({ quarter }),
  setWeek: (week) => set({ week }),
  setDay: (day) => set({ day }),
  reset: (initialState) => set((state) => ({ ...state, ...initialState })),
}));
