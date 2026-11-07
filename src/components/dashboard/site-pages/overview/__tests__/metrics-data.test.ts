import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchOverview = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dashboard/client/data/index", () => ({ fetchOverview }));

import { fetchOverviewSummary } from "@/components/dashboard/site-pages/overview/metrics-data";
import { EMPTY_DASHBOARD_FILTER_DOCUMENT } from "@/lib/dashboard/filter-state";
import type { TimeWindow } from "@/lib/dashboard/query-state";

const window: TimeWindow = {
  preset: "7d",
  from: 7_000,
  to: 14_000,
  interval: "day",
  timeZone: "UTC",
};
const filters = EMPTY_DASHBOARD_FILTER_DOCUMENT;
const signal = new AbortController().signal;
const totals = (visitors: number) => ({
  views: visitors * 2,
  sessions: visitors,
  visitors,
  bounces: 0,
  totalDurationMs: 0,
  avgDurationMs: 0,
  bounceRate: 0,
  approximateVisitors: false,
});
const detail = (timestampMs: number) => ({
  interval: "day",
  data: [{ timestampMs, visitors: 1 }],
});

beforeEach(() => {
  fetchOverview.mockReset();
});

describe("fetchOverviewSummary", () => {
  it("measures against the previous period the overview returns", async () => {
    fetchOverview.mockResolvedValue({
      ok: true,
      data: totals(10),
      previousData: totals(8),
      detail: detail(7_000),
    });

    await expect(
      fetchOverviewSummary("site-1", window, filters, null, signal),
    ).resolves.toEqual({
      current: totals(10),
      currentPoints: [{ timestampMs: 7_000, visitors: 1 }],
      reference: totals(8),
    });
    expect(fetchOverview).toHaveBeenCalledWith("site-1", window, filters, {
      includeChange: true,
      includeDetail: true,
      signal,
    });
  });

  it("reads the comparison's totals and points when Compare is on", async () => {
    const comparison = {
      mode: "year" as const,
      window: { ...window, from: 1_000, to: 8_000 },
      filters,
    };
    fetchOverview
      .mockResolvedValueOnce({
        ok: true,
        data: totals(10),
        detail: detail(7_000),
      })
      .mockResolvedValueOnce({
        ok: true,
        data: totals(5),
        detail: detail(1_000),
      });

    const summary = await fetchOverviewSummary(
      "site-1",
      window,
      filters,
      comparison,
      signal,
    );

    expect(summary.reference).toEqual(totals(5));
    expect(summary.comparisonPoints).toEqual([
      { timestampMs: 1_000, visitors: 1 },
    ]);
    expect(fetchOverview).toHaveBeenLastCalledWith(
      "site-1",
      comparison.window,
      filters,
      { includeDetail: true, signal },
    );
  });

  it("fails when a request fails, so the stats and graph can say so", async () => {
    fetchOverview.mockImplementation(() =>
      Promise.reject(new Error("Request failed (500)")),
    );
    await expect(
      fetchOverviewSummary("site-1", window, filters, null, signal),
    ).rejects.toThrow("Request failed (500)");
  });

  it("fails on an overview without the parts it asked for", async () => {
    fetchOverview.mockResolvedValueOnce({ ok: true, data: totals(1) });
    await expect(
      fetchOverviewSummary("site-1", window, filters, null, signal),
    ).rejects.toThrow("overview_previous_missing");

    fetchOverview.mockResolvedValueOnce({
      ok: true,
      data: totals(1),
      previousData: totals(1),
    });
    await expect(
      fetchOverviewSummary("site-1", window, filters, null, signal),
    ).rejects.toThrow("overview_detail_missing");
  });
});
