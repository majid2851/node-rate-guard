import type { Response } from "express";
import type { RateLimitInfo } from "../stores/types.js";

export function setStandardHeaders(
  res: Response,
  info: RateLimitInfo,
  windowMs: number
): void {
  res.setHeader("RateLimit-Limit", info.limit);
  res.setHeader("RateLimit-Remaining", Math.max(0, info.remaining));
  res.setHeader("RateLimit-Reset", Math.ceil(info.resetAt / 1000));
  res.setHeader("RateLimit-Policy", `${info.limit};w=${Math.ceil(windowMs / 1000)}`);
}

export function setLegacyHeaders(res: Response, info: RateLimitInfo): void {
  res.setHeader("X-RateLimit-Limit", info.limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, info.remaining));
  res.setHeader("X-RateLimit-Reset", Math.ceil(info.resetAt / 1000));
}

export function setRetryAfterHeader(res: Response, resetAt: number): void {
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  res.setHeader("Retry-After", Math.max(0, retryAfterSeconds));
}
