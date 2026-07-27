/**
 * Central JSON error handler.
 *
 * GasError instances are operational: logged at warn, and their
 * message/code/details are safe to send to the client as-is.
 * Anything else is unexpected: logged at error with the full stack,
 * and reported to the client as a generic 500 with no internal detail.
 */
declare const errorHandler: (
  err: Error | GasError,
  options?: GasErrorHandlerOptions,
) => GasErrorSafePayload;
