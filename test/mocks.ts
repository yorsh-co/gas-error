import { vi } from 'vitest';

/** Fresh set of Apps Script service fakes injected as globals. */
export function createMocks() {
  return {
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
