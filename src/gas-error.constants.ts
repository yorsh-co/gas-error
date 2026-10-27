/* Error code derived from `statusCode` when `GasErrorOptions.code` is omitted */
const GAS_ERROR_STATUS_CODES: Partial<Record<number, GasErrorCode>> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};
