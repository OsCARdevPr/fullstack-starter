import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { createTestDeps } from "../../test/fakes";

const socket = (remoteAddress: string) => ({
  incoming: { socket: { remoteAddress, remotePort: 51000, remoteFamily: "IPv4" } },
});

function createRecordingApp(env: Record<string, string> = {}) {
  const received: Request[] = [];
  const app = createApp(
    createTestDeps({
      env,
      authHandler: async (request) => {
        received.push(request);
        return Response.json({ ok: true });
      },
    }),
  );
  return { app, received };
}

describe("auth module", () => {
  it.each(["GET", "POST"])("forwards %s /api/auth/* to the Better Auth handler", async (method) => {
    const { app, received } = createRecordingApp();

    const response = await app.request(
      "/api/auth/get-session",
      { method, headers: { origin: "http://localhost:5173" } },
      socket("203.0.113.5"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(/\S+/);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(received).toHaveLength(1);
    expect(new URL(received[0]?.url ?? "").pathname).toBe("/api/auth/get-session");
  });

  it("replaces a spoofed X-Forwarded-For with the socket address", async () => {
    const { app, received } = createRecordingApp();

    await app.request(
      "/api/auth/sign-in/email",
      { method: "POST", headers: { "x-forwarded-for": "198.51.100.7" }, body: "{}" },
      socket("203.0.113.5"),
    );

    expect(received[0]?.headers.get("x-forwarded-for")).toBe("203.0.113.5");
    expect(await received[0]?.text()).toBe("{}");
  });

  it("forwards the client address chosen by the trusted proxy when TRUST_PROXY is on", async () => {
    const { app, received } = createRecordingApp({ TRUST_PROXY: "true" });

    await app.request(
      "/api/auth/get-session",
      { headers: { "x-forwarded-for": "198.51.100.7, 192.0.2.44" } },
      socket("10.0.0.2"),
    );

    expect(received[0]?.headers.get("x-forwarded-for")).toBe("192.0.2.44");
  });
});
