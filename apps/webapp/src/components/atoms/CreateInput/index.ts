/**
 * CreateInput Component
 *
 * A consistent, reusable input component for creating new items (goals, tasks, etc).
 * Provides a unified design with better mobile visibility and consistent keyboard shortcuts.
 *
 * ## Features
 *
 * - Consistent styling across all create inputs
 * - Better visibility on mobile devices (subtle background + visible border)
 * - Keyboard shortcuts: Enter to submit, Escape to clear
 * - Customizable icon (defaults to Plus)
 * - Proper touch target size (36px height)
 * - Smooth hover and focus states
 *
 * ## Usage
 *
 * ### Basic Usage
 * ```tsx
 * import { CreateInputView } from '@/components/atoms/CreateInput';
 *
 * function MyComponent() {
 *   const [value, setValue] = useState('');
 *
 *   return (
 *     <CreateInputView
 *       placeholder="Add a new item..."
 *       value={value}
 *       onChange={setValue}
 *       onSubmit={() => {
 *         if (value.trim()) {
 *           // Handle creation
 *           setValue('');
 *         }
 *       }}
 *     />
 *   );
 * }
 * ```
 *
 * ### With Custom Icon
 * ```tsx
 * import { Star } from 'lucide-react';
 *
 * <CreateInputView
 *   placeholder="Add a starred item..."
 *   value={value}
 *   onChange={setValue}
 *   onSubmit={handleSubmit}
 *   icon={<Star className="h-3.5 w-3.5" />}
 * />
 * ```
 */

export { CreateInputView, type CreateInputViewProps } from './view';
