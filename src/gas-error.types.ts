interface GasErrorHandlerOptions {
  /** If left blank, defaults to console.error(...) */
  logger?: GasLogger | typeof console;
  method?: string;
  path?: string;
  sessionId?: string;

  /** Set to false to return the safe error payload. Defaults to true. */
  rethrow?: boolean;
}

/**
 * Shape of the `meta` object `GasError.handle` passes to the logger.
 */
type GasErrorLogPayload = {
  method: string;
  path: string;
  statusCode: number;
  code: GasErrorCode;
  message: string;
  sessionId: string;
};

interface GasErrorSafePayload {
  ok: boolean;
  error: string;
  status: number;
  code: GasErrorCode;
  details?: unknown;
}

type GasErrorCode =
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'CAPTCHA_REQUIRED';

interface GasErrorOptions {
  statusCode?: number;
  code?: GasErrorCode;
  details?: unknown;
}
