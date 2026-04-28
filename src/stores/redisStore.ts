import type { Store, StoreRecord } from "./types.js";

type RedisClientLike = {
  multi(): {
    incr(key: string): unknown;
    pTTL(key: string): unknown;
    pExpire(key: string, ms: number): unknown;
    exec(): Promise<Array<unknown> | null>;
  };
  decr(key: string): Promise<number>;
  del(key: string): Promise<number>;
  quit?(): Promise<unknown>;
  disconnect?(): Promise<void>;
};

interface RedisStoreOptions {
  prefix?: string;
  client: RedisClientLike;
}

export class RedisStore implements Store {
  private client: RedisClientLike;
  private prefix: string;

  constructor(options: RedisStoreOptions) {
    this.client = options.client;
    this.prefix = options.prefix ?? "rate-guard:";
  }

  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async increment(key: string, windowMs: number): Promise<StoreRecord> {
    const prefixedKey = this.prefixKey(key);

    const multi = this.client.multi();
    multi.incr(prefixedKey);
    multi.pTTL(prefixedKey);

    const results = await multi.exec();

    if (!results) {
      throw new Error("Redis transaction failed");
    }

    const count = results[0] as number;
    let ttl = results[1] as number;

    if (ttl < 0) {
      const setTtl = this.client.multi();
      setTtl.pExpire(prefixedKey, windowMs);
      await setTtl.exec();
      ttl = windowMs;
    }

    const resetAt = Date.now() + Math.max(ttl, 0);

    return { count, resetAt };
  }

  async decrement(key: string): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    await this.client.decr(prefixedKey);
  }

  async reset(key: string): Promise<void> {
    const prefixedKey = this.prefixKey(key);
    await this.client.del(prefixedKey);
  }

  async shutdown(): Promise<void> {
    if (this.client.quit) {
      await this.client.quit();
    } else if (this.client.disconnect) {
      await this.client.disconnect();
    }
  }
}
