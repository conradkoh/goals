import { useEffect, useMemo, useRef, useState } from 'react';

// Define the possible actions that can be performed on the optimistic array
type OptimisticArrayAction<ArrayValue> =
  | {
      type: 'append'; // Action type for appending a value
      value: ArrayValue; // The value to append
    }
  | {
      type: 'remove'; // Action type for removing a value
      index: number; // The index of the value to remove
    };

// Define the structure of the optimistic array, which can contain optimistic values
type OptimisticArray<ArrayValue> = (
  | (ArrayValue & {
      isOptimistic: true; // Flag indicating the value is optimistic
    })
  | ArrayValue
)[];

// Type for a function that removes an action from temporary storage
type RemoveFunc = () => void; // Function to remove the action from temporary storage

// Type for the function that updates the optimistic array based on an action
type OptimisticUpdateAction<ArrayValue> = (
  action: OptimisticArrayAction<ArrayValue>
) => RemoveFunc;

// Custom hook to manage an optimistic array
export function useOptimisticArray<
  ArrayType extends Array<ArrayValue>, // Generic type for the actual array
  ArrayValue, // Generic type for the values in the array
>(
  actualValue: ArrayType | undefined // The actual value of the array
): [
  OptimisticArray<ArrayValue> | undefined, // The optimistic array or undefined
  OptimisticUpdateAction<ArrayValue>, // Function to update the optimistic array
] {
  // Temporary storage for pending actions
  const tempStorage = useRef<OptimisticArrayAction<ArrayValue>[]>([]);
  // Add state to force re-renders
  const [, setActionCount] = useState(0);

  // Function to perform an action on the optimistic array
  const doAction = useMemo(() => {
    return (action: OptimisticArrayAction<ArrayValue>) => {
      tempStorage.current = [...tempStorage.current, action]; // Store the action in temporary storage
      setActionCount((prev) => prev + 1); // Force a re-render
      const remove: RemoveFunc = () => {
        const index = tempStorage.current.indexOf(action); // Find the index of the action
        if (index !== -1) {
          tempStorage.current.splice(index, 1); // Remove the action from storage
          setActionCount((prev) => prev - 1); // Force a re-render
        }
      };
      return remove; // Return the remove function
    };
  }, []) satisfies OptimisticUpdateAction<ArrayValue>;

  // Calculate the optimistic value based on actual value and pending actions
  const optimisticValue = useMemo(() => {
    if (!actualValue) return undefined; // Return undefined if actual value is not provided
    return [
      ...actualValue, // Spread the actual values
      ...tempStorage.current.map((action) => {
        // Map over the pending actions
        switch (action.type) {
          case 'append':
            return { ...action.value, isOptimistic: true as const }; // Append optimistic value
          case 'remove':
            return {
              ...actualValue[action.index], // Return the value at the specified index
              isOptimistic: true as const, // Mark it as optimistic
            };
          default:
            return action; // Return the action if it doesn't match any case
        }
      }),
    ];
  }, [actualValue]) satisfies OptimisticArray<ArrayValue> | undefined; // Add actionCount as dependency

  useEffect(() => {}, [optimisticValue]);

  return [optimisticValue, doAction]; // Return the optimistic value and action function
}
