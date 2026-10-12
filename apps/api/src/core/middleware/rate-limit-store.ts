export interface RateLimitHit {
  /** Requests counted in the current window, including this one. */
  count: number;
  /** Epoch milliseconds when the current window ends. */
  resetAt: number;
}

/** Counter storage for the rate limiter. Swap the in-memory store for Redis to share limits. */
export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitHit>;
}

/** Fixed-window counters in process memory. Limits are per instance. */
export class MemoryRateLimitStore implements RateLimitStore {
  readonly #windows = new Map<string, RateLimitHit>();
  readonly #now: () => number;
  #nextSweepAt = 0;

  constructor(options: { now?: () => number } = {}) {
    this.#now = options.now ?? Date.now;
  }

  get size() {
    return this.#windows.size;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitHit> {
    const now = this.#now();
    if (now >= this.#nextSweepAt) {
      this.sweep();
      this.#nextSweepAt = now + windowMs;
    }

    const current = this.#windows.get(key);
    const hit =
      current && current.resetAt > now
        ? { count: current.count + 1, resetAt: current.resetAt }
        : { count: 1, resetAt: now + windowMs };
    this.#windows.set(key, hit);
    return { ...hit };
  }

  /** Drops expired windows. Also runs automatically about once per window. */
  sweep() {
    const now = this.#now();
    for (const [key, hit] of this.#windows) {
      if (hit.resetAt <= now) this.#windows.delete(key);
    }
  }
}
