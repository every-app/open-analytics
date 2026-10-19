import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchPrivateJson,
  fetchPrivateJsonMutate,
  publicDashboardSiteId,
} from "@/lib/dashboard/client/request";
describe("dashboard client request helpers", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("dedupes concurrent GET requests by URL and clears the entry after settlement", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ ok: true, value: "shared" })),
      );
    globalThis.fetch = fetchMock;

    const [first, second] = await Promise.all([
      fetchPrivateJson<{ value: string }>("/api/private/example", {
        siteId: "site-1",
      }),
      fetchPrivateJson<{ value: string }>("/api/private/example", {
        siteId: "site-1",
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ ok: true, value: "shared" });
    expect(second).toEqual({ ok: true, value: "shared" });

    await fetchPrivateJson<{ value: string }>("/api/private/example", {
      siteId: "site-1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips dedupe when disabled or when a signal is provided", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ ok: true, value: "fresh" })),
      );
    globalThis.fetch = fetchMock;
    const signal = new AbortController().signal;

    await Promise.all([
      fetchPrivateJson(
        "/api/private/no-dedupe",
        { siteId: "site-1" },
        {
          dedupe: false,
        },
      ),
      fetchPrivateJson(
        "/api/private/no-dedupe",
        { siteId: "site-1" },
        {
          dedupe: false,
        },
      ),
      fetchPrivateJson(
        "/api/private/with-signal",
        { siteId: "site-1" },
        {
          signal,
        },
      ),
      fetchPrivateJson(
        "/api/private/with-signal",
        { siteId: "site-1" },
        {
          signal,
        },
      ),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      method: "GET",
      credentials: "include",
      signal,
    });
  });

  it("rewrites public dashboard GET requests and omits credentials", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ ok: true, value: "public" })),
      );
    globalThis.fetch = fetchMock;

    await expect(
      fetchPrivateJson("/api/private/overview", {
        siteId: publicDashboardSiteId("team site/one"),
        from: 1,
        to: 2,
      }),
    ).resolves.toEqual({ ok: true, value: "public" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/share/team%20site%2Fone/overview?from=1&to=2",
      expect.objectContaining({
        method: "GET",
        credentials: "omit",
      }),
    );
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("siteId=");
  });

  it("keeps public and private request dedupe keys separate", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ ok: true, value: "fresh" })),
      );
    globalThis.fetch = fetchMock;

    await Promise.all([
      fetchPrivateJson("/api/private/overview", { siteId: "site-1" }),
      fetchPrivateJson("/api/private/overview", {
        siteId: publicDashboardSiteId("site-1"),
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/private/overview?siteId=site-1",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/public/share/site-1/overview",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      credentials: "include",
    });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      credentials: "omit",
    });
  });

  it("throws AbortError before issuing a request when the signal is already aborted", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchPrivateJson("/api/private/aborted", undefined, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      name: "AbortError",
      message: "Aborted",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("includes response text in GET and mutate errors", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("get failed", { status: 503 }))
      .mockResolvedValueOnce(new Response("mutate failed", { status: 400 }));

    await expect(fetchPrivateJson("/api/private/fail")).rejects.toThrow(
      "Request failed (503 /api/private/fail): get failed",
    );
    await expect(
      fetchPrivateJsonMutate("/api/private/fail-mutate", "DELETE"),
    ).rejects.toThrow(
      "Request failed (400 /api/private/fail-mutate): mutate failed",
    );
  });

  it("serializes mutation params and optional JSON bodies", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ ok: true, saved: true })),
      );
    globalThis.fetch = fetchMock;

    await expect(
      fetchPrivateJsonMutate(
        "/api/private/sites",
        "POST",
        { siteId: "site 1" },
        { name: "Docs" },
      ),
    ).resolves.toEqual({ ok: true, saved: true });
    await fetchPrivateJsonMutate("/api/private/sites", "DELETE", {
      siteId: "site-2",
    });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/private/sites?siteId=site+1");
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Docs" }),
    });
    expect(fetchMock.mock.calls[1][1]).toEqual({
      method: "DELETE",
      credentials: "include",
      cache: "no-store",
    });
  });
});
