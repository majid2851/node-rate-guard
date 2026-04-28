import { describe, it, expect, vi } from "vitest";
import { RedisStore } from "../src/stores/redisStore.js";

function createMockRedisClient() {
  const store = new Map<string, { value: number; ttl: number }>();

  return {
    multi() {
      const commands: Array<{ cmd: string; args: unknown[] }> = [];

      return {
        incr(key: string) {
          commands.push({ cmd: "incr", args: [key] });
          return this;
        },
        pTTL(key: string) {
          commands.push({ cmd: "pTTL", args: [key] });
          return this;
        },
        pExpire(key: string, ms: number) {
          commands.push({ cmd: "pExpire", args: [key, ms] });
          return this;
        },
        async exec() {
          const results: unknown[] = [];

          for (const { cmd, args } of commands) {
            switch (cmd) {
              case "incr": {
                const key = args[0] as string;
                const existing = store.get(key);
                if (existing) {
                  existing.value += 1;
                  results.push(existing.value);
                } else {
                  store.set(key, { value: 1, ttl: -1 });
                  results.push(1);
                }
                break;
              }
              case "pTTL": {
                const key = args[0] as string;
                const existing = store.get(key);
                results.push(existing?.ttl ?? -1);
                break;
              }
              case "pExpire": {
                const key = args[0] as string;
                const ms = args[1] as number;
                const existing = store.get(key);
                if (existing) {
                  existing.ttl = ms;
                }
                results.push(1);
                break;
              }
            }
          }

          return results;
        },
      };
    },
    async decr(key: string) {
      const existing = store.get(key);
      if (existing && existing.value > 0) {
        existing.value -= 1;
        return existing.value;
      }
      return 0;
    },
    async del(key: string) {
      const existed = store.has(key);
      store.delete(key);
      return existed ? 1 : 0;
    },
    quit: vi.fn().mockResolvedValue(undefined),
  };
}

describe("RedisStore", () => {
  describe("increment", () => {
    it("should return count of 1 for new key", async () => {
      const client = createMockRedisClient();
      const store = new RedisStore({ client });

      const result = await store.increment("test-key", 60000);

      expect(result.count).toBe(1);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("should increment count for existing key", async () => {
      const client = createMockRedisClient();
      const store = new RedisStore({ client });

      await store.increment("test-key", 60000);
      await store.increment("test-key", 60000);
      const result = await store.increment("test-key", 60000);

      expect(result.count).toBe(3);
    });

    it("should use custom prefix", async () => {
      const client = createMockRedisClient();
      const store = new RedisStore({ client, prefix: "custom:" });

      const result = await store.increment("test", 60000);

      expect(result.count).toBe(1);
    });

    it("should throw when redis transaction fails", async () => {
      const client = {
        multi() {
          return {
            incr() {
              return this;
            },
            pTTL() {
              return this;
            },
            pExpire() {
              return this;
            },
            async exec() {
              return null;
            },
          };
        },
        async decr() {
          return 0;
        },
        async del() {
          return 0;
        },
      };

      const store = new RedisStore({ client });

      await expect(store.increment("test-key", 60000)).rejects.toThrow(
        "Redis transaction failed"
      );
    });
  });

  describe("decrement", () => {
    it("should decrement count", async () => {
      const client = createMockRedisClient();
      const store = new RedisStore({ client });

      await store.increment("test-key", 60000);
      await store.increment("test-key", 60000);
      await store.decrement("test-key");

      const result = await store.increment("test-key", 60000);
      expect(result.count).toBe(2);
    });
  });

  describe("reset", () => {
    it("should remove key", async () => {
      const client = createMockRedisClient();
      const store = new RedisStore({ client });

      await store.increment("test-key", 60000);
      await store.reset("test-key");

      const result = await store.increment("test-key", 60000);
      expect(result.count).toBe(1);
    });
  });

  describe("shutdown", () => {
    it("should call quit on client", async () => {
      const client = createMockRedisClient();
      const store = new RedisStore({ client });

      await store.shutdown();

      expect(client.quit).toHaveBeenCalled();
    });

    it("should fallback to disconnect when quit is unavailable", async () => {
      const disconnect = vi.fn().mockResolvedValue(undefined);
      const client = {
        ...createMockRedisClient(),
        quit: undefined,
        disconnect,
      };
      const store = new RedisStore({ client });

      await store.shutdown();

      expect(disconnect).toHaveBeenCalled();
    });
  });
});
