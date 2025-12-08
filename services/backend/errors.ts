import { z } from 'zod';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const errorDataSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'UNAUTHORIZED',
    'CONFLICT',
    'INTERNAL_ERROR',
    'UNEXPECTED_ERROR',
  ]),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorData = z.infer<typeof errorDataSchema>;

export const errorTitles: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Invalid Operation',
  NOT_FOUND: 'Not Found',
  UNAUTHORIZED: 'Access Denied',
  CONFLICT: 'Operation Conflict',
  INTERNAL_ERROR: 'System Error',
  UNEXPECTED_ERROR: 'System Error',
};
