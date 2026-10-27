/**
 * Known defects, recorded as expected failures (`it.fails`). Each test
 * asserts the CORRECT behaviour; once a defect is fixed, the test passes,
 * `it.fails` turns red, and the `.fails` is removed so it becomes a
 * regular regression test.
 */
import { describe, expect, it } from 'vitest';
import { loadGasError } from './harness';

describe('handle() with a nullish error', () => {
  it.fails.each([[null], [undefined]])(
    'returns the safe 500 payload for %s',
    (value) => {
      const { classes, mocks } = loadGasError();

      const payload = classes.GasError.handle(value, {
        logger: mocks.logger,
        rethrow: false,
      });

      expect(payload).toMatchObject({
        ok: false,
        status: 500,
        code: 'INTERNAL_ERROR',
      });
    },
  );
});

describe('handle() with a thrown string', () => {
  it.fails('logs the string as the message', () => {
    const { classes, mocks } = loadGasError();

    classes.GasError.handle('boom', { logger: mocks.logger, rethrow: false });

    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Unexpected error',
      expect.objectContaining({ message: 'boom' }),
    );
  });
});

describe('falsy details', () => {
  it.fails.each([[0], [''], [false]])(
    'keeps details of %j in the safe payload',
    (details) => {
      const { classes, mocks } = loadGasError();

      const payload = classes.GasError.handle(
        new classes.GasError('x', { statusCode: 400, details }),
        { logger: mocks.logger, rethrow: false },
      );

      expect(payload).toHaveProperty('details', details);
    },
  );
});

describe('GasRateLimitError without retryAfterSeconds', () => {
  it.fails('omits details from the payload', () => {
    const { classes, mocks } = loadGasError();

    const payload = classes.GasError.handle(new classes.GasRateLimitError(), {
      logger: mocks.logger,
      rethrow: false,
    });

    expect(payload).not.toHaveProperty('details');
  });
});

describe('GasError with a custom statusCode and no code', () => {
  it.fails('derives the code from the status', () => {
    const { classes } = loadGasError();

    expect(new classes.GasError('x', { statusCode: 404 }).code).toBe(
      'NOT_FOUND',
    );
  });
});
