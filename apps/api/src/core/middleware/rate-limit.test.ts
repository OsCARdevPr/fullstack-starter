import { apiErrorBodySchema } from "@starter/contracts";
import { describe, expect, it } from "vitest";
import { createBareApp } from "../../test/bare-app";
import { rateLimit } from "./rate-limit";
import { MemoryRateLimitStore } from "./rate-limit-store";

function createClock(start = 1_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe("MemoryRateLimitStore", () => {
  it("counts hits per key inside a fixed window and resets afterwards", async () => {
    const clock = createClock();
    const store = new MemoryRateLimitStore({ now: clock.now });

    expect(await store.increment("a", 1000)).toEqual({ count: 1, resetAt: 1_001_000 });
    expect(await store.increment("a", 1000)).toEqual({ count: 2, resetAt: 1_001_000 });
    expect(await store.increment("b", 1000)).toEqual({ count: 1, resetAt: 1_001_000 });

    clock.advance(1000);
    expect(await store.increment("a", 1000)).toEqual({ count: 1, resetAt: 1_002_000 });
  });

  it("evicts expired windows so memory does not grow without bound", async () => {
    const clock = createClock();
    const store = new MemoryRateLimitStore({ now: clock.now });
    for (let index = 0; index < 50; index += 1) await store.increment(`key-${index}`, 1000);

    clock.advance(1000);
    store.sweep();

    expect(store.size).toBe(0);
  });
});

describe("rateLimit middleware", () => {
  function createApp(clock = createClock(), key = () => "client-1") {
    const store = new MemoryRateLimitStore({ now: clock.now });
    const app = createBareApp();
    app.use(rateLimit({ store, windowMs: 60_000, max: 2, keyGenerator: key, now: clock.now }));
    app.get("/ping", (c) => c.json({ data: "pong" }));
    return app;
  }

  it("allows requests up to the limit and advertises the remaining budget", async () => {
    const app = createApp();

    const first = await app.request("/ping");
    expect(first.status).toBe(200);
    expect(first.headers.get("ratelimit-limit")).toBe("2");
    expect(first.headers.get("ratelimit-remaining")).toBe("1");
    expect((await app.request("/ping")).status).toBe(200);
  });

  it("responds 429 RATE_LIMITED with Retry-After once the limit is exceeded", async () => {
    const clock = createClock();
    const app = createApp(clock);
    await app.request("/ping");
    await app.request("/ping");
    clock.advance(15_000);

    const response = await app.request("/ping");
    const body = apiErrorBodySchema.parse(await response.json());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
    expect(response.headers.get("x-request-id")).toBe(body.error.requestId);
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.details).toEqual({ retryAfterSeconds: 45 });
  });

  it("tracks each client key independently", async () => {
    let client = "client-1";
    const app = createApp(createClock(), () => client);
    await app.request("/ping");
    await app.request("/ping");

    client = "client-2";
    expect((await app.request("/ping")).status).toBe(200);
  });
});
