import { beforeEach, describe, expect, it, vi } from "vitest";

import { FilterOperator } from "@/lib/filter-contract";

vi.mock("@/lib/edge/analytics/providers/d1/internal/dimensions", () => ({
  queryDimensionFromD1: vi.fn(),
  querySessionBoundaryDimensionFromD1: vi.fn(),
}));
vi.mock("@/lib/edge/analytics/providers/d1/internal/events-summary", () => ({
  queryEventTypeAggregate: vi.fn(),
}));

import {
  queryDimensionFromD1,
  querySessionBoundaryDimensionFromD1,
} from "@/lib/edge/analytics/providers/d1/internal/dimensions";
import { queryEventTypeAggregate } from "@/lib/edge/analytics/providers/d1/internal/events-summary";
import { readSiteBreakdown } from "@/lib/edge/analytics/providers/d1/operations/site-breakdown";

const input = {
  env: {} as never,
  siteId: "site-1",
  window: { startMs: 0, endExclusiveMs: 1, nowMs: 1, timeZone: "UTC" },
  dimension: "page.path",
  limit: 20,
  filters: { conditions: [] },
};

describe("site breakdown runtime", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the typed visit dimension provider and shapes stable items", async () => {
    vi.mocked(queryDimensionFromD1).mockResolvedValue([
      { value: "/pricing", views: 4, sessions: 2, visitors: 2 },
    ]);
    await expect(readSiteBreakdown(input)).resolves.toEqual({
      items: [
        {
          key: "/pricing",
          label: "/pricing",
          views: 4,
          sessions: 2,
          visitors: 2,
        },
      ],
    });
    expect(queryDimensionFromD1).toHaveBeenCalledWith(
      input.env,
      input.siteId,
      input.window,
      input.filters,
      input.limit,
      expect.any(String),
      { excludeEmpty: true },
    );
  });

  it("routes session boundaries and event names to their dedicated typed providers", async () => {
    vi.mocked(querySessionBoundaryDimensionFromD1).mockResolvedValue([]);
    vi.mocked(queryEventTypeAggregate).mockResolvedValue([]);
    await readSiteBreakdown({ ...input, dimension: "session.entryPath" });
    await readSiteBreakdown({ ...input, dimension: "event.name" });
    expect(querySessionBoundaryDimensionFromD1).toHaveBeenCalledWith(
      input.env,
      input.siteId,
      input.window,
      input.filters,
      input.limit,
      "entry",
    );
    expect(queryEventTypeAggregate).toHaveBeenCalledWith(
      input.env,
      input.siteId,
      input.window,
      input.filters,
      input.limit,
    );
  });

  it("keeps dimension routing local while leaving filter policy to application", async () => {
    await expect(
      readSiteBreakdown({ ...input, dimension: "not.real" }),
    ).rejects.toThrow("unsupported-dimension:not.real");
    await expect(
      readSiteBreakdown({
        ...input,
        filters: {
          conditions: [
            {
              target: { kind: "field", field: "forbidden.field" as never },
              operator: FilterOperator.Eq,
              value: "x",
            },
          ],
        },
      }),
    ).resolves.toBeDefined();
    expect(queryDimensionFromD1).toHaveBeenCalled();
  });
});
