import type { Request, Response, NextFunction } from "express";

export interface StoreRecord {
  count: number;
  resetAt: number;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetAt: number;
}

export interface Store {
  increment(key: string, windowMs: number): Promise<StoreRecord>;
  decrement(key: string): Promise<void>;
  reset(key: string): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface RateGuardOptions {
  windowMs?: number;
  max?: number;
  message?: string | object;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean | Promise<boolean>;
  store?: Store;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  handler?: (
    req: Request,
    res: Response,
    next: NextFunction,
    info: RateLimitInfo
  ) => void;
}

export interface ResolvedOptions {
  windowMs: number;
  max: number;
  message: string | object;
  statusCode: number;
  keyGenerator: (req: Request) => string;
  skip: (req: Request) => boolean | Promise<boolean>;
  store: Store;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
    info: RateLimitInfo
  ) => void;
}
