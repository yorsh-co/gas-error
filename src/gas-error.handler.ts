/**
 * Central JSON error handler.
 *
 * GasError instances are operational: logged at warn, and their
 * message/code/details are safe to send to the client as-is.
 * Anything else is unexpected: logged at error with the full stack,
 * and reported to the client as a generic 500 with no internal detail.
 */
const errorHandler = (
  err: Error | GasError,
  options: GasErrorHandlerOptions = {},
): GasErrorSafePayload => {
  const {
    logger = console,
    method = 'unknown',
    path = 'unknown',
    session = Session.getActiveUser()?.getEmail() || 'unknown',
    rethrow = true,
  } = options;

  const isGasError = err instanceof GasError;
  const statusCode = isGasError ? err.statusCode : 500;

  const code: GasErrorCode = isGasError ? err.code : 'INTERNAL_ERROR';

  const logPayload = {
    method,
    path,
    statusCode,
    code,
    message: err.message,
    session,
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
};
