/**
 * Base class for operational errors — expected failures from bad input,
 * missing resources, auth, conflicts, etc. — as opposed to programming
 * errors (bugs, unhandled exceptions), which are NOT instances of this
 * class and are always reported to the client as a generic 500.
 */
declare class GasError extends Error {
  statusCode: number;
  code: GasErrorCode;
  details: unknown;
  isOperational: true;
  constructor(message: string, options?: GasErrorOptions);
}
declare class ValidationError extends GasError {
  constructor(message?: string, details?: string);
}
declare class NotFoundError extends GasError {
  constructor(message?: string);
}
declare class UnauthorizedError extends GasError {
  constructor(message?: string);
}
declare class ForbiddenError extends GasError {
  constructor(message?: string);
}
declare class ConflictError extends GasError {
  constructor(message?: string);
}
declare class RateLimitError extends GasError {
  constructor(message?: string, retryAfterSeconds?: number);
}
declare class CaptchaRequiredError extends GasError {
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
