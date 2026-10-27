/**
 * Known defects, recorded as expected failures (`it.fails`). Each test
 * asserts the CORRECT behaviour; once a defect is fixed, the test passes,
 * `it.fails` turns red, and the `.fails` is removed so it becomes a
 * regular regression test.
 */
import { describe, expect, it } from 'vitest';
import { loadGasError } from './harness';

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
