/**
 * Exponential backoff with full jitter, capped at 60 seconds.
 */
export function computeBackoffMs(attempt: number, baseMs = 1000, maxMs = 60_000): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.floor(Math.random() * Math.min(1000, exp * 0.25));
  return Math.min(maxMs, exp + jitter);
}
