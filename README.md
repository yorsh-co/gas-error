# gas-error

[![Built with Google Apps Script](https://img.shields.io/badge/Built%20with-Google%20Apps%20Script-4285F4?logo=google&logoColor=white)](https://developers.google.com/apps-script)

## Operational error classes and a centralized JSON error handler for Google Apps Script.

> [!NOTE]
> The goal of this project is to give Apps Script web apps a single place to define expected ("operational") errors — validation failures, missing resources, auth problems — and a single handler that logs and serializes them consistently, without leaking internal detail when something unexpected goes wrong.

`gas-error` provides a `GasError` base class plus seven common subclasses (`GasValidationError`, `GasNotFoundError`, `GasUnauthorizedError`, `GasForbiddenError`, `GasConflictError`, `GasRateLimitError`, `GasCaptchaRequiredError`), and a `GasError.handle(err, options)` static that logs the error and throws a JSON-serializable payload ready to return from your web app's entry point.

> **Disclaimer:**
> This project and [Yorsh](https://github.com/yorsh-co) are independent and are not affiliated with, endorsed by, or associated with Google LLC.

### Features

- `GasError` base class carrying a `statusCode`, a `code` (`GasErrorCode`), and optional `details` — marked `isOperational: true` to distinguish expected failures from programming bugs
- Seven built-in subclasses for common cases: `GasValidationError` (400), `GasUnauthorizedError` (401), `GasForbiddenError` (403), `GasNotFoundError` (404), `GasConflictError` (409), `GasRateLimitError` (429, with a `retryAfterSeconds` detail), `GasCaptchaRequiredError` (400)
- `GasError.handle(err, options)`: logs `GasError` instances at `warn` (their message/code/details are safe to send to the client as-is); logs anything else at `error` with the full stack, and reports it to the client as a generic 500 with no internal detail
- Always throws a `JSON.stringify`'d payload — `{ ok: false, error, status, code, details? }` — so it can be caught once at your entry point and returned as the response
- Configurable `logger` (defaults to `console`, also accepts a `GasLogger` instance) and `sessionId` (defaults to `Session.getActiveUser()?.getEmail()`)
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
      // GasError.handle always throws — `handled.message` is the JSON payload
      return ContentService.createTextOutput(handled.message).setMimeType(
        ContentService.MimeType.JSON,
      );
    }
  }
}
```

## Requirements

> [!IMPORTANT]
> `gas-error` has no runtime dependencies and no required peer packages — `GasError.handle`'s `logger` option defaults to `console`. If you pass a `GasLogger` instance as `logger` and want TypeScript to type-check it, `gas-logger` needs to be available in your project too.

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
    GasError.handle(err, { method: 'GET', path: 'doGet' });
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
>   "filePushOrder": ["dist/lib/gas-error/module/gas-error.js"]
> }
> ```
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
    GasError.handle(err, { method: 'GET', path: 'doGet' });
  }
}
```

## Basic Usage

### Throw an operational error

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
> `GasRateLimitError` also accepts a `retryAfterSeconds` argument, attached as `details.retryAfterSeconds`. For anything else, throw `GasError` directly with a custom `statusCode`, `code`, and `details`.

### Handle errors centrally

```js
try {
  // ...
} catch (err) {
  GasError.handle(err, {
    method: 'POST',
    path: 'doPost',
    sessionId: Session.getActiveUser().getEmail(),
  });
}
```

`GasError.handle` throws by default. Set the `rethrow` option to `false` to set the handler to return the cleaned error body instead of throwing. For a `GasError` with `statusCode < 500`, it logs `'Request error'` at `warn` with `{ method, path, statusCode, code, message, sessionId }`. For anything else — including non-operational bugs — it logs `'Unexpected error'` at `error` with the same payload plus the full `stack`, and the client only ever sees a generic 500 with no internal detail. Either way, the thrown error's `.message` is a JSON string: `{ ok: false, error, status, code, details? }`.

> [!NOTE]
> `method`, `path`, and `sessionId` all default to `'unknown'` if not provided (`sessionId` first tries `Session.getActiveUser()?.getEmail()`).

### Use a custom logger

```js
const logger = new GasLogger({ level: 'info' });

GasError.handle(err, { logger });
```

If `logger` is omitted, `GasError.handle` falls back to `console`.

## License

MIT

See the `LICENSE` file for details.

## Support

Issues and feature requests are welcome via GitHub Issues.

Maintained by [yorsh-co](https://github.com/yorsh-co).

---

> [!TIP]
> Found `gas-logger` useful?
> Find more Google Apps Script libraries at [github.com/yorsh-co](https://github.com/yorsh-co).
