'use strict';
/**
 * Base class for expected failures — bad input, missing resources, auth,
 * conflicts, etc. — as opposed to programming errors (bugs, unhandled
 * exceptions), which are NOT instances of this class and are always
 * reported to the client as a generic 500.
 */
class GasError extends Error {
  constructor(message, options = {}) {
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
  static handle(err, options = {}) {
    const {
      logger = console,
      method = 'unknown',
      path = 'unknown',
      sessionId,
      rethrow = true,
    } = options;
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const isGasError = err instanceof GasError;
    const statusCode = isGasError ? err.statusCode : 500;
    const code = isGasError ? err.code : 'INTERNAL_ERROR';
    // Resolve session ID. A string is used as-is; otherwise a resolver (the
    // given function, or the active user's email) runs lazily. One that throws
    // (e.g. a declined OAuth scope) logs 'disabled'; an empty value 'unknown'.
    let resolvedSessionId;
    if (typeof sessionId === 'string' && sessionId) {
      resolvedSessionId = sessionId;
    } else {
      const resolver =
        typeof sessionId === 'function'
          ? sessionId
          : () => Session.getActiveUser().getEmail();
      try {
        resolvedSessionId = resolver();
      } catch {
        resolvedSessionId = 'disabled';
      }
    }
    resolvedSessionId || (resolvedSessionId = 'unknown');
    const logPayload = {
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
    const safePayload = {
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
  constructor(message = 'Invalid request', details) {
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
  constructor(message = 'Too many requests', retryAfterSeconds) {
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
  constructor(message = 'Captcha verification required', details) {
    super(message, { statusCode: 400, code: 'CAPTCHA_REQUIRED', details });
  }
}
