import type { Request, Response, NextFunction, RequestHandler } from "express";
import type {
  RateGuardOptions,
  ResolvedOptions,
  RateLimitInfo,
} from "../stores/types.js";
import { MemoryStore } from "../stores/memoryStore.js";
import { defaultKeyGenerator } from "../utils/key.js";
import {
  setStandardHeaders,
  setLegacyHeaders,
  setRetryAfterHeader,
} from "../utils/headers.js";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 100;
const DEFAULT_STATUS_CODE = 429;
const DEFAULT_MESSAGE = "Too many requests, please try again later.";

// Default handler for rate limit exceeded (unused but kept for reference)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function defaultHandler(
  _req: Request,
  res: Response,
  _next: NextFunction,
  info: RateLimitInfo
): void {
  setRetryAfterHeader(res, info.resetAt);
  res.status(DEFAULT_STATUS_CODE).json({
    error: DEFAULT_MESSAGE,
    retryAfter: Math.ceil((info.resetAt - Date.now()) / 1000),
  });
}

function resolveOptions(options: RateGuardOptions): ResolvedOptions {
  return {
    windowMs: options.windowMs ?? DEFAULT_WINDOW_MS,
    max: options.max ?? DEFAULT_MAX,
    message: options.message ?? DEFAULT_MESSAGE,
    statusCode: options.statusCode ?? DEFAULT_STATUS_CODE,
    keyGenerator: options.keyGenerator ?? defaultKeyGenerator,
    skip: options.skip ?? (() => false),
    store: options.store ?? new MemoryStore(),
    standardHeaders: options.standardHeaders ?? true,
    legacyHeaders: options.legacyHeaders ?? false,
    handler:
      options.handler ??
      ((_req, res, _next, info) => {
        setRetryAfterHeader(res, info.resetAt);
        const message = options.message ?? DEFAULT_MESSAGE;
        const statusCode = options.statusCode ?? DEFAULT_STATUS_CODE;

        if (typeof message === "string") {
          res.status(statusCode).json({
            error: message,
            retryAfter: Math.ceil((info.resetAt - Date.now()) / 1000),
          });
        } else {
          res.status(statusCode).json(message);
        }
      }),
  };
}

export function rateGuard(options: RateGuardOptions = {}): RequestHandler {
  const config = resolveOptions(options);

  const middleware: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const shouldSkip = await config.skip(req);
      if (shouldSkip) {
        next();
        return;
      }

      const key = config.keyGenerator(req);
      const record = await config.store.increment(key, config.windowMs);

      const info: RateLimitInfo = {
        limit: config.max,
        current: record.count,
        remaining: config.max - record.count,
        resetAt: record.resetAt,
      };

      if (config.standardHeaders) {
        setStandardHeaders(res, info, config.windowMs);
      }

      if (config.legacyHeaders) {
        setLegacyHeaders(res, info);
      }

      if (record.count > config.max) {
        config.handler(req, res, next, info);
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  return middleware;
}
