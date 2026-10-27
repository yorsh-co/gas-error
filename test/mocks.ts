import { vi } from 'vitest';

/** Email returned by the `Session` mock unless a test overrides it. */
export const DEFAULT_EMAIL = 'user@example.com';

/** Fresh set of Apps Script service fakes injected as globals. */
export function createMocks() {
  const getEmail = vi.fn((): string => DEFAULT_EMAIL);

  return {
    /** Configure with `mockReturnValue('')` or `mockImplementation(() => { throw ... })`. */
    getEmail,
    Session: { getActiveUser: vi.fn(() => ({ getEmail })) },
    logger: { warn: vi.fn(), error: vi.fn() },
    console: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    },
  };
}

export type Mocks = ReturnType<typeof createMocks>;
