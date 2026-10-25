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
function forwarded(): Request {
  return vi.mocked(apiApp.fetch).mock.calls[0]![0];
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
});
