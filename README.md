# gas-error

[![Built with Google Apps Script](https://img.shields.io/badge/Built%20with-Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)

## A centralized JSON error handler for Google Apps Script with Error classes for expected failures.

> [!NOTE]
> The goal of this project is to give Apps Script web apps a single place to define the failures you expect — validation problems, missing resources, auth — and a single handler that logs and serializes them consistently, without leaking internal detail when something unexpected goes wrong.

`gas-error` provides a `GasError` base class plus seven common subclasses (`GasValidationError`, `GasNotFoundError`, `GasUnauthorizedError`, `GasForbiddenError`, `GasConflictError`, `GasRateLimitError`, `GasCaptchaRequiredError`), and a `GasError.handle(err, options)` static that logs the error and, by default, throws a JSON-serializable payload (or returns it with `rethrow: false`) ready to send from your web app's entry point.

> **Disclaimer:**
> This project and [Yorsh](https://github.com/yorsh-co) are independent and are not affiliated with, endorsed by, or associated with Google LLC.

### Features

- `GasError` base class carrying a `statusCode`, a `code` (`GasErrorCode`), and optional `details` — marked `isOperational: true` to distinguish expected failures from programming bugs
- Seven built-in subclasses for common cases: `GasValidationError` (400), `GasUnauthorizedError` (401), `GasForbiddenError` (403), `GasNotFoundError` (404), `GasConflictError` (409), `GasRateLimitError` (429, with a `retryAfterSeconds` detail), `GasCaptchaRequiredError` (400)
- `GasError.handle(err, options)`: logs a `GasError` with `statusCode < 500` at `warn` and one with `statusCode >= 500` at `error` with the stack — either way its message/code/details are safe to send to the client as-is; logs anything else at `error` with the full stack, and reports it to the client as a generic 500 with no internal detail
- Accepts any thrown value (`unknown`): an `Error` is used as-is, anything else is logged as an unexpected error with its `String(...)` form as the message
- Throws a `JSON.stringify`'d payload by default — `{ ok: false, error, status, code, details? }` — so it can be caught once at your entry point and returned as the response
- Configurable `logger` (defaults to `console`, also accepts a `gas-logger` instance or any object with `warn`/`error`) and `sessionId` (a string or a resolver function; defaults to `'unknown'` — the library never looks up the active user, so it adds no [OAuth scope](#oauth-scope))
- Written in TypeScript; ships compiled `.js` plus matching `.d.ts` declarations — no build step required downstream
- Accepts a `gas-logger` instance for structured logging to the Apps Script Execution Log and, optionally, to a log sheet in Google Sheets
- No required runtime dependencies

### Example Usage

```js
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (!body.email) {
      throw new GasValidationError('Missing required field', {
        field: 'email',
      });
    }

    // ...handle the request
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    try {
      GasError.handle(err, { method: 'POST', path: 'doPost' });
    } catch (handled) {
      // GasError.handle throws by default — `handled.message` is the JSON payload
      return ContentService.createTextOutput(handled.message).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }
}
```

## Requirements

> [!IMPORTANT]
> `gas-error` has no runtime dependencies and no required peer packages — `GasError.handle`'s `logger` option defaults to `console`. `logger` is typed structurally (`GasErrorLogger`: any object with `warn` and `error`), so passing a `gas-logger` instance type-checks without `gas-logger`'s declarations being available in your project.

### OAuth scope

`gas-error` requests no OAuth scopes. It never calls `Session`, so including it in a project does not add the `userinfo.email` consent prompt, and no user email is logged by default.

To label log entries with the active user's email, opt in by passing a resolver as `sessionId`:

```js
GasError.handle(err, {
  method: 'POST',
  path: 'doPost',
  sessionId: () => Session.getActiveUser().getEmail(),
});
```

That call lives in your code, so Apps Script infers the scope from your source. You only need to declare it explicitly if your `appsscript.json` pins `oauthScopes`:

```json
{
  "oauthScopes": ["https://www.googleapis.com/auth/userinfo.email"]
}
```

If the resolver throws (for example, the scope is missing), the entry logs as `sessionId: 'disabled'`.

> [!NOTE]
> Even with the scope granted, `getEmail()` returns a blank string when the address isn't available to the script — a consumer Gmail account, or a web app deployed to "anyone" where the caller is outside your domain. That case logs as `sessionId: 'unknown'`. Pass a stable identifier as a string if you need a reliable one in those deployments.

## Quick Start

> [!TIP]
> It is recommended to use `gas-error` together with [Google's `clasp` CLI](https://github.com/google/clasp) for local Apps Script development and git-based workflows. See [Setup instructions with `clasp`](#setup-instructions-with-clasp) for more information.

#### 1. Add the library to your Apps Script project

This repository publishes compiled output on a dedicated `dist` branch — subtree from `dist`, not `main`, so no TypeScript/ESLint tooling lands in your project.

```bash
git subtree add \
  --prefix=src/lib/gas-error \
  https://github.com/yorsh-co/gas-error.git \
  dist \
  --squash
```

This creates:

```txt
src/lib/gas-error/
```

#### 2. Throw and handle an error

```js
function doGet(e) {
  try {
    throw new GasNotFoundError('Record not found');
  } catch (err) {
    const payload = GasError.handle(err, {
      method: 'GET',
      path: 'doGet',
      rethrow: false,
    });
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
      ContentService.MimeType.JSON,
    );
  }
}
```

## Setup instructions with `clasp`

`gas-error` works best with [Google's `clasp` CLI](https://github.com/google/clasp) for local Apps Script development and git-based workflows.

#### 1. Install clasp

```bash
npm install -g @google/clasp
```

#### 2. Enable the [Apps Script API](https://script.google.com/home/usersettings)

#### 3. Login to Google Apps Script

```bash
clasp login
```

#### 4. Clone or create your Apps Script project

Clone an existing project:

```bash
clasp clone <script-id>
```

or create a new one:

```bash
clasp create --type standalone
```

#### 5. Import `gas-error`

```bash
git subtree add \
  --prefix=src/lib/gas-error \
  https://github.com/yorsh-co/gas-error.git \
  dist \
  --squash
```

This creates:

```txt
src/lib/gas-error/
```

#### 6. Configure the file push order

> [!IMPORTANT]
> Apps Script executes files by the order in the Apps Script editor, from top to bottom. By default, `clasp push` orders the files alphabetically, by file name. If a file referencing `GasError` or any of the subclasses is ordered before `gas-error`'s own files, `clasp push` will succeed but running the project will throw:
>
> ```txt
> ReferenceError: GasError is not defined
> ```
>
> To avoid this, add a [`filePushOrder`](https://github.com/google/clasp#filepushorder-optional) entry to your project's `.clasp.json` that pushes `gas-error`'s module files ahead of any file that references them:
>
> ```json
> {
>   "filePushOrder": [
>     "dist/lib/gas-error/gas-error.constants.js",
>     "dist/lib/gas-error/gas-error.js"
>   ]
> }
> ```
>
> Use the path where the files land in your pushed project, e.g. `src/lib/gas-error/...` when pushing the subtree as-is.
>
> Alternatively, you can manually move these files to the top of the file list in the Apps Script editor.

#### 7. Push local files to Apps Script

```bash
clasp push
```

#### 8. Throw and handle an error

```js
function doGet(e) {
  try {
    throw new GasNotFoundError('Record not found');
  } catch (err) {
    const payload = GasError.handle(err, {
      method: 'GET',
      path: 'doGet',
      rethrow: false,
    });
    return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
      ContentService.MimeType.JSON,
    );
  }
}
```

## Basic Usage

### Throw an expected (operational) error

```js
throw new GasValidationError('Invalid request body', { field: 'email' });
```

Built-in subclasses:

| Class                     | Status | Code               |
| ------------------------- | ------ | ------------------ |
| `GasValidationError`      | 400    | `VALIDATION_ERROR` |
| `GasUnauthorizedError`    | 401    | `UNAUTHORIZED`     |
| `GasForbiddenError`       | 403    | `FORBIDDEN`        |
| `GasNotFoundError`        | 404    | `NOT_FOUND`        |
| `GasConflictError`        | 409    | `CONFLICT`         |
| `GasRateLimitError`       | 429    | `RATE_LIMITED`     |
| `GasCaptchaRequiredError` | 400    | `CAPTCHA_REQUIRED` |

> [!TIP]
> `GasRateLimitError` also accepts a `retryAfterSeconds` argument, attached as `details.retryAfterSeconds`; without it, no `details` are set. For anything else, throw `GasError` directly with a custom `statusCode`, `code`, and `details`. When `code` is omitted, it is derived from `statusCode` (400 `VALIDATION_ERROR`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 429 `RATE_LIMITED`); any other status falls back to `INTERNAL_ERROR`. An explicit `code` always wins.

### Handle errors centrally

```js
try {
  // ...
} catch (err) {
  GasError.handle(err, {
    method: 'POST',
    path: 'doPost',
    sessionId: () => Session.getActiveUser().getEmail(),
  });
}
```

`GasError.handle` throws by default. Set the `rethrow` option to `false` to set the handler to return the cleaned error body instead of throwing. For a `GasError` with `statusCode < 500`, it logs `'Request error'` at `warn` with `{ method, path, statusCode, code, message, sessionId }`. A `GasError` with `statusCode >= 500` and any other thrown value — including unexpected bugs — is logged as `'Unexpected error'` at `error` with the same payload plus the full `stack`. The two differ in what the client sees: a `GasError` still sends its own `message`, `code` and `details` (its message is the client-safe channel), while any non-`GasError` value is reported as a generic 500 (`'Internal server error'`, `INTERNAL_ERROR`) with no internal detail. When it throws, the error's `.message` is a JSON string: `{ ok: false, error, status, code, details? }`.

> [!NOTE]
> `method`, `path` and `sessionId` default to `'unknown'` if not provided. `sessionId` accepts a string or a resolver function; the library never looks up the active user itself. A resolver that throws logs `'disabled'` and one that returns an empty value logs `'unknown'` — see [OAuth scope](#oauth-scope) to log the active user's email.

### Use a custom logger

```js
const logger = new GasLogger({ level: 'info' });

GasError.handle(err, { logger });
```

If `logger` is omitted, `GasError.handle` falls back to `console`.

> [!NOTE]
> With the default `console`, Apps Script records `logger.warn('Request error', payload)` as a plain text line. A `gas-logger` instance emits the same entry as a structured `jsonPayload` in Cloud Logging.

> [!TIP]
> If your `gas-logger` instance is buffered (`flushThreshold`), call `logger.flush()` in a `finally` block, or include `'warn'` and `'error'` in `bypassBufferLevels`, so the handler's entries reach the sheet even when `GasError.handle` rethrows.

## License

MIT

See the `LICENSE` file for details.

## Support

Issues and feature requests are welcome via GitHub Issues.

Maintained by [yorsh-co](https://github.com/yorsh-co).

---

> [!TIP]
> Found `gas-error` useful?
> Find more Google Apps Script libraries at [github.com/yorsh-co](https://github.com/yorsh-co).
