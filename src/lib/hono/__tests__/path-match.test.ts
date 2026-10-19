import { describe, expect, it } from "vitest";

import { shouldUseHono } from "@/lib/hono/path-match";

describe("shouldUseHono", () => {
  it.each([
    "/api",
    "/api/private/overview",
    "/api/public/share/demo/site",
    "/api/public/resources/world-countries",
    "/api/public/resources/map/v1/styles/light/style.json",
    "/collect",
    "/script.js",
    "/healthz",
    "/api/private/realtime/ws",
    "/api/private/realtime/ws/extra",
  ])("routes %s through the Hono app", (pathname) => {
    expect(shouldUseHono(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/app",
    "/login",
    "/zh/app/team/site",
    "/_next/static/chunk.js",
    "/favicon.ico",
    "/collect/",
    "/admin/ws",
    "/admin/users",
    "/notification-email-preview",
    "/.well-known/security.txt",
  ])("leaves %s on the application router path", (pathname) => {
    expect(shouldUseHono(pathname)).toBe(false);
  });
});
