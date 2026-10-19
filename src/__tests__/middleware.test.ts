import { describe, expect, it } from "vitest";

import type { Env } from "@/lib/edge/types";
import { resolvePageRequest } from "@/middleware";
const baseEnv = { MAIN_SECRET: "test-secret" } as unknown as Env;
function request(path: string, headers?: HeadersInit): Request {
  return new Request(`https://app.test${path}`, { headers });
}
function location(path: string, env: Env = baseEnv, headers?: HeadersInit) {
  return resolvePageRequest(request(path, headers), env).response?.headers.get(
    "location",
  );
}
describe("resolvePageRequest", () => {
  it("localizes non-prefixed paths from the browser language and preserves search", () => {
    expect(
      location("/reports?range=30d", baseEnv, {
        "accept-language": "zh-CN,zh;q=0.9",
      }),
    ).toBe("https://app.test/zh/reports?range=30d");
  });

  it("falls back to the default locale when the browser language is unsupported", () => {
    expect(location("/", baseEnv, { "accept-language": "fr-CA" })).toBe(
      "https://app.test/en/app",
    );
  });

  it("redirects a locale root to its app entry", () => {
    expect(location("/zh?from=root")).toBe("https://app.test/zh/app?from=root");
  });

  it("passes a localized page through", () => {
    const decision = resolvePageRequest(request("/ja/app/sites/a"), baseEnv);
    expect(decision.response).toBeNull();
    expect(decision.locale).toBe("ja");
  });

  it("redirects to runtime configuration when no root secret exists", () => {
    expect(location("/en/app", {} as Env)).toBe(
      "https://app.test/en/runtime-config-error",
    );
  });

  it("allows the runtime configuration page without a secret", () => {
    expect(
      resolvePageRequest(request("/en/runtime-config-error"), {} as Env)
        .response,
    ).toBeNull();
  });

  it("accepts DAILY_SALT_SECRET as the configured root secret", () => {
    expect(
      resolvePageRequest(request("/en/app"), {
        DAILY_SALT_SECRET: "fallback-secret",
      } as Env).response,
    ).toBeNull();
  });
});
