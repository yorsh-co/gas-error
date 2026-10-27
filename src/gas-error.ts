/**
 * Base class for expected failures — bad input, missing resources, auth,
 * conflicts, etc. — as opposed to programming errors (bugs, unhandled
 * exceptions), which are NOT instances of this class and are always
 * reported to the client as a generic 500.
 */
class GasError extends Error {
  statusCode: number;
  code: GasErrorCode;
  details: unknown;
  isOperational: true;

  constructor(message: string, options: GasErrorOptions = {}) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code =
      options.code ||
      GAS_ERROR_STATUS_CODES[this.statusCode] ||
      'INTERNAL_ERROR';
    this.details = options.details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Central JSON error handler.
   *
   * Accepts any thrown value: an `Error` is used as-is, anything else is
   * treated as an unexpected error whose message is `String(err)` and which
   * has no stack.
   *
   * GasError instances are expected: logged at warn, and their
   * message/code/details are safe to send to the client as-is.
   * Anything else is unexpected: logged at error with the full stack,
   * and reported to the client as a generic 500 with no internal detail.
   *
   * Throws the stringified envelope unless `rethrow` is false.
   */
  static handle(
    err: unknown,
    options: GasErrorHandlerOptions & { rethrow: false },
  ): GasErrorSafePayload;
  static handle(
    err: unknown,
    options?: GasErrorHandlerOptions & { rethrow?: true },
  ): never;
  static handle(
    err: unknown,
    options?: GasErrorHandlerOptions,
  ): GasErrorSafePayload;
  static handle(
    err: unknown,
    options: GasErrorHandlerOptions = {},
  ): GasErrorSafePayload {
    const {
      logger = console,
      method = 'unknown',
      path = 'unknown',
      sessionId = null,
      rethrow = true,
    } = options;

    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    const isGasError = err instanceof GasError;
    const statusCode = isGasError ? err.statusCode : 500;

    const code: GasErrorCode = isGasError ? err.code : 'INTERNAL_ERROR';

    // Resolve session ID.
    // Handles cases the required scope for `Session.getActiveUser`
    // has not been provided.
    let resolvedSessionId = sessionId;
    if (!resolvedSessionId) {
      try {
        resolvedSessionId = Session.getActiveUser()?.getEmail() || 'unknown';
      } catch {
        resolvedSessionId = 'disabled';
      }
    }

    const logPayload: GasErrorLogPayload = {
      method,
      path,
      statusCode,
      code,
      message,
      sessionId: resolvedSessionId,
    };

    if (isGasError && statusCode < 500) {
      logger.warn('Request error', logPayload);
    } else {
      logger.error('Unexpected error', { ...logPayload, stack });
    }

    const safePayload: GasErrorSafePayload = {
      ok: false,
      error: isGasError ? message : 'Internal server error',
      status: statusCode,
      code,
      ...(isGasError && err.details !== undefined
        ? { details: err.details }
        : {}),
    };

    if (rethrow) {
      throw new Error(JSON.stringify(safePayload));
    } else {
      return safePayload;
    }
  }
}

class GasValidationError extends GasError {
  constructor(message = 'Invalid request', details?: unknown) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', details });
  }
}

class GasNotFoundError extends GasError {
  constructor(message = 'Resource not found') {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

class GasUnauthorizedError extends GasError {
  constructor(message = 'Unauthorized') {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }
}

class GasForbiddenError extends GasError {
  constructor(message = 'Forbidden') {
    super(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}

class GasConflictError extends GasError {
  constructor(message = 'Conflict') {
    super(message, { statusCode: 409, code: 'CONFLICT' });
  }
}

class GasRateLimitError extends GasError {
  constructor(message = 'Too many requests', retryAfterSeconds?: number) {
    super(message, {
      statusCode: 429,
      code: 'RATE_LIMITED',
      ...(retryAfterSeconds !== undefined
        ? { details: { retryAfterSeconds } }
        : {}),
    });
  }
}

class GasCaptchaRequiredError extends GasError {
  constructor(message = 'Captcha verification required', details?: unknown) {
    super(message, { statusCode: 400, code: 'CAPTCHA_REQUIRED', details });
  }
}

/**
 * V8 engine extension for capturing a stack trace without the constructor
 * frame. Not part of the ECMAScript spec, so absent from lib.es2019 and
 * @types/google-apps-script — declared here since Apps Script runs on V8.
 * Confirmed present at runtime in the GAS sandbox.
 */
declare interface ErrorConstructor {
  captureStackTrace(targetObject: object, constructorOpt?: object): void;
}
