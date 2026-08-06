/**
 * Ambient declarations for gas-error, consumed as a peer subtree package.
 *
 * gas-error is expected as a runtime global (Apps Script has no module
 * system); this file declares its public surface so a consuming package can
 * typecheck standalone via `tsc --noEmit` without vendoring the source.
 *
 * Canonical copy: gas-error/peer/gas-error.peer.types.d.ts. Do not edit
 * downstream copies — update the canonical file and re-copy, so every peer
 * stays in step with the published surface.
 *
 * Being a `.d.ts`, this file is type-only: it matches a consumer's
 * `include: ["src/**\/*.ts"]` but emits nothing, so no counterpart reaches
 * dist/ or the published package.
 *
 * Usage: copy into the consuming package as `src/internal/`.
 *
 * @see https://github.com/yorsh-co/gas-error
 * @version 1.0.0
 */

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
 * Sink `GasError.handle` logs through. Only `warn` and `error` are called,
 * so `console`, a `GasLogger`, or any object exposing those two methods
 * satisfies it.
 *
 * gas-error's own type is `GasLogger | typeof console`. This peer file
 * declares the structural minimum instead, so it resolves on its own —
 * a consumer that uses gas-error without gas-logger has no `GasLogger`
 * declaration to reference.
 */
interface GasErrorLogger {
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

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

/**
 * Request context and behavior flags accepted by `GasError.handle`.
 * Every field is optional — the context fields only enrich the log entry.
 */
interface GasErrorHandlerOptions {
  /** If left blank, defaults to console.error(...) */
  logger?: GasErrorLogger;

  /** HTTP method of the request being handled. Defaults to `'unknown'`. */
  method?: string;

  /** Route or entry point being handled. Defaults to `'unknown'`. */
  path?: string;

  /**
   * Who the request belongs to. Falls back to the active user's email,
   * which requires the `https://www.googleapis.com/auth/userinfo.email`
   * scope — without it the value logs as `'unknown'` or `'disabled'`.
   */
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
 * Base class for expected failures — bad input, missing resources, auth,
 * conflicts, etc. — as opposed to programming errors (bugs, unhandled
 * exceptions), which are NOT instances of this class and are always
 * reported to the client as a generic 500.
 */
declare class GasError extends Error {
  statusCode: number;
  code: GasErrorCode;
  details: unknown;
  isOperational: true;

  constructor(message: string, options?: GasErrorOptions);

  /**
   * Central JSON error handler.
   *
   * GasError instances are expected: logged at warn, and their
   * message/code/details are safe to send to the client as-is.
   * Anything else is unexpected: logged at error with the full stack,
   * and reported to the client as a generic 500 with no internal detail.
   *
   * Throws the stringified envelope unless `rethrow` is false.
   */
  static handle(
    err: Error | GasError,
    options?: GasErrorHandlerOptions,
  ): GasErrorSafePayload;
}

/** 400 / `'VALIDATION_ERROR'`. */
declare class GasValidationError extends GasError {
  constructor(message?: string, details?: string);
}

/** 404 / `'NOT_FOUND'`. */
declare class GasNotFoundError extends GasError {
  constructor(message?: string);
}

/** 401 / `'UNAUTHORIZED'`. */
declare class GasUnauthorizedError extends GasError {
  constructor(message?: string);
}

/** 403 / `'FORBIDDEN'`. */
declare class GasForbiddenError extends GasError {
  constructor(message?: string);
}

/** 409 / `'CONFLICT'`. */
declare class GasConflictError extends GasError {
  constructor(message?: string);
}

/** 429 / `'RATE_LIMITED'`. Sets `details` to `{ retryAfterSeconds }`. */
declare class GasRateLimitError extends GasError {
  constructor(message?: string, retryAfterSeconds?: number);
}

/** 400 / `'CAPTCHA_REQUIRED'`. */
declare class GasCaptchaRequiredError extends GasError {
  constructor(message?: string, details?: unknown);
}
