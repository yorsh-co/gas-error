/**
 * Request context and behavior flags accepted by `GasError.handle`.
 * Every field is optional — the context fields only enrich the log entry.
 */
interface GasErrorHandlerOptions {
  /** If left blank, defaults to console.error(...) */
  logger?: GasLogger | typeof console;

  /** HTTP method of the request being handled. Defaults to `'unknown'`. */
  method?: string;

  /** Route or entry point being handled. Defaults to `'unknown'`. */
  path?: string;

  /** Who the request belongs to. Defaults to the active user's email. */
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

/**
 * Client-facing error envelope. Returned by `GasError.handle` when
 * `rethrow` is false, otherwise `JSON.stringify`'d into the thrown error's
 * `message`. Carries no stack or internal detail — safe to send as-is.
 */
interface GasErrorSafePayload {
  ok: boolean;
  error: string;
  status: number;
  code: GasErrorCode;
  details?: unknown;
}

/**
 * Stable, machine-readable error identifier. Reaches the client as the
 * envelope's `code` — branch on this rather than on the human-readable
 * `error` message.
 */
type GasErrorCode =
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'CAPTCHA_REQUIRED';

/**
 * Second argument to the `GasError` constructor. Only needed when throwing
 * `GasError` directly — the built-in subclasses set these.
 */
interface GasErrorOptions {
  /** Defaults to 500. */
  statusCode?: number;

  /** Defaults to `'INTERNAL_ERROR'`. */
  code?: GasErrorCode;

  /** Arbitrary context attached to the error and echoed to the client. */
  details?: unknown;
}
