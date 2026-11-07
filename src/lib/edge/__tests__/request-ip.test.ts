import { describe, expect, it } from "vitest";

import { requestIp } from "@/lib/edge/collector/request-ip";

describe("requestIp", () => {
  it("extracts request IPs from Cloudflare and proxy headers", () => {
    expect(
      requestIp(
        new Request("https://collector.test/collect", {
          headers: {
            "cf-connecting-ip": "203.0.113.1",
            "x-forwarded-for": "203.0.113.2, 203.0.113.3",
            "x-real-ip": "203.0.113.4",
          },
        }),
      ),
    ).toBe("203.0.113.1");
    expect(
      requestIp(
        new Request("https://collector.test/collect", {
          headers: { "x-forwarded-for": "203.0.113.2, 203.0.113.3" },
        }),
      ),
    ).toBe("203.0.113.2");
    expect(
      requestIp(
        new Request("https://collector.test/collect", {
          headers: { "x-real-ip": "203.0.113.4" },
        }),
      ),
    ).toBe("203.0.113.4");
    expect(requestIp(new Request("https://collector.test/collect"))).toBe(
      "0.0.0.0",
    );
  });
});
