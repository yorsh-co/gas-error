# gas-error

[![Built with Google Apps Script](https://img.shields.io/badge/Built%20with-Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)

## Operational error classes and a centralized JSON error handler for Google Apps Script.

> The goal of this project is to give Apps Script web apps a single place to define expected ("operational") errors — validation failures, missing resources, auth problems — and a single handler that logs and serializes them consistently, without leaking internal detail when something unexpected goes wrong.

`gas-error` provides a `GasError` base class plus seven common subclasses (`ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `RateLimitError`, `CaptchaRequiredError`), and an `errorHandler(err, options)` function that logs the error and throws a JSON-serializable payload ready to return from your web app's entry point.

> **Disclaimer:**
> This project and [Yorsh](https://github.com/yorsh-co) are independent and are not affiliated with, endorsed by, or associated with Google LLC.

### Features

- `GasError` base class carrying a `statusCode`, a `code` (`GasErrorCode`), and optional `details` — marked `isOperational: true` to distinguish expected failures from programming bugs
- Seven built-in subclasses for common cases: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `RateLimitError` (429, with a `retryAfterSeconds` detail), `CaptchaRequiredError` (400)
- `errorHandler(err, options)`: logs `GasError` instances at `warn` (their message/code/details are safe to send to the client as-is); logs anything else at `error` with the full stack, and reports it to the client as a generic 500 with no internal detail
- Always throws a `JSON.stringify`'d payload — `{ ok: false, error, status, code, details? }` — so it can be caught once at your entry point and returned as the response
- Configurable `logger` (defaults to `console`, also accepts a `GasLogger` instance) and `session` (defaults to `Session.getActiveUser()?.getEmail()`)
- Written in TypeScript; ships compiled `.js` plus matching `.d.ts` declarations — no build step required downstream
- No runtime dependencies

### Example Usage

```js
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (!body.email) {
      throw new ValidationError('Missing required field', { field: 'email' });
    }

    // ...handle the request
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    try {
      errorHandler(err, { method: 'POST', path: 'doPost' });
    } catch (handled) {
      // errorHandler always throws — `handled.message` is the JSON payload
      return ContentService.createTextOutput(handled.message).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }
}
```

## Requirements

`gas-error` has no runtime dependencies and no required peer packages — `errorHandler`'s `logger` option defaults to `console`. If you pass a `GasLogger` instance as `logger` and want TypeScript to type-check it, `gas-logger` needs to be available in your project too (e.g. subtreed alongside `gas-error`); this is a type-only reference, not a runtime one.

## Quick Start

It is recommended to use `gas-error` together with [Google's `clasp` CLI](https://github.com/google/clasp) for local Apps Script development and git-based workflows. See [Setup instructions with `clasp`](#setup-instructions-with-clasp) for more information.

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
    throw new NotFoundError('Record not found');
  } catch (err) {
    errorHandler(err, { method: 'GET', path: 'doGet' });
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

#### 6. Push local files to Apps Script

```bash
clasp push
```

> **Note:**
> The `GasError` subclasses extend `GasError` within the same file, so — unlike `gas-webapp` — this library has no file push order requirement relative to your other files.

#### 7. Throw and handle an error

```js
function doGet(e) {
  try {
    throw new NotFoundError('Record not found');
  } catch (err) {
    errorHandler(err, { method: 'GET', path: 'doGet' });
  }
}
```

## Basic Usage

### Throw an operational error

```js
throw new ValidationError('Invalid request body', { field: 'email' });
```

Built-in subclasses:

| Class                  | Status | Code               |
| ---------------------- | ------ | ------------------ |
| `ValidationError`      | 400    | `VALIDATION_ERROR` |
| `UnauthorizedError`    | 401    | `UNAUTHORIZED`     |
| `ForbiddenError`       | 403    | `FORBIDDEN`        |
| `NotFoundError`        | 404    | `NOT_FOUND`        |
| `ConflictError`        | 409    | `CONFLICT`         |
| `RateLimitError`       | 429    | `RATE_LIMITED`     |
| `CaptchaRequiredError` | 400    | `CAPTCHA_REQUIRED` |

`RateLimitError` also accepts a `retryAfterSeconds` argument, attached as `details.retryAfterSeconds`. For anything else, throw `GasError` directly with a custom `statusCode`, `code`, and `details`.

### Handle errors centrally

```js
try {
  // ...
} catch (err) {
  errorHandler(err, {
    method: 'POST',
    path: 'doPost',
    session: Session.getActiveUser().getEmail(),
  });
}
```

`errorHandler` always throws. For a `GasError` with `statusCode < 500`, it logs `'Request error'` at `warn` with `{ method, path, statusCode, code, message, session }`. For anything else — including non-operational bugs — it logs `'Unexpected error'` at `error` with the same payload plus the full `stack`, and the client only ever sees a generic 500 with no internal detail. Either way, the thrown error's `.message` is a JSON string: `{ ok: false, error, status, code, details? }`.

> **Note:**
> `method`, `path`, and `session` all default to `'unknown'` if not provided (`session` first tries `Session.getActiveUser()?.getEmail()`).

### Use a custom logger

```js
const logger = new GasLogger({ level: 'info' });

errorHandler(err, { logger });
```

If `logger` is omitted, `errorHandler` falls back to `console`.

## License

MIT

See the `LICENSE` file for details.

## Support

Issues and feature requests are welcome via GitHub Issues.

Maintained by [yorsh-co](https://github.com/yorsh-co).
