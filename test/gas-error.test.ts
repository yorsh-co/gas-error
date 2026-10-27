import { describe, expect, it } from 'vitest';
import { loadGasError, type GasErrorPayload } from './harness';

describe('GasError', () => {
  it('applies defaults', () => {
    const { classes } = loadGasError();
    const err = new classes.GasError('boom');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(classes.GasError);
    expect(err.message).toBe('boom');
    expect(err.name).toBe('GasError');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err.details).toBeUndefined();
    expect(err.stack).toContain('boom');
  });

  it('accepts statusCode, code and details', () => {
    const { classes } = loadGasError();
    const err = new classes.GasError('x', {
      statusCode: 418,
      code: 'CONFLICT',
      details: { a: 1 },
    });

    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('CONFLICT');
    expect(err.details).toEqual({ a: 1 });
  });

  it.each([
    [400, 'VALIDATION_ERROR'],
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [429, 'RATE_LIMITED'],
  ])('derives the code from status %i', (statusCode, code) => {
    const { classes } = loadGasError();

    expect(new classes.GasError('x', { statusCode }).code).toBe(code);
  });

  it.each([[418], [503]])(
    'falls back to INTERNAL_ERROR for unmapped status %i',
    (statusCode) => {
      const { classes } = loadGasError();

      expect(new classes.GasError('x', { statusCode }).code).toBe(
        'INTERNAL_ERROR',
      );
    },
  );

  it('lets an explicit code override the derived one', () => {
    const { classes } = loadGasError();

    expect(
      new classes.GasError('x', { statusCode: 404, code: 'CONFLICT' }).code,
    ).toBe('CONFLICT');
  });
});

describe('subclasses', () => {
  const cases = [
    ['GasValidationError', 400, 'VALIDATION_ERROR', 'Invalid request'],
    ['GasUnauthorizedError', 401, 'UNAUTHORIZED', 'Unauthorized'],
    ['GasForbiddenError', 403, 'FORBIDDEN', 'Forbidden'],
    ['GasNotFoundError', 404, 'NOT_FOUND', 'Resource not found'],
    ['GasConflictError', 409, 'CONFLICT', 'Conflict'],
    ['GasRateLimitError', 429, 'RATE_LIMITED', 'Too many requests'],
    [
      'GasCaptchaRequiredError',
      400,
      'CAPTCHA_REQUIRED',
      'Captcha verification required',
    ],
  ] as const;

  it.each(cases)('%s', (name, statusCode, code, message) => {
    const { classes } = loadGasError();
    const Subclass = classes[name];
    const err = new Subclass();

    expect(err).toBeInstanceOf(classes.GasError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe(name);
    expect(err.statusCode).toBe(statusCode);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
    expect(err.isOperational).toBe(true);
  });

  it('uses a custom message', () => {
    const { classes } = loadGasError();
    expect(new classes.GasNotFoundError('No such user').message).toBe(
      'No such user',
    );
  });

  it('GasValidationError carries details', () => {
    const { classes } = loadGasError();
    expect(new classes.GasValidationError('Bad', 'field').details).toBe(
      'field',
    );
  });

  it('GasRateLimitError carries retryAfterSeconds', () => {
    const { classes } = loadGasError();
    expect(new classes.GasRateLimitError('Slow down', 30).details).toEqual({
      retryAfterSeconds: 30,
    });
  });

  it('GasRateLimitError has no details without retryAfterSeconds', () => {
    const { classes, mocks } = loadGasError();
    const err = new classes.GasRateLimitError();

    expect(err.details).toBeUndefined();
    expect(
      classes.GasError.handle(err, { logger: mocks.logger, rethrow: false }),
    ).not.toHaveProperty('details');
  });

  it('GasValidationError carries object details into the payload', () => {
    const { classes, mocks } = loadGasError();
    const payload = classes.GasError.handle(
      new classes.GasValidationError('Bad', { field: 'email' }),
      { logger: mocks.logger, rethrow: false },
    );

    expect(payload.details).toEqual({ field: 'email' });
  });

  it('GasCaptchaRequiredError carries details', () => {
    const { classes } = loadGasError();
    expect(
      new classes.GasCaptchaRequiredError('Solve it', { site: 'k' }).details,
    ).toEqual({ site: 'k' });
  });
});

describe('GasError.handle', () => {
  it('logs a client error at warn and returns the safe payload', () => {
    const { classes, mocks } = loadGasError();
    const err = new classes.GasNotFoundError('No such user');

    const payload = classes.GasError.handle(err, {
      logger: mocks.logger,
      method: 'GET',
      path: '/users/1',
      sessionId: 'abc',
      rethrow: false,
    });

    expect(mocks.logger.error).not.toHaveBeenCalled();
    expect(mocks.logger.warn).toHaveBeenCalledExactlyOnceWith('Request error', {
      method: 'GET',
      path: '/users/1',
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'No such user',
      sessionId: 'abc',
    });
    expect(payload).toEqual({
      ok: false,
      error: 'No such user',
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('includes details in the payload', () => {
    const { classes, mocks } = loadGasError();
    const payload = classes.GasError.handle(
      new classes.GasValidationError('Bad', 'email'),
      { logger: mocks.logger, rethrow: false },
    );

    expect(payload.details).toBe('email');
  });

  it('logs a GasError with status 500 at error', () => {
    const { classes, mocks } = loadGasError();
    const err = new classes.GasError('db down');

    const payload = classes.GasError.handle(err, {
      logger: mocks.logger,
      rethrow: false,
    });

    expect(mocks.logger.warn).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Unexpected error',
      expect.objectContaining({ statusCode: 500, stack: err.stack }),
    );
    expect(payload).toMatchObject({ error: 'db down', status: 500 });
  });

  it('logs a non-GasError at error and hides the message from the client', () => {
    const { classes, mocks } = loadGasError();
    const err = new Error('secret internals');

    const payload = classes.GasError.handle(err, {
      logger: mocks.logger,
      method: 'POST',
      path: '/x',
      sessionId: 's',
      rethrow: false,
    });

    expect(mocks.logger.warn).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledExactlyOnceWith(
      'Unexpected error',
      {
        method: 'POST',
        path: '/x',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'secret internals',
        sessionId: 's',
        stack: err.stack,
      },
    );
    expect(payload).toEqual({
      ok: false,
      error: 'Internal server error',
      status: 500,
      code: 'INTERNAL_ERROR',
    });
  });

  it.each([[null], [undefined]])(
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

  it('logs a thrown string as the message', () => {
    const { classes, mocks } = loadGasError();

    classes.GasError.handle('boom', { logger: mocks.logger, rethrow: false });

    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Unexpected error',
      expect.objectContaining({ message: 'boom' }),
    );
  });

  it.each([
    [{ a: 1 }, '[object Object]'],
    [42, '42'],
  ])('reports a thrown %j as a safe 500', (value, message) => {
    const { classes, mocks } = loadGasError();

    const payload = classes.GasError.handle(value, {
      logger: mocks.logger,
      rethrow: false,
    });

    expect(mocks.logger.warn).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Unexpected error',
      expect.objectContaining({ statusCode: 500, message }),
    );
    expect(payload).toEqual({
      ok: false,
      error: 'Internal server error',
      status: 500,
      code: 'INTERNAL_ERROR',
    });
  });

  it.each([[0], [''], [false]])(
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

  it('rethrows an Error with the JSON payload for a non-Error input', () => {
    const { classes, mocks } = loadGasError();

    let thrown: unknown;
    try {
      classes.GasError.handle('boom', { logger: mocks.logger });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(JSON.parse((thrown as Error).message)).toEqual({
      ok: false,
      error: 'Internal server error',
      status: 500,
      code: 'INTERNAL_ERROR',
    } satisfies GasErrorPayload);
  });

  it('rethrows an Error whose message is the JSON payload by default', () => {
    const { classes, mocks } = loadGasError();
    const err = new classes.GasForbiddenError();

    let thrown: unknown;
    try {
      classes.GasError.handle(err, { logger: mocks.logger });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(JSON.parse((thrown as Error).message)).toEqual({
      ok: false,
      error: 'Forbidden',
      status: 403,
      code: 'FORBIDDEN',
    } satisfies GasErrorPayload);
  });

  it('returns the payload instead of throwing with rethrow: false', () => {
    const { classes, mocks } = loadGasError();

    expect(() =>
      classes.GasError.handle(new classes.GasConflictError(), {
        logger: mocks.logger,
        rethrow: false,
      }),
    ).not.toThrow();
  });

  it("defaults method and path to 'unknown'", () => {
    const { classes, mocks } = loadGasError();
    classes.GasError.handle(new classes.GasNotFoundError(), {
      logger: mocks.logger,
      rethrow: false,
    });

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      'Request error',
      expect.objectContaining({ method: 'unknown', path: 'unknown' }),
    );
  });

  it('defaults the logger to console', () => {
    const { classes, mocks } = loadGasError();

    classes.GasError.handle(new classes.GasNotFoundError(), {
      rethrow: false,
    });
    classes.GasError.handle(new Error('x'), { rethrow: false });

    expect(mocks.console.warn).toHaveBeenCalledOnce();
    expect(mocks.console.error).toHaveBeenCalledOnce();
  });

  describe('sessionId', () => {
    function resolve(
      setup: (mocks: ReturnType<typeof loadGasError>['mocks']) => void,
      sessionId?: string,
    ): unknown {
      const { classes, mocks } = loadGasError();
      setup(mocks);
      classes.GasError.handle(new classes.GasNotFoundError(), {
        logger: mocks.logger,
        rethrow: false,
        ...(sessionId === undefined ? {} : { sessionId }),
      });
      const [, meta] = mocks.logger.warn.mock.calls[0] as [
        string,
        { sessionId: string },
      ];
      return meta.sessionId;
    }

    it('uses the explicit value without a Session lookup', () => {
      const { classes, mocks } = loadGasError();
      classes.GasError.handle(new classes.GasNotFoundError(), {
        logger: mocks.logger,
        sessionId: 'explicit',
        rethrow: false,
      });

      expect(mocks.Session.getActiveUser).not.toHaveBeenCalled();
      expect(mocks.logger.warn).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({ sessionId: 'explicit' }),
      );
    });

    it('falls back to the active user email', () => {
      expect(resolve(() => undefined)).toBe('user@example.com');
    });

    it("is 'unknown' when the email is empty", () => {
      expect(resolve((m) => m.getEmail.mockReturnValue(''))).toBe('unknown');
    });

    it("is 'disabled' when Session throws", () => {
      expect(
        resolve((m) =>
          m.getEmail.mockImplementation(() => {
            throw new Error('Missing scope');
          }),
        ),
      ).toBe('disabled');
    });
  });
});
