/**
 * Compile-time checks for the `GasError.handle` overloads. Not a vitest
 * suite — `tsc -p tsconfig.test.json` (`npm run typecheck`) compiles it, and
 * a wrong overload fails the build. Global declarations come from `src/`.
 */

type IsNever<T> = [T] extends [never] ? true : false;

declare const thrown: unknown;
declare const opts: GasErrorHandlerOptions;

const explicitNoRethrow: GasErrorSafePayload = GasError.handle(thrown, {
  rethrow: false,
});

const runtimeRethrow: GasErrorSafePayload = GasError.handle(thrown, opts);

const rethrows = () => GasError.handle(thrown);
const rethrowsExplicitly = () => GasError.handle(thrown, { rethrow: true });
const returnsPayload = () => GasError.handle(thrown, { rethrow: false });

const defaultRethrow: IsNever<ReturnType<typeof rethrows>> = true;

const explicitRethrow: IsNever<ReturnType<typeof rethrowsExplicitly>> = true;

const payloadIsNotNever: IsNever<ReturnType<typeof returnsPayload>> = false;

const validationObjectDetails = new GasValidationError('x', {
  field: 'email',
});

const consoleLogger: GasErrorLogger = console;

declare const gasLogger: GasLogger;
const gasLoggerSink: GasErrorLogger = gasLogger;

const stringSessionId: GasErrorHandlerOptions = { sessionId: 'user-1' };
const resolverSessionId: GasErrorHandlerOptions = {
  sessionId: () => 'user-1',
};

const okIsFalse: GasErrorSafePayload['ok'] extends false ? true : false = true;

export {
  consoleLogger,
  defaultRethrow,
  explicitNoRethrow,
  explicitRethrow,
  gasLoggerSink,
  payloadIsNotNever,
  rethrows,
  rethrowsExplicitly,
  resolverSessionId,
  returnsPayload,
  okIsFalse,
  runtimeRethrow,
  stringSessionId,
  validationObjectDetails,
};
