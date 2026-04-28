import type { Store, StoreRecord } from "./types.js";

interface MemoryStoreOptions {
  cleanupInterval?: number;
}

export class MemoryStore implements Store {
  private store: Map<string, StoreRecord> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: MemoryStoreOptions = {}) {
    const cleanupInterval = options.cleanupInterval ?? 60_000;

    if (cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, cleanupInterval);

      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  async increment(key: string, windowMs: number): Promise<StoreRecord> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.resetAt > now) {
      existing.count += 1;
      return { count: existing.count, resetAt: existing.resetAt };
    }

    const record: StoreRecord = {
      count: 1,
      resetAt: now + windowMs,
    };
    this.store.set(key, record);
    return record;
  }

  async decrement(key: string): Promise<void> {
    const existing = this.store.get(key);
    if (existing && existing.count > 0) {
      existing.count -= 1;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
