type TestSpreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

/** Sheet columns are timestamp, level, message, meta_json. */
const META_COLUMN = 4;

type CapturedEntry = {
  level: 'warn' | 'error';
  msg: string;
  meta: Record<string, unknown> | undefined;
};

/** Logger that records every entry instead of writing it anywhere. */
const capturingLogger = () => {
  const entries: CapturedEntry[] = [];
  return {
    entries,
    logger: {
      warn(msg: string, meta?: Record<string, unknown>): void {
        entries.push({ level: 'warn', msg, meta });
      },
      error(msg: string, meta?: Record<string, unknown>): void {
        entries.push({ level: 'error', msg, meta });
      },
    },
  };
};

/** Creates an unbuffered logger writing to `sheetName` in the test spreadsheet. */
const newSheetLogger = (
  spreadsheet: TestSpreadsheet,
  sheetName: string,
): GasLogger => new GasLogger({ sheetConfig: { spreadsheet, sheetName } });

/** The first data row of `sheetName`, with its meta column JSON-parsed. */
const firstRow = (
  spreadsheet: TestSpreadsheet,
  sheetName: string,
): { level: unknown; message: unknown; meta: Record<string, unknown> } => {
  const sheet = spreadsheet.getSheetByName(sheetName);
  assert(sheet !== null, `sheet "${sheetName}" should exist`);
  assert(sheet.getLastRow() === 2, 'expected the header and one data row');
  const [, level, message, meta] = sheet
    .getRange(2, 1, 1, META_COLUMN)
    .getValues()[0] as [unknown, unknown, unknown, string];
  return {
    level,
    message,
    meta: JSON.parse(meta) as Record<string, unknown>,
  };
};

test('stack and names', () => {
  assert(
    typeof Error.captureStackTrace === 'function',
    'Error.captureStackTrace should exist',
  );

  const error = new GasNotFoundError('missing');
  assert(
    error.name === 'GasNotFoundError',
    `unexpected name ${JSON.stringify(error.name)}`,
  );
  assert(
    typeof error.stack === 'string' &&
      error.stack.startsWith('GasNotFoundError: missing'),
    `unexpected stack ${JSON.stringify(error.stack)}`,
  );
  assert(error instanceof GasError, 'should be instanceof GasError');
  assert(error instanceof Error, 'should be instanceof Error');
});

/**
 * What `Session.getActiveUser().getEmail()` does in this execution. It depends
 * on the context (e.g. it can return the email under `clasp run` even when the
 * manifest omits `userinfo.email`), so the result is observed, not assumed.
 */
const activeUserLookup = ():
  { kind: 'threw'; message: string } | { kind: 'returned'; email: string } => {
  try {
    return { kind: 'returned', email: Session.getActiveUser().getEmail() };
  } catch (error) {
    return {
      kind: 'threw',
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

test('sessionId follows the active-user lookup', () => {
  const lookup = activeUserLookup();
  const expected =
    lookup.kind === 'threw' ? 'disabled' : lookup.email || 'unknown';
  const { entries, logger } = capturingLogger();

  GasError.handle(new GasNotFoundError('x'), { logger, rethrow: false });

  assert(entries.length === 1, `expected one entry, got ${entries.length}`);
  assert(
    entries[0]?.meta?.sessionId === expected,
    `sessionId does not match the ${lookup.kind} lookup`,
  );
});

info('active-user lookup', () => {
  const lookup = activeUserLookup();
  if (lookup.kind === 'threw') return `threw: ${lookup.message}`;
  return lookup.email ? 'returned an email' : 'returned an empty string';
});

test('rethrow envelope', () => {
  const { logger } = capturingLogger();
  let thrown: unknown;

  try {
    GasError.handle(new GasValidationError('bad', { field: 'x' }), { logger });
  } catch (error) {
    thrown = error;
  }

  assert(thrown instanceof Error, 'handle() should throw an Error');
  const expected = {
    ok: false,
    error: 'bad',
    status: 400,
    code: 'VALIDATION_ERROR',
    details: { field: 'x' },
  };
  assert(
    thrown.message === JSON.stringify(expected),
    `unexpected envelope ${thrown.message}`,
  );
});

test('expected error to a GasLogger sheet', ({ prefix, spreadsheet }) => {
  const name = `${prefix}expected`;

  GasError.handle(new GasNotFoundError('missing'), {
    logger: newSheetLogger(spreadsheet, name),
    method: 'GET',
    path: '/items/1',
    sessionId: 's1',
    rethrow: false,
  });

  const { level, message, meta } = firstRow(spreadsheet, name);
  assert(level === 'warn', `unexpected level ${JSON.stringify(level)}`);
  assert(
    message === 'Request error',
    `unexpected message ${JSON.stringify(message)}`,
  );
  assert(meta.statusCode === 404, `unexpected statusCode ${meta.statusCode}`);
  assert(meta.code === 'NOT_FOUND', `unexpected code ${meta.code}`);
  assert(meta.method === 'GET', `unexpected method ${meta.method}`);
  assert(meta.path === '/items/1', `unexpected path ${meta.path}`);
  assert(meta.sessionId === 's1', `unexpected sessionId ${meta.sessionId}`);
  assert(meta.stack === undefined, 'expected errors should not log a stack');
});

test('unexpected error to a GasLogger sheet', ({ prefix, spreadsheet }) => {
  const name = `${prefix}unexpected`;

  const payload = GasError.handle(new TypeError('boom'), {
    logger: newSheetLogger(spreadsheet, name),
    method: 'POST',
    path: '/items',
    sessionId: 's2',
    rethrow: false,
  });

  assert(
    payload.error === 'Internal server error',
    `unexpected payload error ${payload.error}`,
  );
  assert(payload.status === 500, `unexpected payload status ${payload.status}`);

  const { level, message, meta } = firstRow(spreadsheet, name);
  assert(level === 'error', `unexpected level ${JSON.stringify(level)}`);
  assert(
    message === 'Unexpected error',
    `unexpected message ${JSON.stringify(message)}`,
  );
  assert(meta.statusCode === 500, `unexpected statusCode ${meta.statusCode}`);
  assert(
    meta.code === 'INTERNAL_ERROR',
    `unexpected code ${JSON.stringify(meta.code)}`,
  );
  assert(
    typeof meta.stack === 'string' && meta.stack.includes('boom'),
    `unexpected stack ${JSON.stringify(meta.stack)}`,
  );
});
