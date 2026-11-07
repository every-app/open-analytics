import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPagesDashboard } from "@/lib/dashboard/client/data/pages";
import { dashboardFilterDocumentFromPresentation } from "@/lib/dashboard/filter-state";
import type { TimeWindow } from "@/lib/dashboard/query-state";
describe("dashboard client page data helpers", () => {
  const realFetch = globalThis.fetch;
  const window: TimeWindow = {
    preset: "7d",
    from: 1000,
    to: 2000,
    timeZone: "UTC",
    interval: "day",
  };

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    });
  }

  function pageData<T>(items: T[], limit = items.length, hasMore = false) {
    return {
      items,
      pagination: {
        limit,
        returned: items.length,
        hasMore,
        nextCursor: hasMore ? "next-cursor" : null,
      },
    };
  }

  function paramsFromCall(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
    const url = String(fetchMock.mock.calls[index][0]);
    return new URLSearchParams(url.split("?")[1] ?? "");
  }

  it("serializes page dashboard defaults, options, and filters", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ ok: true, data: pageData([], 12) })),
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchPagesDashboard(
      "pages-site",
      window,
      dashboardFilterDocumentFromPresentation({
        path: "/docs",
        sourceDomain: "example.com",
      }),
    );
    await fetchPagesDashboard("pages-site", window, undefined, {
      limit: 25,
      cursor: "pages-cursor",
    });

    expect(paramsFromCall(fetchMock, 0)).toMatchObject(
      new URLSearchParams({
        siteId: "pages-site",
        from: "1000",
        to: "2000",
        timeZone: "UTC",
        interval: "day",
        limit: "12",
        "filter[page.path]": "/docs",
        "filter[referrer.domain]": "example.com",
      }),
    );
    expect(paramsFromCall(fetchMock, 1).get("limit")).toBe("25");
    expect(paramsFromCall(fetchMock, 1).get("cursor")).toBe("pages-cursor");
  });
});
