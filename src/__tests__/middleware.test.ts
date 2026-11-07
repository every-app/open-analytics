import { describe, expect, it } from "vitest";

import type { Env } from "@/lib/edge/types";
import { resolvePageRequest } from "@/middleware";
const baseEnv = { MAIN_SECRET: "test-secret" } as unknown as Env;
function request(path: string): Request {
  return new Request(`https://app.test${path}`);
}
function location(path: string, env: Env = baseEnv) {
  return resolvePageRequest(request(path), env)?.headers.get("location");
}
describe("resolvePageRequest", () => {
  it("redirects an old locale-prefixed app link to its page and preserves search", () => {
    expect(location("/zh/app/sites/a?range=30d")).toBe(
      "https://app.test/sites/a?range=30d",
    );
  });

  it("redirects an old locale root and app entry to the home page", () => {
    expect(location("/zh?from=root")).toBe("https://app.test/?from=root");
    expect(location("/en/app")).toBe("https://app.test/");
  });

  it("redirects an old locale-prefixed share link", () => {
    expect(location("/ja/share/public-site/pages")).toBe(
      "https://app.test/share/public-site/pages",
    );
  });

  it("passes a page through", () => {
    expect(resolvePageRequest(request("/sites/a"), baseEnv)).toBeNull();
    expect(resolvePageRequest(request("/"), baseEnv)).toBeNull();
  });

  it("redirects to runtime configuration when no root secret exists", () => {
    expect(location("/sites/a?range=30d", {} as Env)).toBe(
      "https://app.test/runtime-config-error",
    );
  });

  it("allows the runtime configuration page without a secret", () => {
    expect(
      resolvePageRequest(request("/runtime-config-error"), {} as Env),
    ).toBeNull();
  });
});
