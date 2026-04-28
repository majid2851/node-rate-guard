import type { Request } from "express";

export function defaultKeyGenerator(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];

  if (forwarded) {
    const forwardedIps = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded.split(",")[0];
    return forwardedIps.trim();
  }

  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}
