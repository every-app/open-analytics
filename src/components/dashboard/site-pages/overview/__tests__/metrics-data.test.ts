import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchOverview = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dashboard/client/data/index", () => ({ fetchOverview }));

import {
  fetchReferenceSummary,
  previousPeriod,
} from "@/components/dashboard/site-pages/overview/metrics-data";
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

beforeEach(() => {
  fetchOverview.mockReset();
});

describe("fetchReferenceSummary", () => {
  it("measures against the period just before, as long as the window", async () => {
    fetchOverview.mockResolvedValue({ ok: true, data: totals(8) });

    await expect(
      fetchReferenceSummary("site-1", window, filters, null, signal),
    ).resolves.toEqual({ reference: totals(8) });
    expect(previousPeriod(window)).toEqual({ ...window, from: 0, to: 7_000 });
    expect(fetchOverview).toHaveBeenCalledWith(
      "site-1",
      previousPeriod(window),
      filters,
      { signal },
    );
  });

  it("reads the comparison's totals and points when Compare is on", async () => {
    const comparison = {
      mode: "year" as const,
      window: { ...window, from: 1_000, to: 8_000 },
      filters,
    };
    fetchOverview.mockResolvedValue({
      ok: true,
      data: totals(5),
      detail: { interval: "day", data: [{ timestampMs: 1_000, visitors: 1 }] },
    });

    await expect(
      fetchReferenceSummary("site-1", window, filters, comparison, signal),
    ).resolves.toEqual({
      reference: totals(5),
      comparisonPoints: [{ timestampMs: 1_000, visitors: 1 }],
    });
    expect(fetchOverview).toHaveBeenCalledWith(
      "site-1",
      comparison.window,
      filters,
      { includeDetail: true, signal },
    );
  });

  it("fails when a request fails, so the stats and graph can say so", async () => {
    fetchOverview.mockRejectedValue(new Error("Request failed (500)"));
    await expect(
      fetchReferenceSummary("site-1", window, filters, null, signal),
    ).rejects.toThrow("Request failed (500)");
  });

  it("fails on a comparison without its points", async () => {
    fetchOverview.mockResolvedValue({ ok: true, data: totals(1) });
    await expect(
      fetchReferenceSummary(
        "site-1",
        window,
        filters,
        { mode: "previous", window, filters },
        signal,
      ),
    ).rejects.toThrow("overview_detail_missing");
  });
});
