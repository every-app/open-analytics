import { describe, expect, it } from "vitest";

import {
  gatewayHostname,
  readThemeCookie,
  readThemeScript,
  resolveThemePreference,
  themeCookieDomain,
  themeCookieString,
} from "@/lib/theme-cookie";

describe("readThemeCookie", () => {
  it("finds the pick among other cookies", () => {
    expect(readThemeCookie("a=1; everyapp-theme=dark; b=2")).toBe("dark");
    expect(readThemeCookie("everyapp-theme=system")).toBe("system");
  });

  it("ignores missing, unknown and look-alike values", () => {
    expect(readThemeCookie("")).toBeNull();
    expect(readThemeCookie("everyapp-theme=blue")).toBeNull();
    expect(readThemeCookie("x-everyapp-theme=dark")).toBeNull();
    expect(readThemeCookie("everyapp-theme=darker")).toBeNull();
  });
});

describe("resolveThemePreference", () => {
  it("prefers the cookie, then light or dark from storage, then system", () => {
    expect(resolveThemePreference("everyapp-theme=system", "dark")).toBe(
      "system",
    );
    expect(resolveThemePreference("", "light")).toBe("light");
    expect(resolveThemePreference("", "system")).toBe("system");
    expect(resolveThemePreference("", null)).toBe("system");
  });
});

describe("gatewayHostname", () => {
  it("reads the hostname, or null without a usable URL", () => {
    expect(gatewayHostname("https://team.example.com/")).toBe(
      "team.example.com",
    );
    expect(gatewayHostname("http://localhost:8787")).toBe("localhost");
    expect(gatewayHostname(undefined)).toBeNull();
    expect(gatewayHostname("/")).toBeNull();
  });
});

describe("themeCookieDomain", () => {
  it("shares on the gateway host and its subdomains only", () => {
    expect(
      themeCookieDomain("analytics.team.example.com", "team.example.com"),
    ).toBe("team.example.com");
    expect(themeCookieDomain("Team.Example.com.", "team.example.com")).toBe(
      "team.example.com",
    );
    expect(
      themeCookieDomain("evilteam.example.com", "team.example.com"),
    ).toBeNull();
    expect(themeCookieDomain("stats.acme.com", "team.example.com")).toBeNull();
    expect(themeCookieDomain("analytics.example.com", null)).toBeNull();
  });
});

describe("themeCookieString", () => {
  it("matches the launcher's cookie", () => {
    expect(themeCookieString("dark", "team.example.com", true)).toBe(
      "everyapp-theme=dark; Domain=team.example.com; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
    );
  });

  it("is host-only and not Secure on plain localhost", () => {
    expect(themeCookieString("system", "localhost", false)).toBe(
      "everyapp-theme=system; Path=/; Max-Age=31536000; SameSite=Lax",
    );
  });
});

describe("readThemeScript", () => {
  function run(cookie: string, stored: string | null): string {
    const read = new Function(
      "document",
      "localStorage",
      `${readThemeScript}return t;`,
    );
    return read({ cookie }, { getItem: () => stored });
  }

  it("reads the cookie first, then storage, then system", () => {
    expect(run("everyapp-theme=light", "dark")).toBe("light");
    expect(run("", "dark")).toBe("dark");
    expect(run("", null)).toBe("system");
  });
});
