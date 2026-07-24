/**
 * Ambient declarations for peer subtree packages this project expects as
 * globals at runtime but doesn't vendor or redeclare in full: gas-logger (GasLogger).
 *
 * Only the surface gas-webapp actually calls is declared — enough for
 * `tsc --noEmit` to typecheck this package standalone. The real
 * implementations are supplied by the sibling subtree packages at
 * runtime; this file has no `.js` output counterpart and should not be
 * copied into dist/ or the published package.
 */

interface GasLoggerChildLogger {
  trace(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  fatal(msg: string, meta?: Record<string, unknown>): void;
  flush(): void;
}

declare class GasLogger {
  child(bindings: Record<string, unknown>): GasLoggerChildLogger;
  trace(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  fatal(msg: string, meta?: Record<string, unknown>): void;
  flush(): void;
}
