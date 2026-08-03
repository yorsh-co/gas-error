/**
 * Base class for operational errors — expected failures from bad input,
 * missing resources, auth, conflicts, etc. — as opposed to programming
 * errors (bugs, unhandled exceptions), which are NOT instances of this
 * class and are always reported to the client as a generic 500.
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
    this.code = options.code || 'INTERNAL_ERROR';
    this.details = options.details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Central JSON error handler.
   *
   * GasError instances are operational: logged at warn, and their
   * message/code/details are safe to send to the client as-is.
   * Anything else is unexpected: logged at error with the full stack,
   * and reported to the client as a generic 500 with no internal detail.
   */
  static handle(
    err: Error | GasError,
    options: GasErrorHandlerOptions = {},
  ): GasErrorSafePayload {
    const {
      logger = console,
      method = 'unknown',
      path = 'unknown',
      sessionId = Session.getActiveUser()?.getEmail() || 'unknown',
      rethrow = true,
    } = options;

    // Checked against GasError itself, not `this` — the static is inherited,
    // so a call through a subclass must classify errors identically.
    const isGasError = err instanceof GasError;
    const statusCode = isGasError ? err.statusCode : 500;

    const code: GasErrorCode = isGasError ? err.code : 'INTERNAL_ERROR';

    const logPayload = {
      method,
      path,
      statusCode,
      code,
      message: err.message,
      sessionId,
    };

    if (isGasError && statusCode < 500) {
      logger.warn('Request error', logPayload);
    } else {
      logger.error('Unexpected error', { ...logPayload, stack: err.stack });
    }

    const safePayload = {
      ok: false,
      error: isGasError ? err.message : 'Internal server error',
      status: statusCode,
      code,
      ...(isGasError && err.details ? { details: err.details } : {}),
    };

    if (rethrow) {
      throw new Error(JSON.stringify(safePayload));
    } else {
      return safePayload;
    }
  }
}

class GasValidationError extends GasError {
  constructor(message = 'Invalid request', details?: string) {
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
      details: { retryAfterSeconds },
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
