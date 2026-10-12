import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api-error";
import { createQueryClient, type RequestMeta, shouldRetry } from "./query-client";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const badRequest = new ApiError({ code: "BAD_REQUEST", status: 400, message: "Bad input." });
const unauthenticated = new ApiError({
  code: "UNAUTHENTICATED",
  status: 401,
  message: "Authentication required.",
});

function failWith(error: Error) {
  return async () => {
    throw error;
  };
}

/** Refetches a query that already has cached data, as a background refresh does. */
async function failRefetch(client: QueryClient, error: Error, meta?: RequestMeta) {
  client.setQueryData(["a"], { cached: true });
  await client
    .fetchQuery({ queryKey: ["a"], queryFn: failWith(error), staleTime: 0, meta })
    .catch(() => {});
}

describe("createQueryClient", () => {
  beforeEach(() => vi.mocked(toast.error).mockClear());

  it("shows a toast with the error message when a background refetch fails", async () => {
    const client = createQueryClient({ onUnauthenticated: vi.fn() });

    await failRefetch(client, badRequest);

    expect(toast.error).toHaveBeenCalledWith("Bad input.");
  });

  it("leaves a first-load query failure to the inline error state (no toast)", async () => {
    const client = createQueryClient({ onUnauthenticated: vi.fn() });

    await client.fetchQuery({ queryKey: ["a"], queryFn: failWith(badRequest) }).catch(() => {});

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("stays quiet for queries marked meta.silent", async () => {
    const client = createQueryClient({ onUnauthenticated: vi.fn() });

    await failRefetch(client, badRequest, { silent: true });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows a toast when a mutation fails", async () => {
    const client = createQueryClient({ onUnauthenticated: vi.fn() });
    const mutation = client.getMutationCache().build(client, { mutationFn: failWith(badRequest) });

    await mutation.execute(undefined).catch(() => {});

    expect(toast.error).toHaveBeenCalledWith("Bad input.");
  });

  it("leaves the error codes listed in meta.handledErrors to the caller", async () => {
    const client = createQueryClient({ onUnauthenticated: vi.fn() });
    const conflict = new ApiError({ code: "CONFLICT", status: 409, message: "Taken." });
    const mutation = (error: Error) =>
      client.getMutationCache().build(client, {
        mutationFn: failWith(error),
        meta: { handledErrors: ["CONFLICT"] },
      });

    await mutation(conflict)
      .execute(undefined)
      .catch(() => {});
    expect(toast.error).not.toHaveBeenCalled();

    await mutation(badRequest)
      .execute(undefined)
      .catch(() => {});
    expect(toast.error).toHaveBeenCalledWith("Bad input.");
  });

  it("clears the cache and calls onUnauthenticated when the session is gone", async () => {
    const onUnauthenticated = vi.fn();
    const client = createQueryClient({ onUnauthenticated });
    client.setQueryData(["private"], { secret: true });

    await client
      .fetchQuery({ queryKey: ["a"], queryFn: failWith(unauthenticated) })
      .catch(() => {});

    expect(onUnauthenticated).toHaveBeenCalledOnce();
    expect(client.getQueryData(["private"])).toBeUndefined();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("leaves UNAUTHENTICATED to silent callers", async () => {
    const onUnauthenticated = vi.fn();
    const client = createQueryClient({ onUnauthenticated });

    await client
      .fetchQuery({ queryKey: ["me"], queryFn: failWith(unauthenticated), meta: { silent: true } })
      .catch(() => {});

    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});

describe("shouldRetry", () => {
  it("never retries client errors", () => {
    expect(shouldRetry(0, badRequest)).toBe(false);
  });

  it("retries server and network errors twice", () => {
    const network = new ApiError({ code: "NETWORK_ERROR", status: 0, message: "Offline." });

    expect(shouldRetry(0, network)).toBe(true);
    expect(shouldRetry(1, new Error("boom"))).toBe(true);
    expect(shouldRetry(2, network)).toBe(false);
  });
});
