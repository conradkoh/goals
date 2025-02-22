import { useEffect, useMemo, useRef, useState } from 'react';

// Add this utility function to check if an ID is optimistic
export const isOptimisticId = (id: string): boolean => {
  return id.startsWith('optimistic_');
};

// Define the possible actions that can be performed on the optimistic array
type OptimisticArrayAction<ArrayValue> =
  | {
      type: 'append'; // Action type for appending a value
      value: ArrayValue; // The value to append
    }
  | {
      type: 'remove'; // Action type for removing a value
      id: string; // The ID of the value to remove
      idField?: string; // The field to use as ID (defaults to '_id')
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

    // Start with the actual values
    const result = [...actualValue];

    // Apply each action in sequence
    tempStorage.current.forEach((action) => {
      switch (action.type) {
        case 'append':
          result.push({ ...action.value, isOptimistic: true as const });
          break;
        case 'remove': {
          const idField = action.idField || '_id';
          const index = result.findIndex(
            (item) =>
              // We know the item must have an ID field since we're using it for removal
              (item as unknown as { [key: string]: string })[idField] ===
              action.id
          );
          if (index !== -1) {
            result.splice(index, 1);
          }
          break;
        }
      }
    });

    return result;
  }, [actualValue]) satisfies OptimisticArray<ArrayValue> | undefined;

  useEffect(() => {}, [optimisticValue]);

  return [optimisticValue, doAction]; // Return the optimistic value and action function
}
