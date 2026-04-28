import express from "express";
import { createClient } from "redis";
import { rateGuard, RedisStore } from "../src/index.js";

async function main() {
  const redis = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    socket: {
      connectTimeout: 5000,
      reconnectStrategy: false, // Don't retry endlessly
    },
  });

  redis.on("error", (err) => {
    console.error("❌ Redis connection failed:", err.message);
    console.error("\n💡 To fix this:");
    console.error("   Option 1: Start Redis with Docker:");
    console.error("   docker run --name redis-local -p 6379:6379 -d redis:7");
    console.error("\n   Option 2: Install and start Redis locally");
    console.error("   Option 3: Use a different example:");
    console.error("   npm run dev:example  (uses memory store)");
    process.exit(1);
  });

  try {
    await redis.connect();
    console.log("✅ Connected to Redis");
  } catch (error) {
    console.error("❌ Failed to connect to Redis server");
    console.error("Make sure Redis is running on localhost:6379");
    console.error("\nQuick fix:");
    console.error("docker run --name redis-local -p 6379:6379 -d redis:7");
    process.exit(1);
  }

  const app = express();

  app.use(
    rateGuard({
      windowMs: 60_000,
      max: 100,
      store: new RedisStore({ client: redis }),
      standardHeaders: true,
      legacyHeaders: true,
    })
  );

  app.get("/", (_req, res) => {
    res.json({
      message: "Hello! Rate limiting backed by Redis.",
      info: "This works across multiple server instances.",
    });
  });

  app.get("/api/data", (_req, res) => {
    res.json({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        value: Math.random(),
      })),
    });
  });

  const PORT = process.env.PORT ?? 3000;

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log("📊 Rate limit: 100 requests per minute (Redis-backed)");
    console.log("🔗 Try: http://localhost:3000/");
  });

  const shutdown = async () => {
    console.log("\n🔄 Shutting down gracefully...");
    server.close();
    try {
      await redis.quit();
    } catch (error) {
      // Redis might already be disconnected
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("❌ Application failed to start:", error.message);
  process.exit(1);
});
