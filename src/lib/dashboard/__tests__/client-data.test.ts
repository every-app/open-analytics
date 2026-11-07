import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  decodeHashLabel,
  decodeQueryLabel,
  emptyOverviewClientDimensionTabsData,
  emptyOverviewGeoDimensionTabsData,
  emptyOverviewGeoPointsData,
  fetchEventTypeFieldValues,
  fetchEventTypesTab,
  fetchFilterValues,
  fetchFunnelDetail,
  fetchFunnels,
  fetchOverview,
  fetchOverviewClientDimensionTab,
  fetchOverviewGeoDimensionTabPage,
  fetchOverviewGeoPoints,
  fetchOverviewPageCardTab,
  fetchOverviewSourceCardTab,
  fetchPageCardTabs,
  fetchPageHashTab,
  fetchPages,
  fetchPagesDashboard,
  fetchPagesShareTrend,
  fetchReferrers,
  fetchTrend,
  fetchUtmDimension,
  normalizeOverviewRows,
  toQueryString,
  withFilters,
} from "@/lib/dashboard/client/data";
import { withComparison } from "@/lib/dashboard/client/utils";
import { dashboardFilterDocumentFromPresentation } from "@/lib/dashboard/filter-state";
import { attachFilterScopePreference } from "@/lib/filter-contract";
describe("Dashboard Client Data Processing Utilities", () => {
  const emptyPaginatedCollection = {
    items: [],
    pagination: {
      limit: 1,
      returned: 0,
      hasMore: false,
      nextCursor: null,
    },
  };

  describe("normalizeOverviewRows", () => {
    it("should correctly normalize standard valid rows", () => {
      const input = [
        { label: "Chrome", views: 120, sessions: 60, visitors: 45 },
        { label: "Firefox", views: 40, sessions: 20, visitors: 15 },
      ];
      const result = normalizeOverviewRows(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: "Chrome",
        views: 120,
        sessions: 60,
        visitors: 45,
      });
      expect(result[1]).toEqual({
        label: "Firefox",
        views: 40,
        sessions: 20,
        visitors: 15,
      });
    });

    it("should safely fall back label to value if label is missing", () => {
      const input = [{ value: "Safari", views: 10 }];
      const result = normalizeOverviewRows(input);
      expect(result[0].label).toBe("Safari");
    });

    it("should fall back to value when label is blank", () => {
      const input = [
        { label: "   ", value: "Edge", views: null, sessions: null },
      ];
      const result = normalizeOverviewRows(input as any);
      expect(result[0]).toEqual({
        value: "Edge",
        label: "Edge",
        views: 0,
        sessions: 0,
        visitors: 0,
      });
    });

    it("should handle missing fields and string values gracefully by fallback to zero", () => {
      const input = [{ label: "Opera", views: "50", sessions: undefined }];
      const result = normalizeOverviewRows(input);
      expect(result[0].views).toBe(50);
      expect(result[0].sessions).toBe(0);
      expect(result[0].visitors).toBe(0);
    });

    it("should normalize comparison reference and change metrics", () => {
      const result = normalizeOverviewRows([
        {
          key: "edge",
          value: "Edge",
          label: "Edge",
          views: "10",
          sessions: 5,
          visitors: 4,
          reference: { views: "8", sessions: null, visitors: undefined },
          change: {
            views: { absolute: "2", relative: 0.25 },
            sessions: null,
            visitors: { absolute: 1, relative: null },
          },
        },
      ]);

      expect(result[0]).toEqual({
        key: "edge",
        value: "Edge",
        label: "Edge",
        views: 10,
        sessions: 5,
        visitors: 4,
        reference: { views: 8, sessions: 0, visitors: 0 },
        change: {
          views: { absolute: 2, relative: 0.25 },
          sessions: { absolute: 0, relative: null },
          visitors: { absolute: 1, relative: null },
        },
      });
    });

    it("should return empty array for non-array inputs", () => {
      expect(normalizeOverviewRows(undefined)).toEqual([]);
      expect(normalizeOverviewRows(null as any)).toEqual([]);
      expect(normalizeOverviewRows({} as any)).toEqual([]);
    });
  });

  describe("decodeHashLabel & decodeQueryLabel", () => {
    it("should parse simple hashes and queries adding prefixes if missing", () => {
      expect(decodeHashLabel("pricing")).toBe("#pricing");
      expect(decodeHashLabel("#pricing")).toBe("#pricing");

      expect(decodeQueryLabel("ref=google")).toBe("?ref=google");
      expect(decodeQueryLabel("?ref=google")).toBe("?ref=google");
    });

    it("should decode encoded URL fragments correctly", () => {
      // %E4%B8%AD%E6%96%87 is "中文"
      expect(decodeHashLabel("%E4%B8%AD%E6%96%87")).toBe("#中文");
      expect(decodeQueryLabel("q=%E4%B8%AD%E6%96%87")).toBe("?q=中文");
    });

    it("should gracefully handle malformed URL encoding without crashing", () => {
      const malformed = "%E0%A%AB"; // Invalid URI sequence
      expect(decodeHashLabel(malformed)).toBe(`#${malformed}`);
      expect(decodeQueryLabel(malformed)).toBe(`?${malformed}`);
    });

    it("should return empty string for empty inputs", () => {
      expect(decodeHashLabel("")).toBe("");
      expect(decodeHashLabel("   ")).toBe("");
      expect(decodeQueryLabel(null as any)).toBe("");
    });

    it("should return empty string for bare hash and query prefixes", () => {
      expect(decodeHashLabel("#")).toBe("");
      expect(decodeQueryLabel("?")).toBe("");
    });
  });

  describe("toQueryString & withFilters", () => {
    it("should compile flat objects into valid URI query parameters", () => {
      const params = { siteId: "123", limit: 10 };
      expect(toQueryString(params)).toBe("?siteId=123&limit=10");
      expect(toQueryString({})).toBe("");
      expect(toQueryString(undefined)).toBe("");
    });

    it("should correctly map filters into request parameters object", () => {
      const baseParams = { siteId: "123" };
      const filters = dashboardFilterDocumentFromPresentation({
        country: "US",
        browser: "Chrome",
        path: "/docs",
      });

      const withResult = withFilters(baseParams, filters);
      expect(withResult.siteId).toBe("123");
      expect(withResult["filter[geo.country]"]).toBe("us");
      expect(withResult["filter[client.browser]"]).toBe("Chrome");
      expect(withResult["filter[page.path]"]).toBe("/docs");
    });

    it("passes the resolved scope alongside the filter expression", () => {
      const filters = attachFilterScopePreference(
        dashboardFilterDocumentFromPresentation({ path: "/docs" }),
        "visitor",
      );

      expect(withFilters({ siteId: "123" }, filters)).toMatchObject({
        siteId: "123",
        scope: "visitor",
        "filter[page.path]": "/docs",
      });
      expect(
        withFilters({ siteId: "123", scope: "event" }, filters, "session"),
      ).toMatchObject({ scope: "session" });
    });

    it("should skip mapping filters if filters object is empty or undefined", () => {
      const baseParams = { siteId: "123" };
      expect(withFilters(baseParams, undefined)).toEqual(baseParams);
    });

    it("should omit a scope preference when the filter document is empty", () => {
      const filters = attachFilterScopePreference(
        dashboardFilterDocumentFromPresentation({}),
        "visitor",
      );

      expect(withFilters({ siteId: "123" }, filters)).toEqual({
        siteId: "123",
      });
    });

    it("should serialize comparison filters without leaking stale parameters", () => {
      const filters = dashboardFilterDocumentFromPresentation({
        browser: "Chrome",
        path: "/pricing",
      });
      const result = withComparison(
        {
          siteId: "123",
          "compareFilter[page.path]": "/old",
          compareEvaluationFromMs: 50,
          compareEvaluationToMs: 80,
        },
        {
          mode: "same",
          window: {
            preset: "today",
            from: 100,
            to: 200,
            timeZone: "UTC",
            interval: "hour",
          },
          filters,
        },
        { metric: "visitors", sortBy: "change" },
      );

      expect(result).toMatchObject({
        siteId: "123",
        compare: "same",
        metric: "visitors",
        sortBy: "change",
        "compareFilter[client.browser]": "Chrome",
        "compareFilter[page.path]": "/pricing",
      });
      expect(result["compareFilter[page.path]"]).toBe("/pricing");
      expect(result).not.toHaveProperty("compareEvaluationFromMs");
      expect(result).not.toHaveProperty("compareEvaluationToMs");
      expect(
        withComparison(
          {
            siteId: "123",
            "compareFilter[page.path]": "/old",
            compareEvaluationFromMs: 50,
            compareEvaluationToMs: 80,
          },
          null,
        ),
      ).toEqual({ siteId: "123" });
    });
  });

  describe("empty parameter fallbacks", () => {
    const mockWindow = {
      preset: "today" as const,
      from: 1700000000000,
      to: 1700000000000 + 24 * 60 * 60 * 1000,
      timeZone: "UTC",
      interval: "hour" as const,
    };

    it("should handle empty parameter fallbacks gracefully", async () => {
      // Test invalid inputs resulting in empty return datasets
      const emptyEvtField = await fetchEventTypeFieldValues(
        "site-1",
        mockWindow,
        "",
        "",
        "string",
      );
      expect(emptyEvtField.data.items).toHaveLength(0);

      // Call exported empty objects
      expect(emptyOverviewClientDimensionTabsData()).toBeDefined();
      expect(emptyOverviewGeoDimensionTabsData()).toBeDefined();
      expect(emptyOverviewGeoPointsData()).toBeDefined();
    });
  });

  describe("withFilters — comprehensive filter mapping", () => {
    it("should pass through every supported filter dimension into the request params", () => {
      const baseParams = { siteId: "abc" };
      const filters = dashboardFilterDocumentFromPresentation({
        country: "JP",
        device: "mobile",
        browser: "Chrome",
        path: "/docs",
        query: "?ref=x",
        title: "Docs Home",
        hostname: "docs.test",
        entry: "/landing",
        exit: "/checkout",
        sourceDomain: "google.com",
        sourceLink: "https://google.com/search",
        clientBrowser: "Firefox",
        clientOsVersion: "14",
        clientDeviceType: "tablet",
        clientLanguage: "en-US",
        clientScreenSize: "1920x1080",
        geo: "JP::13::Tokyo",
        geoContinent: "AS",
        geoTimezone: "Asia/Tokyo",
        geoOrganization: "AS12345",
      });
      const out = withFilters(baseParams, filters);
      expect(out.siteId).toBe("abc");
      expect(out["filter[geo.country]"]).toBe("jp");
      expect(out["filter[client.deviceType]"]).toBe("tablet");
      expect(out["filter[client.browser]"]).toBe("Firefox");
      expect(out["filter[page.path]"]).toBe("/docs");
      expect(out["filter[page.query]"]).toBe("?ref=x");
      expect(out["filter[referrer.domain]"]).toBe("google.com");
      expect(out["filter[geo.continent]"]).toBe("as");
      expect(out["filter[geo.timeZone]"]).toBe("Asia/Tokyo");
      expect(out["filter[geo.organization]"]).toBe("AS12345");
    });

    it("should skip empty eventPayloadFilters and not serialize them", () => {
      const out = withFilters(
        { siteId: "x" },
        dashboardFilterDocumentFromPresentation({}),
      );
      expect(Object.keys(out)).toEqual(["siteId"]);
    });
  });

  describe("toQueryString — edge cases", () => {
    it("should return empty string for empty params object", () => {
      expect(toQueryString({})).toBe("");
    });

    it("should encode special characters via URLSearchParams semantics", () => {
      const out = toQueryString({ q: "hello world", limit: 5 });
      expect(out).toContain("q=hello+world");
      expect(out).toContain("limit=5");
    });
  });

  describe("Network data fetching with mocked fetch", () => {
    const realFetch = globalThis.fetch;
    const mockWindow = {
      preset: "today" as const,
      from: 1700000000000,
      to: 1700000000000 + 24 * 60 * 60 * 1000,
      timeZone: "UTC",
      interval: "hour" as const,
    };

    const suppressUnhandled = () => {};

    beforeAll(() => {
      // The dedupe path adds a finally-chain off the in-flight promise. When the
      // primary promise rejects (e.g. on HTTP 500), the secondary chain surfaces
      // as a stray unhandled rejection one tick later. Suppress globally for
      // this suite — the failure assertion itself still owns the primary check.
      process.on("unhandledRejection", suppressUnhandled);
    });

    afterAll(() => {
      globalThis.fetch = realFetch;
      process.off("unhandledRejection", suppressUnhandled);
    });

    function freshJsonResponse(body: unknown, status = 200): Response {
      return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      });
    }

    function geoTabResponse(items: unknown[]): Response {
      return freshJsonResponse({
        ok: true,
        data: {
          items,
          pagination: {
            limit: 100,
            returned: items.length,
            hasMore: false,
            nextCursor: null,
          },
        },
      });
    }

    function paramsFromCall(fetchMock: any, callIndex = 0): URLSearchParams {
      const calledUrl = String(fetchMock.mock.calls[callIndex][0]);
      return new URLSearchParams(calledUrl.split("?")[1] ?? "");
    }

    it("should call fetch and parse JSON response", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(freshJsonResponse({ ok: true, data: { views: 42 } })),
        );
      globalThis.fetch = fetchMock as any;

      const out = await fetchOverview("real-site-1", mockWindow);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(calledUrl).toContain("/api/private/overview");
      expect(calledUrl).toContain("siteId=real-site-1");
      expect(init.method).toBe("GET");
      expect(init.credentials).toBe("include");
      expect((out as any).data.views).toBe(42);
    });

    it("forwards query cancellation signals for overview and trend requests", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            freshJsonResponse(
              url.includes("/api/private/pages-dashboard") ||
                url.includes("/api/private/event-types")
                ? { ok: true, data: emptyPaginatedCollection }
                : { ok: true, data: [] },
            ),
          ),
        );
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();

      await Promise.all([
        fetchOverview("signal-overview", mockWindow, undefined, {
          signal: controller.signal,
        }),
        fetchTrend("signal-trend", mockWindow, undefined, {
          signal: controller.signal,
        }),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls).toEqual(
        expect.arrayContaining([
          [
            expect.any(String),
            expect.objectContaining({ signal: controller.signal }),
          ],
        ]),
      );
    });

    it("forwards query cancellation signals for share trend data sources", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            freshJsonResponse(
              url.includes("/api/private/pages-dashboard") ||
                url.includes("/api/private/event-types")
                ? { ok: true, data: emptyPaginatedCollection }
                : { ok: true, data: [] },
            ),
          ),
        );
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();
      const options = { limit: 5, signal: controller.signal };

      await Promise.all([
        fetchEventTypesTab("signal-event-types", mockWindow, undefined, {
          limit: 100,
          signal: controller.signal,
        }),
        fetchPagesShareTrend("signal-pages", mockWindow, undefined, options),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      for (const [, init] of fetchMock.mock.calls) {
        expect((init as RequestInit).signal).toBe(controller.signal);
      }
    });

    it("should propagate non-OK HTTP responses as thrown errors", async () => {
      globalThis.fetch = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(new Response("server boom", { status: 500 })),
        ) as any;

      await expect(fetchTrend("error-site", mockWindow)).rejects.toThrow(
        /Request failed \(500/,
      );
    });

    it("should deduplicate concurrent GET requests for the same URL into a single fetch", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(freshJsonResponse({ ok: true, data: { views: 1 } })),
        );
      globalThis.fetch = fetchMock as any;

      const [a, b] = await Promise.all([
        fetchOverview("dedupe-site", mockWindow),
        fetchOverview("dedupe-site", mockWindow),
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
    });

    it("should NOT dedupe distinct URLs", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(freshJsonResponse({ ok: true, data: {} })),
        );
      globalThis.fetch = fetchMock as any;

      await Promise.all([
        fetchOverview("siteA", mockWindow),
        fetchOverview("siteB", mockWindow),
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("should propagate filter mapping into the URL query string", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(freshJsonResponse({ ok: true, data: {} })),
        );
      globalThis.fetch = fetchMock as any;

      await fetchPages(
        "filter-site-unique",
        mockWindow,
        dashboardFilterDocumentFromPresentation({
          country: "DE",
          browser: "Safari",
        }),
      );
      const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toContain("filter%5Bgeo.country%5D=de");
      expect(calledUrl).toContain("filter%5Bclient.browser%5D=Safari");
    });

    it("should serialize optional overview request params", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(freshJsonResponse({ ok: true, data: [] })),
        );
      globalThis.fetch = fetchMock as any;

      await fetchOverview("option-overview", mockWindow, undefined, {
        includeChange: true,
        includeDetail: true,
      });
      const params = paramsFromCall(fetchMock, 0);
      expect(params.get("includeChange")).toBe("1");
      expect(params.get("includeDetail")).toBe("1");
      expect(params.get("interval")).toBe("hour");
    });

    it("should serialize option limits for referrer and dimension endpoints", async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(freshJsonResponse({ ok: true, data: [] })),
        );
      globalThis.fetch = fetchMock as any;

      await fetchReferrers("option-referrers", mockWindow, undefined, {
        fullUrl: true,
        limit: 12,
      });
      let params = paramsFromCall(fetchMock, 0);
      expect(params.get("fullUrl")).toBe("1");
      expect(params.get("limit")).toBe("12");

      await fetchOverviewGeoPoints("option-geo-points", mockWindow, undefined, {
        limit: 25,
        applyGeoFilter: true,
      });
      params = paramsFromCall(fetchMock, 1);
      expect(params.get("limit")).toBe("25");
      expect(params.get("applyGeoFilter")).toBe("1");

      await fetchPagesDashboard(
        "option-pages-dashboard",
        mockWindow,
        undefined,
        {
          limit: 14,
          cursor: "pages-cursor",
        },
      );
      params = paramsFromCall(fetchMock, 2);
      expect(params.get("limit")).toBe("14");
      expect(params.get("cursor")).toBe("pages-cursor");
    });

    it("forwards cancellation signals for overview geo point requests", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(freshJsonResponse({ ok: true, data: [] }));
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();

      await fetchOverviewGeoPoints("geo-points-signal", mockWindow, undefined, {
        signal: controller.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("forwards cancellation signals for overview source tabs", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          freshJsonResponse({ ok: true, data: emptyPaginatedCollection }),
        );
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();

      await fetchOverviewSourceCardTab(
        "source-tab-signal",
        mockWindow,
        "domain",
        undefined,
        { signal: controller.signal },
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("preserves aborted overview source tab requests", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fetchOverviewSourceCardTab(
          "source-tab-aborted",
          mockWindow,
          "domain",
          undefined,
          { signal: controller.signal },
        ),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it("forwards cancellation signals for event field values", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          freshJsonResponse({ ok: true, data: emptyPaginatedCollection }),
        );
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();

      await fetchEventTypeFieldValues(
        "event-field-values-signal",
        mockWindow,
        "Signup",
        "payload.plan",
        "string",
        undefined,
        { signal: controller.signal },
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("forwards cancellation signals for UTM dimension requests", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        freshJsonResponse({
          ok: true,
          data: {
            items: [],
            pagination: {
              limit: 100,
              returned: 0,
              hasMore: false,
              nextCursor: null,
            },
          },
        }),
      );
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();

      await fetchUtmDimension(
        "utm-dimension-signal",
        mockWindow,
        "campaign",
        undefined,
        { signal: controller.signal },
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("preserves aborted UTM dimension requests", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fetchUtmDimension(
          "utm-dimension-aborted",
          mockWindow,
          "campaign",
          undefined,
          { signal: controller.signal },
        ),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it("forwards cancellation signals for funnel requests", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(freshJsonResponse({ ok: true, funnels: [] }));
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();

      await fetchFunnels("funnels-signal", { signal: controller.signal });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("preserves aborted funnel requests", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fetchFunnels("funnels-aborted", { signal: controller.signal }),
      ).rejects.toMatchObject({ name: "AbortError" });
      await expect(
        fetchFunnelDetail(
          "funnel-detail-aborted",
          "funnel-1",
          mockWindow,
          undefined,
          { signal: controller.signal },
        ),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it("forwards cancellation signals for overview geo dimension requests", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          freshJsonResponse({ ok: true, data: emptyPaginatedCollection }),
        );
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();

      await fetchOverviewGeoDimensionTabPage(
        "geo-dimension-signal",
        mockWindow,
        "country",
        undefined,
        { signal: controller.signal },
      ).then((page) => page.items);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("preserves aborted overview geo dimension requests", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fetchOverviewGeoDimensionTabPage(
          "geo-dimension-aborted",
          mockWindow,
          "country",
          undefined,
          { signal: controller.signal },
        ).then((page) => page.items),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it("forwards cancellation signals for overview page tab requests", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          freshJsonResponse({ ok: true, data: emptyPaginatedCollection }),
        );
      globalThis.fetch = fetchMock as any;
      const controller = new AbortController();

      await fetchOverviewPageCardTab(
        "page-tab-signal",
        mockWindow,
        "title",
        undefined,
        { signal: controller.signal },
      );

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it("preserves aborted overview page tab requests", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fetchOverviewPageCardTab(
          "page-tab-aborted",
          mockWindow,
          "title",
          undefined,
          { signal: controller.signal },
        ),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it("preserves aborted overview geo point requests", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        fetchOverviewGeoPoints("geo-points-aborted", mockWindow, undefined, {
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
    });

    it("should return empty fallback payloads when recoverable endpoints fail", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
      globalThis.fetch = fetchMock as any;

      const fieldValues = await fetchEventTypeFieldValues(
        "fallback-field-values",
        mockWindow,
        "Signup",
        "payload.plan",
        "string",
      );
      expect(fieldValues).toEqual({
        ok: true,
        fieldPath: "payload.plan",
        fieldValueType: "string",
        data: {
          items: [],
          pagination: {
            limit: 1,
            returned: 0,
            hasMore: false,
            nextCursor: null,
          },
        },
      });

      const shareTrend = await fetchPagesShareTrend(
        "fallback-share-trend",
        mockWindow,
        undefined,
        { limit: 0 },
      );
      expect(shareTrend).toMatchObject({
        ok: true,
        interval: "hour",
        series: [],
        data: [],
      });

      await expect(
        fetchOverviewGeoPoints("fallback-geo-points", mockWindow),
      ).resolves.toEqual({
        ok: true,
        data: [],
        countryCounts: [],
        regionCounts: [],
        cityCounts: [],
      });
      await expect(
        fetchOverviewPageCardTab("fallback-page-tab", mockWindow, "path"),
      ).resolves.toEqual(emptyPaginatedCollection);
      await expect(
        fetchPageHashTab("fallback-hash", mockWindow),
      ).resolves.toEqual(emptyPaginatedCollection);
      await expect(
        fetchOverviewSourceCardTab("fallback-source", mockWindow, "link"),
      ).resolves.toEqual(emptyPaginatedCollection);
      await expect(
        fetchEventTypesTab("fallback-types", mockWindow),
      ).resolves.toEqual(emptyPaginatedCollection);
      await expect(
        fetchOverviewClientDimensionTab(
          "fallback-client-tab",
          mockWindow,
          "language",
        ),
      ).resolves.toEqual(emptyPaginatedCollection);
      await expect(
        fetchOverviewGeoDimensionTabPage(
          "fallback-geo-tab",
          mockWindow,
          "country",
        ).then((page) => page.items),
      ).resolves.toEqual([]);
      await expect(
        fetchFilterValues("fallback-filter-options", mockWindow, "geo.country"),
      ).resolves.toEqual(emptyPaginatedCollection);
    });

    it("should normalize geo point and count payloads", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          freshJsonResponse({
            ok: true,
            data: [
              {
                latitude: "10.5",
                longitude: null,
                timestampMs: "123",
                country: 77,
                region: null,
                regionCode: "CA",
                city: undefined,
              },
            ],
            countryCounts: [
              {
                country: undefined,
                views: "3",
                sessions: null,
                visitors: undefined,
              },
            ],
            regionCounts: [
              {
                value: undefined,
                label: null,
                views: "4",
                sessions: "2",
                visitors: null,
              },
            ],
            cityCounts: [
              {
                value: null,
                label: "San Francisco",
                views: undefined,
                sessions: "1",
                visitors: "5",
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          freshJsonResponse({
            ok: true,
            data: null,
            countryCounts: null,
            regionCounts: null,
            cityCounts: null,
          }),
        );
      globalThis.fetch = fetchMock as any;

      const mapped = await fetchOverviewGeoPoints(
        "geo-points-normalize",
        mockWindow,
      );
      expect(mapped.data[0]).toEqual({
        latitude: 10.5,
        longitude: 0,
        timestampMs: 123,
        country: "77",
        region: "",
        regionCode: "CA",
        city: "",
        pointCount: 1,
      });
      expect(mapped.countryCounts[0]).toEqual({
        country: "",
        views: 3,
        sessions: 0,
        visitors: 0,
      });
      expect(mapped.regionCounts[0]).toEqual({
        value: "",
        label: "",
        views: 4,
        sessions: 2,
        visitors: 0,
      });
      expect(mapped.cityCounts[0]).toEqual({
        value: "",
        label: "San Francisco",
        views: 0,
        sessions: 1,
        visitors: 5,
      });

      const emptySections = await fetchOverviewGeoPoints(
        "geo-points-non-array",
        mockWindow,
      );
      expect(emptySections).toEqual({
        ok: true,
        data: [],
        countryCounts: [],
        regionCounts: [],
        cityCounts: [],
      });
    });

    it("should format geo dimension labels for region and city hierarchies", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          geoTabResponse([
            {
              value: "US::CA::California",
              label: "United States :: CA :: California",
              views: "4",
              sessions: null,
              visitors: undefined,
            },
            {
              value: "JP::13::Tokyo",
              label: "  ",
              views: 1,
              sessions: 2,
              visitors: 3,
            },
            {
              value: "raw-region",
              label: "",
              views: 0,
            },
          ]),
        )
        .mockResolvedValueOnce(
          geoTabResponse([
            {
              value: "US::CA::California::San Francisco",
              label: "United States :: CA :: California :: San Francisco",
              views: "9",
            },
            {
              value: "raw-city",
              label: "",
              sessions: "2",
            },
          ]),
        )
        .mockResolvedValueOnce(
          geoTabResponse([
            {
              value: "  ",
              label: "Canada",
              views: "6",
              sessions: "3",
              visitors: "2",
            },
          ]),
        )
        .mockResolvedValueOnce(freshJsonResponse({ ok: true, data: null }));
      globalThis.fetch = fetchMock as any;

      const regions = await fetchOverviewGeoDimensionTabPage(
        "geo-region-format",
        mockWindow,
        "region",
      ).then((page) => page.items);
      expect(regions.map((row) => row.label)).toEqual([
        "California",
        "Tokyo",
        "raw-region",
      ]);
      expect(regions[0]).toMatchObject({
        value: "US::CA::California",
        views: 4,
        sessions: 0,
        visitors: 0,
      });

      const cities = await fetchOverviewGeoDimensionTabPage(
        "geo-city-format",
        mockWindow,
        "city",
      ).then((page) => page.items);
      expect(cities.map((row) => row.label)).toEqual([
        "San Francisco",
        "raw-city",
      ]);
      expect(cities[1]).toMatchObject({
        value: "raw-city",
        sessions: 2,
        visitors: 0,
      });

      const countries = await fetchOverviewGeoDimensionTabPage(
        "geo-country-format",
        mockWindow,
        "country",
      ).then((page) => page.items);
      expect(countries[0]).toEqual({
        value: "Canada",
        label: "Canada",
        views: 6,
        sessions: 3,
        visitors: 2,
      });

      await expect(
        fetchOverviewGeoDimensionTabPage(
          "geo-non-array",
          mockWindow,
          "country",
        ).then((page) => page.items),
      ).rejects.toThrow("pagination_contract_violation");
    });

    it("should fall back to empty page card tabs when tabs are omitted", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(freshJsonResponse({ ok: true, data: [] }));
      globalThis.fetch = fetchMock as any;

      await expect(
        fetchPageCardTabs("page-card-no-tabs", mockWindow),
      ).resolves.toEqual({
        path: [],
        title: [],
        hostname: [],
        entry: [],
        exit: [],
      });
    });

    it("should build page share trend without other series when top pages cover totals", async () => {
      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/private/pages-dashboard")) {
          return Promise.resolve(
            freshJsonResponse({
              ok: true,
              interval: "hour",
              data: {
                items: [
                  {
                    pathname: "/docs",
                    metrics: { views: 8, sessions: 2 },
                    trend: [{ timestampMs: 2000, views: 8 }, { views: null }],
                  },
                  {
                    pathname: "/blog",
                    metrics: { views: 3, sessions: 1 },
                    trend: [{ timestampMs: 1000, views: 3 }],
                  },
                ],
                pagination: {
                  limit: 12,
                  returned: 2,
                  hasMore: false,
                  nextCursor: null,
                },
              },
            }),
          );
        }
        return Promise.resolve(
          freshJsonResponse({
            ok: true,
            interval: "hour",
            data: [
              { timestampMs: 1000, views: 2 },
              { timestampMs: 2000, views: 5 },
              { timestampMs: 0, views: 0 },
            ],
          }),
        );
      });
      globalThis.fetch = fetchMock as any;

      const trend = await fetchPagesShareTrend(
        "share-no-other",
        mockWindow,
        undefined,
        { limit: 20 },
      );

      expect(paramsFromCall(fetchMock, 0).get("limit")).toBe("12");
      expect(trend.series).toEqual([
        {
          key: "page_0",
          label: "/docs",
          views: 8,
          visitors: 8,
          sessions: 2,
        },
        {
          key: "page_1",
          label: "/blog",
          views: 3,
          visitors: 3,
          sessions: 1,
        },
      ]);
      expect(trend.data.map((point) => point.timestampMs)).toEqual([
        0, 1000, 2000,
      ]);
      expect(trend.data[0]).toMatchObject({
        totalVisitors: 0,
        visitorsBySeries: { page_0: 0 },
      });
      expect(trend.data[2]).toMatchObject({
        totalVisitors: 8,
        visitorsBySeries: { page_0: 8 },
      });
    });

    it("should return empty field values when the field path is nullish", async () => {
      const out = await fetchEventTypeFieldValues(
        "empty-field-path",
        mockWindow,
        "Signup",
        null as any,
        "string",
      );
      expect(out).toEqual({
        ok: true,
        fieldPath: "",
        fieldValueType: "string",
        data: {
          items: [],
          pagination: {
            limit: 1,
            returned: 0,
            hasMore: false,
            nextCursor: null,
          },
        },
      });
    });
  });
});
