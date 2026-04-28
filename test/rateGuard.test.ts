import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { rateGuard } from "../src/middleware/rateGuard.js";
import { MemoryStore } from "../src/stores/memoryStore.js";

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    ip: "127.0.0.1",
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
    ...overrides,
  } as Request;
}

function createMockResponse(): Response & {
  statusCode: number;
  headers: Record<string, string | number>;
  body: unknown;
} {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string | number>,
    body: null as unknown,
    setHeader(name: string, value: string | number) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  } as Response & {
    statusCode: number;
    headers: Record<string, string | number>;
    body: unknown;
  };

  return res;
}

describe("rateGuard middleware", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore({ cleanupInterval: 0 });
  });

  describe("basic functionality", () => {
    it("should allow requests under the limit", async () => {
      const middleware = rateGuard({ max: 5, store });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it("should block requests over the limit", async () => {
      const middleware = rateGuard({ max: 2, store });
      const req = createMockRequest();
      const next = vi.fn();

      await middleware(req, createMockResponse(), next);
      await middleware(req, createMockResponse(), next);

      const res = createMockResponse();
      await middleware(req, res, next);

      expect(res.statusCode).toBe(429);
      expect(res.body).toHaveProperty("error");
    });

    it("should use custom message when provided", async () => {
      const customMessage = "Slow down!";
      const middleware = rateGuard({ max: 1, store, message: customMessage });
      const req = createMockRequest();
      const next = vi.fn();

      await middleware(req, createMockResponse(), next);

      const res = createMockResponse();
      await middleware(req, res, next);

      expect(res.body).toHaveProperty("error", customMessage);
    });

    it("should use custom status code when provided", async () => {
      const middleware = rateGuard({ max: 1, store, statusCode: 503 });
      const req = createMockRequest();
      const next = vi.fn();

      await middleware(req, createMockResponse(), next);

      const res = createMockResponse();
      await middleware(req, res, next);

      expect(res.statusCode).toBe(503);
    });
  });

  describe("headers", () => {
    it("should set standard headers by default", async () => {
      const middleware = rateGuard({ max: 10, store });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.headers).toHaveProperty("RateLimit-Limit", 10);
      expect(res.headers).toHaveProperty("RateLimit-Remaining", 9);
      expect(res.headers).toHaveProperty("RateLimit-Reset");
    });

    it("should set legacy headers when enabled", async () => {
      const middleware = rateGuard({
        max: 10,
        store,
        legacyHeaders: true,
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.headers).toHaveProperty("X-RateLimit-Limit", 10);
      expect(res.headers).toHaveProperty("X-RateLimit-Remaining", 9);
    });

    it("should not set standard headers when disabled", async () => {
      const middleware = rateGuard({
        max: 10,
        store,
        standardHeaders: false,
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.headers).not.toHaveProperty("RateLimit-Limit");
    });
  });

  describe("key generation", () => {
    it("should use IP address by default", async () => {
      const middleware = rateGuard({ max: 2, store });
      const req1 = createMockRequest({ ip: "1.1.1.1" });
      const req2 = createMockRequest({ ip: "2.2.2.2" });
      const next = vi.fn();

      await middleware(req1, createMockResponse(), next);
      await middleware(req1, createMockResponse(), next);
      await middleware(req2, createMockResponse(), next);

      const res1 = createMockResponse();
      const res2 = createMockResponse();
      await middleware(req1, res1, next);
      await middleware(req2, res2, next);

      expect(res1.statusCode).toBe(429);
      expect(res2.statusCode).toBe(200);
    });

    it("should use custom key generator when provided", async () => {
      const middleware = rateGuard({
        max: 2,
        store,
        keyGenerator: (req) => (req as Request & { userId?: string }).userId ?? "anon",
      });
      const req = createMockRequest() as Request & { userId: string };
      req.userId = "user-123";
      const next = vi.fn();

      await middleware(req, createMockResponse(), next);
      await middleware(req, createMockResponse(), next);

      const res = createMockResponse();
      await middleware(req, res, next);

      expect(res.statusCode).toBe(429);
    });

    it("should use first x-forwarded-for IP by default", async () => {
      const middleware = rateGuard({ max: 1, store });
      const req = createMockRequest({
        ip: undefined,
        headers: { "x-forwarded-for": "10.0.0.1, 10.0.0.2" },
      });
      const next = vi.fn();

      await middleware(req, createMockResponse(), next);

      const res = createMockResponse();
      await middleware(req, res, next);

      expect(res.statusCode).toBe(429);
    });
  });

  describe("skip functionality", () => {
    it("should skip requests when skip returns true", async () => {
      const middleware = rateGuard({
        max: 1,
        store,
        skip: () => true,
      });
      const req = createMockRequest();
      const next = vi.fn();

      await middleware(req, createMockResponse(), next);
      await middleware(req, createMockResponse(), next);
      await middleware(req, createMockResponse(), next);

      expect(next).toHaveBeenCalledTimes(3);
    });

    it("should support async skip function", async () => {
      const middleware = rateGuard({
        max: 1,
        store,
        skip: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return true;
        },
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });

  describe("custom handler", () => {
    it("should use custom handler when limit exceeded", async () => {
      const customHandler = vi.fn((_req, res: Response) => {
        res.status(418).json({ custom: true });
      });

      const middleware = rateGuard({
        max: 1,
        store,
        handler: customHandler,
      });
      const req = createMockRequest();
      const next = vi.fn();

      await middleware(req, createMockResponse(), next);

      const res = createMockResponse();
      await middleware(req, res, next);

      expect(customHandler).toHaveBeenCalled();
      expect(res.statusCode).toBe(418);
    });
  });

  describe("error handling", () => {
    it("should pass store errors to next", async () => {
      const failingStore = {
        increment: vi.fn().mockRejectedValue(new Error("store failure")),
        decrement: vi.fn(),
        reset: vi.fn(),
      };

      const middleware = rateGuard({ max: 1, store: failingStore });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((next.mock.calls[0][0] as Error).message).toBe("store failure");
    });

    it("should not call next when request is rate-limited", async () => {
      const middleware = rateGuard({ max: 1, store });
      const req = createMockRequest();
      const next = vi.fn();

      await middleware(req, createMockResponse(), next);
      const res = createMockResponse();
      await middleware(req, res, next);

      expect(res.statusCode).toBe(429);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
