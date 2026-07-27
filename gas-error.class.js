'use strict';
/**
 * Base class for operational errors — expected failures from bad input,
 * missing resources, auth, conflicts, etc. — as opposed to programming
 * errors (bugs, unhandled exceptions), which are NOT instances of this
 * class and are always reported to the client as a generic 500.
 */
class GasError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'INTERNAL_ERROR';
    this.details = options.details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
class ValidationError extends GasError {
  constructor(message = 'Invalid request', details) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', details });
  }
}
class NotFoundError extends GasError {
  constructor(message = 'Resource not found') {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}
class UnauthorizedError extends GasError {
  constructor(message = 'Unauthorized') {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }
}
class ForbiddenError extends GasError {
  constructor(message = 'Forbidden') {
    super(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}
class ConflictError extends GasError {
  constructor(message = 'Conflict') {
    super(message, { statusCode: 409, code: 'CONFLICT' });
  }
}
class RateLimitError extends GasError {
  constructor(message = 'Too many requests', retryAfterSeconds) {
    super(message, {
      statusCode: 429,
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds },
    });
  }
}
class CaptchaRequiredError extends GasError {
  constructor(message = 'Captcha verification required', details) {
    super(message, { statusCode: 400, code: 'CAPTCHA_REQUIRED', details });
  }
}
