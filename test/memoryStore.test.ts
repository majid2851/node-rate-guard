import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryStore } from "../src/stores/memoryStore.js";

describe("MemoryStore", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore({ cleanupInterval: 0 });
  });

  afterEach(async () => {
    await store.shutdown();
  });

  describe("increment", () => {
    it("should return count of 1 for new key", async () => {
      const result = await store.increment("test-key", 60000);

      expect(result.count).toBe(1);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("should increment count for existing key", async () => {
      await store.increment("test-key", 60000);
      await store.increment("test-key", 60000);
      const result = await store.increment("test-key", 60000);

      expect(result.count).toBe(3);
    });

    it("should reset count after window expires", async () => {
      const shortWindow = 50;
      await store.increment("test-key", shortWindow);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await store.increment("test-key", shortWindow);
      expect(result.count).toBe(1);
    });

    it("should track different keys separately", async () => {
      await store.increment("key-a", 60000);
      await store.increment("key-a", 60000);
      await store.increment("key-b", 60000);

      const resultA = await store.increment("key-a", 60000);
      const resultB = await store.increment("key-b", 60000);

      expect(resultA.count).toBe(3);
      expect(resultB.count).toBe(2);
    });
  });

  describe("decrement", () => {
    it("should decrement count for existing key", async () => {
      await store.increment("test-key", 60000);
      await store.increment("test-key", 60000);
      await store.decrement("test-key");

      const result = await store.increment("test-key", 60000);
      expect(result.count).toBe(2);
    });

    it("should not go below zero", async () => {
      await store.increment("test-key", 60000);
      await store.decrement("test-key");
      await store.decrement("test-key");

      const result = await store.increment("test-key", 60000);
      expect(result.count).toBe(1);
    });
  });

  describe("reset", () => {
    it("should remove key from store", async () => {
      await store.increment("test-key", 60000);
      await store.increment("test-key", 60000);
      await store.reset("test-key");

      const result = await store.increment("test-key", 60000);
      expect(result.count).toBe(1);
    });
  });

  describe("shutdown", () => {
    it("should clear state so key starts over", async () => {
      await store.increment("test-key", 60000);
      await store.increment("test-key", 60000);

      await store.shutdown();

      const result = await store.increment("test-key", 60000);
      expect(result.count).toBe(1);
    });
  });
});
