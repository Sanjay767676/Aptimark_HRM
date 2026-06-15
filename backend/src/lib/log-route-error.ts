import type { Logger } from "pino";

export function logRouteError(log: Logger, context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  log.error(`${context}: ${message}`);
}
