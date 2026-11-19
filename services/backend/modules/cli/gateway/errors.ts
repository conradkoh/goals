import type { CliErrorCode } from '@workspace/shared/utilities/cli-contract';

/**
 * Typed failure raised by gateway ops.
 *
 * `code` and `publicMessage` are authored in the gateway, never derived from
 * request content, so `mapError` can answer without touching a message.
 */
export class CliGatewayError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409,
    readonly code: CliErrorCode,
    readonly publicMessage: string
  ) {
    super(code);
  }
}

/** 404 used for foreign, missing, malformed and wrong-table ids alike. */
export const notFound = (): CliGatewayError => new CliGatewayError(404, 'not_found', 'Not found');

/** 400 raised for a request that is well-formed JSON but semantically invalid. */
export const invalidArgument = (message: string): CliGatewayError =>
  new CliGatewayError(400, 'invalid_argument', message);
