import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { resolveClientIp } from "./client-ip";

function createApp(trustProxy: boolean) {
  return new Hono().get("/", (c) => c.text(resolveClientIp(c, { trustProxy }) ?? "unknown"));
}

const socket = (remoteAddress: string) => ({
  incoming: { socket: { remoteAddress, remotePort: 51000, remoteFamily: "IPv4" } },
});

describe("resolveClientIp", () => {
  it("uses the socket address and ignores X-Forwarded-For when the proxy is not trusted", async () => {
    const response = await createApp(false).request(
      "/",
      { headers: { "x-forwarded-for": "198.51.100.7" } },
      socket("203.0.113.5"),
    );
    expect(await response.text()).toBe("203.0.113.5");
  });

  it("uses the entry appended by the trusted proxy (rightmost) when TRUST_PROXY is on", async () => {
    const response = await createApp(true).request(
      "/",
      { headers: { "x-forwarded-for": "198.51.100.7, 192.0.2.44" } },
      socket("10.0.0.2"),
    );
    expect(await response.text()).toBe("192.0.2.44");
  });

  it("falls back to the socket address when a trusted proxy sent no header", async () => {
    const response = await createApp(true).request("/", {}, socket("10.0.0.2"));
    expect(await response.text()).toBe("10.0.0.2");
  });

  it("returns null when no connection information is available", async () => {
    const response = await createApp(false).request("/");
    expect(await response.text()).toBe("unknown");
  });
});
