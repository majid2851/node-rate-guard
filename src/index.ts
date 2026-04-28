export { rateGuard } from "./middleware/rateGuard.js";
export { MemoryStore } from "./stores/memoryStore.js";
export { RedisStore } from "./stores/redisStore.js";

export type {
  Store,
  StoreRecord,
  RateLimitInfo,
  RateGuardOptions,
} from "./stores/types.js";
