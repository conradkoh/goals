import { type ErrorData, errorDataSchema } from '@workspace/backend/errors';
import { ConvexError } from 'convex/values';

/**
 * Parses an error caught from a Convex mutation into a structured ErrorData object.
 * If the error is not a ConvexError or fails validation, returns an UNEXPECTED_ERROR.
 */
export function parseConvexError(error: unknown): ErrorData {
  if (error instanceof ConvexError) {
    try {
      return errorDataSchema.parse(error.data);
    } catch {
      // If validation fails, return a generic error
      return {
        code: 'UNEXPECTED_ERROR',
        message: 'An unexpected error occurred',
      };
    }
  }

  // For non-Convex errors (e.g., network issues)
  return {
    code: 'UNEXPECTED_ERROR',
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
  };
}

export { type ErrorData, errorTitles } from '@workspace/backend/errors';
