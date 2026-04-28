# node-rate-guard

[![npm version](https://badge.fury.io/js/node-rate-guard.svg)](https://badge.fury.io/js/node-rate-guard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A TypeScript-first rate limiting middleware for Express applications. Protect your APIs from abuse with configurable limits, multiple storage backends, and production-ready defaults.

**Perfect for securing authentication endpoints, APIs, and preventing abuse while maintaining excellent developer experience.**

## Features

- Simple, intuitive API
- TypeScript support with full type definitions
- Memory store (default) for single-server deployments
- Redis store for distributed/multi-server deployments
- Standard and legacy rate-limit headers
- Customizable key generation (IP, user ID, API key, etc.)
- Skip functionality for whitelisting
- Custom error handlers
- Zero dependencies (peer dependencies only)

## Installation

```bash
npm install node-rate-guard
```

For Redis support:

```bash
npm install node-rate-guard redis
```

**Note:** Redis examples require a running Redis server. If you don't have Redis running, use the basic example instead:
```bash
npm run dev:example  # Uses memory store (no Redis needed)
```

## Quick Start

```typescript
import express from "express";
import { rateGuard } from "node-rate-guard";

const app = express();

// Basic usage: 100 requests per minute per IP
app.use(
  rateGuard({
    windowMs: 60_000,
    max: 100,
  })
);

app.get("/api/data", (req, res) => {
  res.json({ success: true });
});

app.listen(3000);
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `windowMs` | `number` | `60000` | Time window in milliseconds |
| `max` | `number` | `100` | Maximum requests per window |
| `message` | `string \| object` | `"Too many requests..."` | Response message when limited |
| `statusCode` | `number` | `429` | HTTP status code when limited |
| `keyGenerator` | `(req) => string` | IP address | Function to generate unique key |
| `skip` | `(req) => boolean` | `() => false` | Function to skip rate limiting |
| `store` | `Store` | `MemoryStore` | Storage backend |
| `standardHeaders` | `boolean` | `true` | Send `RateLimit-*` headers |
| `legacyHeaders` | `boolean` | `false` | Send `X-RateLimit-*` headers |
| `handler` | `function` | Built-in JSON response | Custom limit exceeded handler |

## Response Headers

When `standardHeaders` is enabled (default):

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1714312800
RateLimit-Policy: 100;w=60
```

When `legacyHeaders` is enabled:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1714312800
```

When limit is exceeded:

```
Retry-After: 45
```

## Error Response

Default response when rate limit is exceeded:

```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 45
}
```

## Examples

### Route-Specific Limiting

```typescript
import express from "express";
import { rateGuard } from "node-rate-guard";

const app = express();

// Strict limiter for authentication routes
const authLimiter = rateGuard({
  windowMs: 15 * 60_000, // 15 minutes
  max: 5,
  message: "Too many login attempts. Try again in 15 minutes.",
});

// Standard limiter for API routes
const apiLimiter = rateGuard({
  windowMs: 60_000,
  max: 100,
});

app.post("/auth/login", authLimiter, loginHandler);
app.post("/auth/register", authLimiter, registerHandler);

app.use("/api", apiLimiter);
```

### Custom Key Generation

```typescript
// Rate limit by user ID instead of IP
app.use(
  rateGuard({
    windowMs: 60_000,
    max: 100,
    keyGenerator: (req) => req.user?.id ?? req.ip,
  })
);

// Rate limit by API key
app.use(
  rateGuard({
    windowMs: 60_000,
    max: 1000,
    keyGenerator: (req) => req.headers["x-api-key"] as string ?? req.ip,
  })
);
```

### Skip Certain Requests

```typescript
app.use(
  rateGuard({
    windowMs: 60_000,
    max: 100,
    skip: (req) => {
      // Skip health checks
      if (req.path === "/health") return true;
      // Skip internal IPs
      if (req.ip?.startsWith("10.")) return true;
      return false;
    },
  })
);
```

### Custom Error Handler

```typescript
app.use(
  rateGuard({
    windowMs: 60_000,
    max: 100,
    handler: (req, res, next, info) => {
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "You have exceeded the rate limit",
          limit: info.limit,
          remaining: info.remaining,
          resetAt: new Date(info.resetAt).toISOString(),
        },
      });
    },
  })
);
```

## Redis Store (Production)

For multi-server deployments, use Redis to share rate limit state:

```typescript
import express from "express";
import { createClient } from "redis";
import { rateGuard, RedisStore } from "node-rate-guard";

const app = express();

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

app.use(
  rateGuard({
    windowMs: 60_000,
    max: 100,
    store: new RedisStore({ client: redis }),
  })
);
```

### Redis Store Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `client` | `RedisClient` | Required | Redis client instance |
| `prefix` | `string` | `"rate-guard:"` | Key prefix in Redis |

## Custom Store

Implement the `Store` interface to create your own storage backend:

```typescript
import type { Store, StoreRecord } from "node-rate-guard";

class MyCustomStore implements Store {
  async increment(key: string, windowMs: number): Promise<StoreRecord> {
    // Your implementation
  }

  async decrement(key: string): Promise<void> {
    // Your implementation
  }

  async reset(key: string): Promise<void> {
    // Your implementation
  }

  async shutdown(): Promise<void> {
    // Optional cleanup
  }
}
```

## Production Recommendations

1. **Use Redis** for multi-instance deployments to share state
2. **Set appropriate limits** based on your API's expected usage
3. **Use different limits** for different endpoints (auth vs regular API)
4. **Enable both header types** for maximum client compatibility
5. **Monitor and adjust** limits based on real traffic patterns
6. **Implement graceful degradation** in your custom handler

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  Store,
  StoreRecord,
  RateLimitInfo,
  RateGuardOptions,
} from "node-rate-guard";
```

## API Reference

### `rateGuard(options?: RateGuardOptions)`

Creates an Express middleware function.

### `MemoryStore`

In-memory storage (default). Suitable for single-server deployments.

```typescript
import { MemoryStore } from "node-rate-guard";

const store = new MemoryStore({
  cleanupInterval: 60_000, // Cleanup expired entries every 60s
});
```

### `RedisStore`

Redis-backed storage. Required for distributed deployments.

```typescript
import { RedisStore } from "node-rate-guard";

const store = new RedisStore({
  client: redisClient,
  prefix: "my-app:rate-limit:",
});
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.

## Author

**majid2851**
- GitHub: [@majid2851](https://github.com/majid2851)

## License

MIT © [majid2851](https://github.com/majid2851)
