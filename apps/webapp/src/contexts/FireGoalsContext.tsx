import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import { Id } from '@services/backend/convex/_generated/dataModel';

// Local storage key for fire goals
const FIRE_GOALS_STORAGE_KEY = 'fireGoals';

interface FireGoalsContextType {
  fireGoals: Set<string>;
  toggleFireStatus: (goalId: Id<'goals'>) => void;
  isOnFire: (goalId: Id<'goals'>) => boolean;
}

const FireGoalsContext = createContext<FireGoalsContextType | undefined>(
  undefined
);

export const useFireGoals = (): FireGoalsContextType => {
  const context = useContext(FireGoalsContext);
  if (!context) {
    throw new Error('useFireGoals must be used within a FireGoalsProvider');
  }
  return context;
};

interface FireGoalsProviderProps {
  children: ReactNode;
}

// Helper function to load fire goals from localStorage
const loadFireGoalsFromStorage = (): Set<string> => {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const storedFireGoals = localStorage.getItem(FIRE_GOALS_STORAGE_KEY);
    if (storedFireGoals) {
      return new Set(JSON.parse(storedFireGoals));
    }
  } catch (error) {
    console.error('Error loading fire goals from localStorage:', error);
  }

  return new Set();
};

export const FireGoalsProvider: React.FC<FireGoalsProviderProps> = ({
  children,
}) => {
  // Initialize with values from localStorage
  const [fireGoals, setFireGoals] = useState<Set<string>>(
    loadFireGoalsFromStorage
  );

  // Persist to localStorage whenever fireGoals changes
  useEffect(() => {
    try {
      localStorage.setItem(
        FIRE_GOALS_STORAGE_KEY,
        JSON.stringify(Array.from(fireGoals))
      );
    } catch (error) {
      console.error('Error saving fire goals to localStorage:', error);
    }
  }, [fireGoals]);

  const toggleFireStatus = (goalId: Id<'goals'>) => {
    setFireGoals((prevFireGoals) => {
      const newFireGoals = new Set(prevFireGoals);
      const goalIdStr = goalId.toString();

      if (newFireGoals.has(goalIdStr)) {
        newFireGoals.delete(goalIdStr);
      } else {
        newFireGoals.add(goalIdStr);
      }

      return newFireGoals;
    });
  };

  const isOnFire = (goalId: Id<'goals'>) => {
    return fireGoals.has(goalId.toString());
  };

  const value = {
    fireGoals,
    toggleFireStatus,
    isOnFire,
  };

  return (
    <FireGoalsContext.Provider value={value}>
      {children}
    </FireGoalsContext.Provider>
  );
};
