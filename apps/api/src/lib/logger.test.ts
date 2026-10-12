import { describe, expect, it } from "vitest";
import { createCapturingLogger } from "../test/fakes";

describe("createLogger", () => {
  it("redacts credentials from logged request and response headers", () => {
    const { logger, lines } = createCapturingLogger();

    logger.info(
      {
        req: { headers: { authorization: "Bearer abc", cookie: "session=abc", accept: "*/*" } },
        res: { headers: { "set-cookie": "session=abc" } },
      },
      "request",
    );

    expect(lines[0]).toMatchObject({
      req: { headers: { authorization: "[REDACTED]", cookie: "[REDACTED]", accept: "*/*" } },
      res: { headers: { "set-cookie": "[REDACTED]" } },
    });
  });

  it("respects the configured level", () => {
    const { logger, lines } = createCapturingLogger("warn");
    logger.info("hidden");
    logger.warn("visible");
    expect(lines.map((line) => line.msg)).toEqual(["visible"]);
  });
});
