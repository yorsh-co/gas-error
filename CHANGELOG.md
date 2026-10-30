# Changelog

---

## [1.2.0] - 2026-10-30

### Added

- Apps Script tests in `gas-test/`, run with gas-dev-config's `gas-test` (`npm run test:gas:build`, `npm run test:gas`)
- The release `package.json` carries `gasLibrary` load-order metadata for gas-dev-bundle, with gas-logger as a peer

### Changed

- Lint, TypeScript and Prettier configuration and the test loader come from `gas-dev-config`
- Dependabot groups development dependencies into one weekly pull request
- Load order is read from `gasDevConfig.loadOrder` instead of being duplicated in the test harness
- Bumped gas-dev-config to ^1.4.1 and gas-dev-release to ^1.1.0

### Fixed

- README: executions through the Apps Script API (e.g. `clasp run`) can resolve the user's email even when `oauthScopes` omits `userinfo.email`
- The release no longer contains ES2021 syntax (`||=`), which Apps Script rejects on push, so projects including gas-error 1.1.0 could not be pushed; builds now target ES2020 through gas-dev-config 1.4.1

---

## [1.1.0] - 2026-10-27

### Fixed

- `GasValidationError` accepts any `details`, not just a string
- `GasRateLimitError` no longer sends an empty `details: {}` when `retryAfterSeconds` is omitted
- `GasError` derives `code` from `statusCode` when omitted, instead of `INTERNAL_ERROR` for every status
- `GasError.handle` no longer throws a `TypeError` on `null`/`undefined`, and logs non-`Error` values (strings, numbers, plain objects) with their string form as the message
- `GasError.handle` accepts `unknown`, so it type-checks with strict catch variables
- `GasError.handle` returns `never` when it rethrows, via overloads on the `rethrow` option
- Falsy `details` (`0`, `''`, `false`) are kept in the safe payload
- `GasErrorSafePayload.ok` is typed as `false`
- The published `.d.ts` no longer references `GasLogger`; `logger` is typed structurally as `GasErrorLogger` (`console`, a gas-logger instance, or any object with `warn`/`error`)
- Stop shipping the empty `gas-error.types.js` to the `dist` branch; `.d.ts` files are still published

### Docs

- Document the optional `userinfo.email` scope under Google's granular OAuth consent screen (granted logs the email, declined logs `'disabled'`, blank logs `'unknown'`), and that logged emails reach your logs and any gas-logger sheet sink
- Fix the `filePushOrder` example paths (the `dist` branch is flat, so no `module/` segment) and note that the paths must match where the files land in the pushed project
- Make the `doGet` examples return the JSON response (`rethrow: false`) instead of letting the handler's error escape as an Apps Script error page
- Clarify that a `GasError` with `statusCode >= 500` is logged at `error` with the stack but still sends its own message, code and details; only non-`GasError` values become the generic 500
- Note the difference between `console` and gas-logger output in Cloud Logging, and that a buffered gas-logger needs `flush()` in a `finally` block or `warn`/`error` in `bypassBufferLevels`
- Drop the claim that gas-logger is needed to type-check a gas-logger instance, now that `logger` is typed structurally, and describe `GasError.handle` as throwing by default rather than always
- Correct the library name in the README footer
- Fix the `ErrorConstructor` JSDoc to reference `lib.es2021`

### Added

- `sessionId` accepts a resolver function, called lazily: a throw logs `'disabled'` and an empty result `'unknown'`
- Vitest test suite with in-memory Apps Script service mocks
- Canonical peer type declarations in `peer/gas-error.peer.types.d.ts`, for consuming gas-* libraries to copy into `src/internal/` and type-check `GasError` and its subclasses standalone

### Changed

- ESLint config uses `defineConfig` from `eslint/config` and drops the stale `no-undef` comment
- `npm run typecheck` and ESLint also cover `test/` through `tsconfig.test.json`; `npm run check` runs the test suite
- Vendored gas-logger peer declarations replaced with the canonical copy from gas-logger's `peer/`, updated to 1.1.0
- Releases are published with [`gas-dev-release`](https://github.com/yorsh-co/gas-dev-release) instead of `scripts/release.sh`, which adds preflight checks (clean tree, `v<version>` tag at `HEAD`, build present, release tag free locally and on origin), syncs with `origin/dist` and pushes the branch and tag atomically
- Tags use a `v` prefix: versions are tagged `vX.Y.Z` and releases `dist/vX.Y.Z`; the earlier plain tags were replaced
- Bump the transitive dev dependency `brace-expansion` to 5.0.12 to resolve high-severity DoS advisories reported by `npm audit`

---

## [1.0.0] - 2026-08-03

### Added

- `GasError` base class for expected failures, carrying a `statusCode`, `code` (`GasErrorCode`), and optional `details`, and marked `isOperational: true`
- Seven built-in subclasses: `GasValidationError` (400), `GasUnauthorizedError` (401), `GasForbiddenError` (403), `GasNotFoundError` (404), `GasConflictError` (409), `GasRateLimitError` (429, with a `retryAfterSeconds` detail), `GasCaptchaRequiredError` (400)
- `GasError.handle(err, options)` static: logs `GasError` instances at `warn`, anything else at `error` with the full stack, and throws a `JSON.stringify`'d `{ ok, error, status, code, details? }` payload by default. Can be set to return the payload instead of throwing by using the `rethrow: false` option
- Configurable `logger` (defaults to `console`, also accepts a `GasLogger` instance), plus `method`/`path`/`sessionId` context — `sessionId` defaults to `Session.getActiveUser()?.getEmail()`, which requires the `https://www.googleapis.com/auth/userinfo.email` scope. The scope is optional: without it the lookup is caught and the entry logs as `'disabled'`, and passing `sessionId` explicitly skips the lookup entirely
- TypeScript source compiling to plain global-scope `.js` with matching `.d.ts` declarations — no bundler or build step required downstream
- Release pipeline (`scripts/release.sh`) publishing compiled `dist/*.js`/`.d.ts` plus README/LICENSE/CHANGELOG to a dedicated `dist` branch for `git subtree` consumption
- Project scaffolding: TypeScript, ESLint, and Prettier configuration; npm package manifest and scripts
