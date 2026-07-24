interface GasErrorHandlerOptions {
  /** If left blank, defaults to console.error(...) */
  logger?: GasLogger | typeof console;
  method?: string;
  path?: string;
  session?: string;
}

interface GasErrorPayload {
  method: string;
  path: string;
  statusCode: number;
  code: GasErrorCode;
  message: string;
  session: string;
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
