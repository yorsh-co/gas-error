# Changelog

---

## [Unreleased]

### Added

- `GasError` base class for operational errors, carrying a `statusCode`, `code` (`GasErrorCode`), and optional `details`, and marked `isOperational: true`
- Seven built-in subclasses: `GasValidationError` (400), `GasUnauthorizedError` (401), `GasForbiddenError` (403), `GasNotFoundError` (404), `GasConflictError` (409), `GasRateLimitError` (429, with a `retryAfterSeconds` detail), `GasCaptchaRequiredError` (400)
- `GasError.handle(err, options)` static: logs `GasError` instances at `warn`, anything else at `error` with the full stack, and throws a `JSON.stringify`'d `{ ok, error, status, code, details? }` payload by default. Can be set to return the payload instead of throwing by using the `rethrow: false` option
- Configurable `logger` (defaults to `console`, also accepts a `GasLogger` instance), plus `method`/`path`/`sessionId` context — `sessionId` defaults to `Session.getActiveUser()?.getEmail()`
- TypeScript source compiling to plain global-scope `.js` with matching `.d.ts` declarations — no bundler or build step required downstream
- Release pipeline (`scripts/release.sh`) publishing compiled `dist/*.js`/`.d.ts` plus README/LICENSE/CHANGELOG to a dedicated `dist` branch for `git subtree` consumption
- Project scaffolding: TypeScript, ESLint, and Prettier configuration; npm package manifest and scripts
