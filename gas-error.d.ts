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
   */
  static handle(
    err: Error | GasError,
    options?: GasErrorHandlerOptions,
  ): GasErrorSafePayload;
}
declare class GasValidationError extends GasError {
  constructor(message?: string, details?: string);
}
declare class GasNotFoundError extends GasError {
  constructor(message?: string);
}
declare class GasUnauthorizedError extends GasError {
  constructor(message?: string);
}
declare class GasForbiddenError extends GasError {
  constructor(message?: string);
}
declare class GasConflictError extends GasError {
  constructor(message?: string);
}
declare class GasRateLimitError extends GasError {
  constructor(message?: string, retryAfterSeconds?: number);
}
declare class GasCaptchaRequiredError extends GasError {
  constructor(message?: string, details?: unknown);
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
