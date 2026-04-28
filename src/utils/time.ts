export function calculateResetAt(windowMs: number): number {
  return Date.now() + windowMs;
}

export function isExpired(resetAt: number): boolean {
  return Date.now() >= resetAt;
}

export function msToSeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

export function secondsToMs(seconds: number): number {
  return seconds * 1000;
}
