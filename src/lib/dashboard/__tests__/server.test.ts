import type * as ReactModule from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildSitePath,
  getDashboardTeamContext,
  getSiteSlug,
  getTeamSiteContext,
} from "@/lib/dashboard/server";

const mocks = vi.hoisted(() => ({
  session: vi.fn<() => Promise<unknown>>(),
  sites: vi.fn<(teamId: string) => Promise<unknown>>(),
  notifications: vi.fn<() => Promise<unknown>>(),
  resolveEdgeRuntime: vi.fn(),
}));
vi.mock("@/lib/edge/admin/service/index", () => ({
  readAdminService: (input: { route: string; url: URL }) => {
    if (input.route === "session") return mocks.session();
    if (input.route === "sites") {
      return mocks.sites(input.url.searchParams.get("teamId") ?? "");
    }
    if (input.route === "notifications") return mocks.notifications();
    return null;
  },
}));
vi.mock("@/lib/edge/runtime", () => ({
  resolveEdgeRuntime: mocks.resolveEdgeRuntime,
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => new Request("https://app.test/app"),
}));
// React's request cache would memoize across tests.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactModule>();
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  };
});

const team = {
  id: "team-1",
  name: "Acme",
  slug: "acme",
  createdAt: 1,
  siteCount: 2,
};

function site(input: { id: string; domain: string }) {
  return {
    teamId: "team-1",
    name: "Site",
    publicEnabled: true,
    publicSlug: null,
    createdAt: 1,
    updatedAt: 2,
    ...input,
  };
}

describe("dashboard server helpers", () => {
  beforeEach(() => {
    mocks.session.mockResolvedValue({ user: { id: "user-1" }, teams: [team] });
    mocks.sites.mockResolvedValue([
      site({ id: "site-1", domain: "Docs.Example.test" }),
      site({ id: "site-2", domain: "blog.example.test" }),
    ]);
    mocks.notifications.mockResolvedValue({ unreadAttentionCount: 3 });
    mocks.resolveEdgeRuntime.mockResolvedValue({
      request: new Request("https://app.test/app"),
      env: { GATEWAY_URL: "https://gateway.test" },
      url: new URL("https://app.test/app"),
    });
  });

  it("builds stable site slugs from domain or id", () => {
    expect(
      getSiteSlug(site({ id: "site-1", domain: "Docs.EXAMPLE.test" })),
    ).toBe("docs-example-test");
    expect(getSiteSlug(site({ id: "abcdef123456", domain: "" }))).toBe(
      "abcdef12",
    );
    expect(buildSitePath("en", "docs-example-test", "events")).toBe(
      "/en/app/sites/docs-example-test/events",
    );
  });

  it("returns the organization's workspace with slugged sites", async () => {
    await expect(getDashboardTeamContext()).resolves.toEqual({
      user: { id: "user-1" },
      activeTeam: team,
      sites: [
        expect.objectContaining({ id: "site-1", slug: "docs-example-test" }),
        expect.objectContaining({ id: "site-2", slug: "blog-example-test" }),
      ],
      unreadAttentionCount: 3,
      gatewayUrl: "https://gateway.test",
    });
    expect(mocks.sites).toHaveBeenCalledWith("team-1");
  });

  it("falls back when sites, notifications, or the gateway URL are unavailable", async () => {
    mocks.sites.mockRejectedValue(new Error("edge unavailable"));
    mocks.notifications.mockRejectedValue(new Error("unavailable"));
    mocks.resolveEdgeRuntime.mockResolvedValue({
      request: new Request("https://app.test/app"),
      env: {},
      url: new URL("https://app.test/app"),
    });

    await expect(getDashboardTeamContext()).resolves.toMatchObject({
      sites: [],
      unreadAttentionCount: 0,
      gatewayUrl: "/",
    });
  });

  it("returns null without a signed-in person or workspace", async () => {
    mocks.session.mockRejectedValueOnce(new Error("not signed in"));
    await expect(getDashboardTeamContext()).resolves.toBeNull();

    mocks.session.mockResolvedValueOnce(null);
    await expect(getDashboardTeamContext()).resolves.toBeNull();

    mocks.session.mockResolvedValueOnce({ user: { id: "user-1" }, teams: [] });
    await expect(getDashboardTeamContext()).resolves.toBeNull();
  });

  it("resolves a site by slug or id and returns null for unknown sites", async () => {
    await expect(
      getTeamSiteContext("docs-example-test"),
    ).resolves.toMatchObject({
      activeTeam: { id: "team-1" },
      activeSite: { id: "site-1", slug: "docs-example-test" },
    });
    await expect(getTeamSiteContext("site-2")).resolves.toMatchObject({
      activeSite: { id: "site-2", slug: "blog-example-test" },
    });
    await expect(getTeamSiteContext("missing")).resolves.toBeNull();
  });
});
