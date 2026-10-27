import { fileURLToPath } from 'node:url';
import { createGasLoader } from 'gas-dev-config/test';
import { createMocks, type Mocks } from './mocks';

type Meta = Record<string, unknown>;

/** Loose, test-side view of `GasErrorOptions`. */
export interface GasErrorTestOptions {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/** Loose, test-side view of `GasErrorHandlerOptions`. */
export interface GasErrorHandlerTestOptions {
  logger?: {
    warn(msg: string, meta?: Meta): void;
    error(msg: string, meta?: Meta): void;
  };
  method?: string;
  path?: string;
  sessionId?: string | (() => string);
  rethrow?: boolean;
}

/** Loose, test-side view of `GasErrorSafePayload`. */
export interface GasErrorPayload {
  ok: boolean;
  error: string;
  status: number;
  code: string;
  details?: unknown;
}

export interface GasErrorInstance extends Error {
  statusCode: number;
  code: string;
  details: unknown;
  isOperational: true;
}

export interface GasErrorConstructor {
  new (message: string, options?: GasErrorTestOptions): GasErrorInstance;
  handle(err: unknown, options?: GasErrorHandlerTestOptions): GasErrorPayload;
}

type GasErrorSubclass = new (
  message?: string,
  extra?: unknown,
) => GasErrorInstance;

export interface GasErrorClasses {
  GasError: GasErrorConstructor;
  GasValidationError: GasErrorSubclass;
  GasNotFoundError: GasErrorSubclass;
  GasUnauthorizedError: GasErrorSubclass;
  GasForbiddenError: GasErrorSubclass;
  GasConflictError: GasErrorSubclass;
  GasRateLimitError: GasErrorSubclass;
  GasCaptchaRequiredError: GasErrorSubclass;
}

/** Source files in load order; later files depend on earlier ones. */
const SOURCE_FILES = [
  'gas-error.types.ts',
  'gas-error.constants.ts',
  'gas-error.ts',
];

const load = createGasLoader<GasErrorClasses>({
  files: SOURCE_FILES.map((file) => `src/${file}`),
  exports: [
    'GasError',
    'GasValidationError',
    'GasNotFoundError',
    'GasUnauthorizedError',
    'GasForbiddenError',
    'GasConflictError',
    'GasRateLimitError',
    'GasCaptchaRequiredError',
  ],
  root: fileURLToPath(new URL('..', import.meta.url)),
});

/**
 * Evaluates the error sources in a fresh context wired to fake Apps Script
 * services, so each call is isolated from every other. `Error` is shared
 * with the host so `instanceof Error` holds across the context boundary.
 */
export function loadGasError(overrides: Partial<Mocks> = {}): {
  classes: GasErrorClasses;
  mocks: Mocks;
} {
  const mocks = { ...createMocks(), ...overrides };
  const { Session, console } = mocks;

  return { classes: load({ Session, console, Error }), mocks };
}
