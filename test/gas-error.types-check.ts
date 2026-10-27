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

const okIsFalse: GasErrorSafePayload['ok'] extends false ? true : false = true;

export {
  defaultRethrow,
  explicitNoRethrow,
  explicitRethrow,
  payloadIsNotNever,
  rethrows,
  rethrowsExplicitly,
  returnsPayload,
  okIsFalse,
  runtimeRethrow,
};
