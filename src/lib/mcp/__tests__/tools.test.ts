import { DEV_PRIVATE_KEY_PEM, DEV_PUBLIC_KEY_PEM } from "@every-app/sdk/dev";
import {
  IDENTITY_HEADER,
  mintIdentityJwt,
  mintSystemJwt,
  SYSTEM_HEADER,
  TOOLS_CALL_PATH,
  TOOLS_LIST_PATH,
} from "@every-app/sdk/internal";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveViewer } from "@/lib/edge/auth/viewer";
import { apiApp } from "@/lib/hono/app";
import worker from "@/server";

vi.mock("@tanstack/react-start/server-entry", () => ({
  default: { fetch: vi.fn() },
}));
vi.mock("@/lib/hono/app", () => {
  const app = { fetch: vi.fn() };
  return { apiApp: app, default: app };
});
vi.mock("@/lib/edge/auth/viewer", () => ({ resolveViewer: vi.fn() }));
const realtimeSnapshot = vi.hoisted(() => vi.fn());
vi.mock("@/lib/edge/analytics/providers/realtime/provider", () => ({
  RealtimeProvider: class {
    snapshot = realtimeSnapshot;
  },
}));

// The gateway signs every tool call; the dev keypair stands in for its key.
const ISSUER = "https://gateway.example.com";
const WORKER = "every-analytics";
const env = {
  EVERYAPP_IDENTITY_PUBLIC_KEYS: DEV_PUBLIC_KEY_PEM,
  EVERYAPP_IDENTITY_ISSUER: ISSUER,
  EVERYAPP_AUDIENCE: WORKER,
};
const ctx = { waitUntil: () => {} } as unknown as ExecutionContext;

async function callTool(name: string, args: Record<string, unknown>) {
  const identity = await mintIdentityJwt(DEV_PRIVATE_KEY_PEM, {
    subject: {
      sub: "user-1",
      email: "a@example.com",
      orgId: "org-1",
      orgRole: "member",
    },
    audience: WORKER,
    issuer: ISSUER,
    channel: "mcp",
    scopes: ["mcp:read", "mcp:write"],
    toolCall: { id: "call-1", name },
  });
  const response = await worker.fetch(
    new Request(`https://analytics.example.com${TOOLS_CALL_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [IDENTITY_HEADER]: identity,
      },
      body: JSON.stringify({ v: 1, name, arguments: args, callId: "call-1" }),
    }),
    env as never,
    ctx,
  );
  const body = (await response.json()) as {
    result: { content: Array<{ text: string }>; isError?: boolean };
  };
  return { text: body.result.content[0]!.text, isError: body.result.isError };
}

/** The request the tool sent to the private API. */
function forwarded(index = 0): Request {
  return vi.mocked(apiApp.fetch).mock.calls[index]![0];
}

/** Every request the tool sent, as method, path and query. */
function forwardedCalls(): Array<{
  method: string;
  path: string;
  params: Record<string, string>;
}> {
  return vi.mocked(apiApp.fetch).mock.calls.map(([request]) => {
    const url = new URL((request as Request).url);
    return {
      method: (request as Request).method,
      path: url.pathname,
      params: Object.fromEntries(url.searchParams),
    };
  });
}

async function forwardedBody(index = 0): Promise<unknown> {
  return forwarded(index).json();
}

describe("MCP tools", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(resolveViewer).mockResolvedValue({
      userId: "user-1",
      email: "a@example.com",
      teamId: "org-1",
      role: "member",
      isAdmin: false,
    });
    vi.mocked(apiApp.fetch).mockImplementation(async () =>
      Response.json({ ok: true, data: [] }),
    );
  });

  it("describes every tool to the gateway", async () => {
    const response = await worker.fetch(
      new Request(`https://analytics.example.com${TOOLS_LIST_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [SYSTEM_HEADER]: await mintSystemJwt(DEV_PRIVATE_KEY_PEM, {
            audience: WORKER,
            issuer: ISSUER,
            purpose: "tools.list",
          }),
        },
        body: JSON.stringify({ v: 1 }),
      }),
      env as never,
      ctx,
    );
    const body = (await response.json()) as {
      tools: unknown[];
      warnings?: string[];
    };

    // A tool the SDK can't describe (say, a description over 2,048
    // characters) is silently dropped from the catalog with a warning.
    expect(body.warnings).toBeUndefined();
    expect(body.tools).toHaveLength(15);
  });

  it("lists the caller's organization's sites as the caller", async () => {
    await callTool("list_sites", {});

    const request = forwarded();
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/private/admin/sites");
    expect(url.searchParams.get("teamId")).toBe("org-1");
    expect(request.headers.get(IDENTITY_HEADER)).toBeTruthy();
  });

  it("turns a period and a filter into the report's query", async () => {
    await callTool("get_site_report", {
      site_id: "site-1",
      report: "pages",
      period: "7d",
      filter: 'page.path eq "/pricing"',
    });

    const url = new URL(forwarded().url);
    const { from, to, ...rest } = Object.fromEntries(url.searchParams);
    expect(url.pathname).toBe("/api/private/pages");
    expect(Number(to) - Number(from)).toBe(7 * 24 * 60 * 60 * 1000);
    expect(rest).toEqual({
      siteId: "site-1",
      "filter[page.path]": "/pricing",
    });
  });

  it("answers bad arguments with a tool error", async () => {
    const badFilter = await callTool("get_site_report", {
      site_id: "site-1",
      report: "pages",
      filter: "page.path eq",
    });
    const badRange = await callTool("get_site_report", {
      site_id: "site-1",
      report: "pages",
      from: "2026-02-01",
      to: "2026-01-01",
    });

    expect(badFilter).toMatchObject({ isError: true });
    expect(badFilter.text).toMatch(/^Invalid filter/);
    expect(badRange).toEqual({
      isError: true,
      text: "from must be before to.",
    });
    expect(apiApp.fetch).not.toHaveBeenCalled();
  });

  it("explains a refused change", async () => {
    vi.mocked(apiApp.fetch).mockResolvedValue(
      Response.json({ ok: false }, { status: 403 }),
    );

    expect(
      await callTool("update_site", { site_id: "site-1", name: "New" }),
    ).toEqual({
      isError: true,
      text: "Only members of the organization can change sites and settings.",
    });
  });

  it("refuses a result too large for the agent", async () => {
    vi.mocked(apiApp.fetch).mockResolvedValue(
      Response.json({ ok: true, data: "x".repeat(900_000) }),
    );

    const result = await callTool("get_site_report", {
      site_id: "site-1",
      report: "pages",
    });

    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/too large/);
  });

  it("offers only the reports the dashboard still serves", async () => {
    const response = await worker.fetch(
      new Request(`https://analytics.example.com${TOOLS_LIST_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [SYSTEM_HEADER]: await mintSystemJwt(DEV_PRIVATE_KEY_PEM, {
            audience: WORKER,
            issuer: ISSUER,
            purpose: "tools.list",
          }),
        },
        body: JSON.stringify({ v: 1 }),
      }),
      env as never,
      ctx,
    );
    const { tools } = (await response.json()) as {
      tools: Array<{ name: string; inputSchema?: unknown; input?: unknown }>;
    };
    const report = JSON.stringify(
      tools.find((tool) => tool.name === "get_site_report"),
    );
    const settings = JSON.stringify(
      tools.find((tool) => tool.name === "update_tracking_settings"),
    );

    for (const kept of ["utm-source", "event-types", "goal-summary"]) {
      expect(report).toContain(`"${kept}"`);
    }
    for (const removed of [
      "sessions",
      "session-detail",
      "visitors",
      "visitor-detail",
      "retention",
      "performance",
    ]) {
      expect(report).not.toContain(`"${removed}"`);
    }
    expect(settings).not.toContain("performance_sample_rate");
  });

  it("compares the organization's sites over the period and filter", async () => {
    await callTool("get_organization_overview", {
      period: "24h",
      filter: 'utm.source eq "newsletter"',
    });

    const [call] = forwardedCalls();
    expect(call).toMatchObject({
      method: "GET",
      path: "/api/private/team-dashboard",
      params: { teamId: "org-1", "filter[utm.source]": "newsletter" },
    });
    expect(Number(call!.params.to) - Number(call!.params.from)).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("passes report parameters, a time zone, an interval and a limit through", async () => {
    await callTool("get_site_report", {
      site_id: "site-1",
      report: "events-records",
      from: "2026-01-01",
      to: "2026-01-02",
      time_zone: "Europe/Berlin",
      interval: "hour",
      limit: 10,
      params: { eventName: "signup" },
    });

    expect(forwardedCalls()[0]).toEqual({
      method: "GET",
      path: "/api/private/events-records",
      params: {
        eventName: "signup",
        siteId: "site-1",
        from: String(Date.parse("2026-01-01")),
        to: String(Date.parse("2026-01-02")),
        timeZone: "Europe/Berlin",
        interval: "hour",
        limit: "10",
      },
    });
    expect(
      await callTool("get_site_report", {
        site_id: "site-1",
        report: "pages",
        from: "not a date",
      }),
    ).toEqual({
      isError: true,
      text: "from is not an ISO 8601 date or time: not a date",
    });
  });

  it("checks the site before reading its realtime buffer", async () => {
    realtimeSnapshot.mockResolvedValue({
      activeNow: 2,
      events: [],
      visits: [],
    });

    const result = await callTool("get_realtime", {
      site_id: "site-1",
      limit: 5,
    });

    expect(forwardedCalls()).toEqual([
      {
        method: "GET",
        path: "/api/private/admin/site-config",
        params: { siteId: "site-1" },
      },
    ]);
    expect(realtimeSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: "site-1", limit: 5 }),
    );
    expect(JSON.parse(result.text)).toEqual({
      activeNow: 2,
      events: [],
      visits: [],
    });
  });

  it("reads a site's settings with its tracking snippet", async () => {
    vi.mocked(apiApp.fetch).mockImplementation(async (request) =>
      Response.json({
        ok: true,
        data: new URL((request as Request).url).pathname.endsWith("snippet")
          ? "<script />"
          : { trackHash: true },
      }),
    );

    const result = await callTool("get_site_settings", { site_id: "site-1" });

    expect(JSON.parse(result.text)).toEqual({
      settings: { trackHash: true },
      snippet: "<script />",
    });
    expect(forwardedCalls().map((call) => call.path)).toEqual([
      "/api/private/admin/site-config",
      "/api/private/admin/script-snippet",
    ]);
  });

  it("lists a site's saved filters", async () => {
    await callTool("list_saved_filters", { site_id: "site-1" });

    expect(forwardedCalls()[0]).toEqual({
      method: "GET",
      path: "/api/private/saved-filters",
      params: { siteId: "site-1" },
    });
  });

  it("changes only the tracking settings it is given", async () => {
    await callTool("update_tracking_settings", {
      site_id: "site-1",
      track_hash: true,
      ignore_do_not_track: false,
      domain_whitelist: ["docs.example.com"],
    });

    expect(forwardedCalls()[0]).toMatchObject({
      method: "POST",
      path: "/api/private/admin/site-config",
    });
    expect(await forwardedBody()).toEqual({
      siteId: "site-1",
      config: {
        trackHash: true,
        ignoreDoNotTrack: false,
        domainWhitelist: ["docs.example.com"],
      },
    });
    expect(
      await callTool("update_tracking_settings", { site_id: "site-1" }),
    ).toEqual({ isError: true, text: "Pass at least one setting to change." });
  });

  it("creates a site and returns its snippet", async () => {
    vi.mocked(apiApp.fetch).mockImplementation(async (request) =>
      Response.json({
        ok: true,
        data: new URL((request as Request).url).pathname.endsWith("snippet")
          ? "<script />"
          : { id: "site-9" },
      }),
    );

    const result = await callTool("create_site", {
      name: "Docs",
      domain: "docs.example.com",
    });

    expect(await forwardedBody()).toEqual({
      teamId: "org-1",
      name: "Docs",
      domain: "docs.example.com",
    });
    expect(forwardedCalls()[1]).toEqual({
      method: "GET",
      path: "/api/private/admin/script-snippet",
      params: { siteId: "site-9" },
    });
    expect(JSON.parse(result.text)).toEqual({
      site: { id: "site-9" },
      snippet: "<script />",
    });
  });

  it("renames a site with only the fields it is given", async () => {
    await callTool("update_site", { site_id: "site-1", domain: "new.example" });

    expect(await forwardedBody()).toEqual({
      intent: "update",
      siteId: "site-1",
      domain: "new.example",
    });
  });

  it("creates a funnel and replaces one by id", async () => {
    await callTool("save_funnel", {
      site_id: "site-1",
      name: "Signup",
      steps: [
        { name: "Pricing", filter: 'page.path eq "/pricing"' },
        { filter: 'event.name eq "signup"' },
      ],
      scope: "visitor",
      conversion_window_hours: 2,
    });
    await callTool("save_funnel", {
      site_id: "site-1",
      id: "funnel-1",
      name: "Signup",
      steps: [
        { filter: 'page.path eq "/pricing"' },
        { filter: 'event.name eq "signup"' },
      ],
    });

    expect(
      forwardedCalls().map(({ method, params }) => [method, params]),
    ).toEqual([
      ["POST", { siteId: "site-1" }],
      ["PATCH", { siteId: "site-1", id: "funnel-1" }],
    ]);
    expect(await forwardedBody(0)).toEqual({
      name: "Signup",
      filterDslVersion: 1,
      progressionScope: "visitor",
      conversionWindowMs: 2 * 60 * 60 * 1000,
      steps: [
        { id: "step-1", name: "Pricing", filterDsl: 'page.path eq "/pricing"' },
        { id: "step-2", filterDsl: 'event.name eq "signup"' },
      ],
    });
    expect(await forwardedBody(1)).toMatchObject({
      progressionScope: "session",
      conversionWindowMs: null,
    });
  });

  it("creates a goal and replaces one by id", async () => {
    await callTool("save_goal", {
      site_id: "site-1",
      name: "Signup",
      filter: 'event.name eq "signup"',
    });
    await callTool("save_goal", {
      site_id: "site-1",
      id: "goal-1",
      name: "Signup",
      filter: 'event.name eq "signup"',
    });

    expect(
      forwardedCalls().map(({ method, params }) => [method, params]),
    ).toEqual([
      ["POST", { siteId: "site-1" }],
      ["PATCH", { siteId: "site-1", id: "goal-1" }],
    ]);
    expect(await forwardedBody(0)).toEqual({
      name: "Signup",
      filterDslVersion: 1,
      filterDsl: 'event.name eq "signup"',
    });
  });

  it("turns public sharing on with a slug and off without one", async () => {
    await callTool("set_public_sharing", { site_id: "site-1", enabled: true });
    await callTool("set_public_sharing", {
      site_id: "site-1",
      enabled: true,
      slug: "docs-share",
    });
    await callTool("set_public_sharing", { site_id: "site-1", enabled: false });

    const [random, chosen, off] = (await Promise.all([
      forwardedBody(0),
      forwardedBody(1),
      forwardedBody(2),
    ])) as Array<{ publicEnabled: boolean; publicSlug?: string }>;
    expect(random).toMatchObject({ publicEnabled: true });
    expect(random!.publicSlug).toMatch(/^[a-z0-9-]{12}$/);
    expect(chosen).toMatchObject({
      publicEnabled: true,
      publicSlug: "docs-share",
    });
    expect(off).toEqual({
      intent: "update",
      siteId: "site-1",
      publicEnabled: false,
    });
  });

  it("deletes sites, funnels and goals", async () => {
    await callTool("delete_site", { site_id: "site-1" });
    const funnel = await callTool("delete_funnel", {
      site_id: "site-1",
      id: "funnel-1",
    });
    const goal = await callTool("delete_goal", {
      site_id: "site-1",
      id: "goal-1",
    });

    expect(await forwardedBody(0)).toEqual({
      intent: "remove",
      siteId: "site-1",
    });
    expect(forwardedCalls().slice(1)).toEqual([
      {
        method: "DELETE",
        path: "/api/private/funnels",
        params: { siteId: "site-1", id: "funnel-1" },
      },
      {
        method: "DELETE",
        path: "/api/private/goals",
        params: { siteId: "site-1", id: "goal-1" },
      },
    ]);
    expect(JSON.parse(funnel.text)).toEqual({ deleted: true });
    expect(JSON.parse(goal.text)).toEqual({ deleted: true });
  });

  it("reports missing, rejected and failed private API calls", async () => {
    vi.mocked(apiApp.fetch).mockResolvedValueOnce(
      Response.json({ ok: false }, { status: 404 }),
    );
    expect(await callTool("get_site_settings", { site_id: "missing" })).toEqual(
      { isError: true, text: "Not found. list_sites shows site ids." },
    );

    vi.mocked(apiApp.fetch).mockResolvedValueOnce(
      Response.json(
        { ok: false, error: { message: "Name is taken" } },
        { status: 409 },
      ),
    );
    expect(
      await callTool("update_site", { site_id: "site-1", name: "Taken" }),
    ).toEqual({ isError: true, text: "Name is taken" });

    vi.mocked(apiApp.fetch).mockResolvedValueOnce(
      Response.json({ ok: false, error: "Bad slug" }, { status: 400 }),
    );
    expect(
      await callTool("set_public_sharing", {
        site_id: "site-1",
        enabled: false,
      }),
    ).toEqual({ isError: true, text: "Bad slug" });

    vi.mocked(apiApp.fetch).mockResolvedValueOnce(
      new Response("down", { status: 503 }),
    );
    expect(
      await callTool("list_saved_filters", { site_id: "site-1" }),
    ).toMatchObject({ isError: true });
  });

  it("refuses an organization this deployment doesn't serve", async () => {
    vi.mocked(resolveViewer).mockResolvedValue(null);

    expect(await callTool("list_sites", {})).toEqual({
      isError: true,
      text: "This deployment doesn't serve your organization.",
    });
    expect(apiApp.fetch).not.toHaveBeenCalled();
  });
});
