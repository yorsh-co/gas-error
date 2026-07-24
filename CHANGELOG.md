# Changelog

---

## [Unreleased]

### Added

- `GasError` base class for operational errors, carrying a `statusCode`, `code` (`GasErrorCode`), and optional `details`, and marked `isOperational: true`
- Seven built-in subclasses: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `RateLimitError` (429, with a `retryAfterSeconds` detail), `CaptchaRequiredError` (400)
- `errorHandler(err, options)`: logs `GasError` instances at `warn`, anything else at `error` with the full stack, and always throws a `JSON.stringify`'d `{ ok, error, status, code, details? }` payload
- Configurable `logger` (defaults to `console`, also accepts a `GasLogger` instance), plus `method`/`path`/`session` context — `session` defaults to `Session.getActiveUser()?.getEmail()`
- TypeScript source compiling to plain global-scope `.js` with matching `.d.ts` declarations — no bundler or build step required downstream
- Release pipeline (`scripts/release.sh`) publishing compiled `dist/*.js`/`.d.ts` plus README/LICENSE/CHANGELOG to a dedicated `dist` branch for `git subtree` consumption
- Project scaffolding: TypeScript, ESLint, and Prettier configuration; npm package manifest and scripts
