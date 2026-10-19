import { classifyASN } from "asn-blocklist";
import { describe, expect, it, vi } from "vitest";

import { classifyCollectBotTraffic } from "@/lib/edge/collector/bot-protection";
import type { TrackerClientPayload } from "@/lib/edge/types";
vi.mock("asn-blocklist", () => ({
  classifyASN: vi.fn((asn: unknown) => {
    if (Number(asn) === 13335) return "hosting";
    if (Number(asn) === 9009) return "network_service";
    if (Number(asn) === 4134) return "transit";
    if (Number(asn) === 7922) return "access";
    return "unknown";
  }),
}));
const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
function request(headers: HeadersInit, cf?: Record<string, unknown>): Request {
  const inputHeaders = new Headers(headers);
  const req = new Request("https://collector.test/collect", {
    method: "POST",
    headers: inputHeaders,
  });
  vi.spyOn(req.headers, "get").mockImplementation((name) =>
    inputHeaders.get(name),
  );
  if (cf) {
    Object.defineProperty(req, "cf", {
      value: cf,
      configurable: true,
    });
  }
  return req;
}
const payload: TrackerClientPayload = {
  siteId: "site-1",
  kind: "pageview",
  visitId: "visit-1",
  pathname: "/pricing",
  hostname: "example.com",
};
describe("bot protection", () => {
  it("classifies known bot user agents as bot traffic", () => {
    const result = classifyCollectBotTraffic({
      request: request({
        "user-agent": "Googlebot/2.1",
        origin: "https://example.com",
      }),
      payload,
      origin: "https://example.com",
    });

    expect(result).toMatchObject({
      category: "bot",
    });
    expect(result.reasons).toContain("ua_isbot");
  });

  it("classifies script user agents as bot traffic", () => {
    const result = classifyCollectBotTraffic({
      request: request({
        "user-agent": "curl/8.14.1",
        origin: "https://example.com",
      }),
      payload,
      origin: "https://example.com",
    });

    expect(result).toMatchObject({
      category: "bot",
    });
    expect(result.reasons).toContain("script_ua");
  });

  it("classifies verified bot categories as bot traffic", () => {
    const result = classifyCollectBotTraffic({
      request: request(
        {
          "user-agent": CHROME_UA,
          origin: "https://example.com",
        },
        { verifiedBotCategory: "Search Engine Crawler" },
      ),
      payload,
      origin: "https://example.com",
    });

    expect(result).toMatchObject({
      category: "bot",
    });
    expect(result.reasons).toContain("cf_verified_bot_category");
  });

  it("classifies configured hosting ASNs as suspected bot traffic", () => {
    const result = classifyCollectBotTraffic({
      request: request(
        {
          "user-agent": CHROME_UA,
          origin: "https://example.com",
        },
        {
          asn: 13335,
          asOrganization: "Cloudflare Inc.",
        },
      ),
      payload,
      origin: "https://example.com",
    });

    expect(result).toMatchObject({
      category: "suspected_bot",
    });
    expect(result.reasons).toContain("hosting_asn");
    expect(vi.mocked(classifyASN)).toHaveBeenCalledWith(13335);
  });

  it("does not classify AS organization names without a risky ASN class", () => {
    vi.mocked(classifyASN).mockReturnValueOnce("unknown");
    const result = classifyCollectBotTraffic({
      request: request(
        {
          "user-agent": CHROME_UA,
          origin: "https://example.com",
          "sec-fetch-site": "cross-site",
        },
        {
          asn: 64512,
          asOrganization: "Amazon Data Services Singapore",
        },
      ),
      payload,
      origin: "https://example.com",
    });

    expect(result).toEqual({
      category: "normal",
      reasons: [],
    });
  });

  it("keeps network-service ASNs on the main lane when browser provenance is present", () => {
    const result = classifyCollectBotTraffic({
      request: request(
        {
          "user-agent": CHROME_UA,
          origin: "https://example.com",
          "sec-fetch-site": "cross-site",
        },
        {
          asn: 9009,
          asOrganization: "M247 Global",
        },
      ),
      payload,
      origin: "https://example.com",
    });

    expect(result).toEqual({
      category: "normal",
      reasons: ["network_service_asn"],
    });
  });

  it("classifies network-service ASNs with missing browser provenance as suspected bot traffic", () => {
    const result = classifyCollectBotTraffic({
      request: request(
        {
          "user-agent": CHROME_UA,
        },
        {
          asn: 9009,
          asOrganization: "M247 Global",
        },
      ),
      payload,
      origin: "https://example.com",
    });

    expect(result).toMatchObject({
      category: "suspected_bot",
    });
    expect(result.reasons).toEqual([
      "network_service_asn",
      "missing_browser_provenance",
    ]);
  });

  it("does not divert transit or access ASNs on ASN class alone", () => {
    const transit = classifyCollectBotTraffic({
      request: request(
        {
          "user-agent": CHROME_UA,
          origin: "https://example.com",
          "sec-fetch-site": "cross-site",
        },
        {
          asn: 4134,
          asOrganization: "China Telecom",
        },
      ),
      payload,
      origin: "https://example.com",
    });
    const access = classifyCollectBotTraffic({
      request: request(
        {
          "user-agent": CHROME_UA,
          origin: "https://example.com",
          "sec-fetch-site": "cross-site",
        },
        {
          asn: 7922,
          asOrganization: "Comcast",
        },
      ),
      payload,
      origin: "https://example.com",
    });

    expect(transit).toEqual({
      category: "normal",
      reasons: ["transit_asn"],
    });
    expect(access).toEqual({
      category: "normal",
      reasons: ["access_asn"],
    });
  });

  it("keeps normal browser requests on the main lane", () => {
    const result = classifyCollectBotTraffic({
      request: request({
        "user-agent": CHROME_UA,
        origin: "https://example.com",
        "sec-fetch-site": "cross-site",
      }),
      payload,
      origin: "https://example.com",
    });

    expect(result).toEqual({
      category: "normal",
      reasons: [],
    });
  });
});
