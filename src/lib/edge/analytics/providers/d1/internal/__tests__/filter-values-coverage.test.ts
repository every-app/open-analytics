import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  decodeDimensionCursor: vi.fn(),
  decodeSessionPathDimensionCursor: vi.fn(),
  queryDimensionPageFromD1: vi.fn(),
  querySessionPathDimensionPageFromD1: vi.fn(),
  decodeEventTypeCursor: vi.fn(),
  queryEventTypePageFromD1: vi.fn(),
  decodeReferrersCursor: vi.fn(),
  queryReferrersPageFromD1: vi.fn(),
  resolveCrossBreakdownDimension: vi.fn(),
}));
vi.mock("../dimensions", () => mocks);
vi.mock("../events-summary", () => mocks);
vi.mock("../pages", () => mocks);
vi.mock("../referrers", () => mocks);
vi.mock("../core-dimensions", () => ({
  resolveCrossBreakdownDimension: mocks.resolveCrossBreakdownDimension,
}));
import { EMPTY_FILTER_DOCUMENT } from "@/lib/edge/analytics/contract";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core";
import { queryFilterValuesPageFromD1 } from "@/lib/edge/analytics/providers/d1/internal/filter-values";
import type { Env } from "@/lib/edge/types";
const window: QueryWindow = {
  startMs: 1,
  endExclusiveMs: 2,
  nowMs: 3,
  timeZone: "UTC",
};
const env = {} as Env;
function page(items: Array<Record<string, unknown>>) {
  return {
    items,
    pagination: {
      limit: 10,
      returned: items.length,
      hasMore: false,
      nextCursor: null,
    },
  };
}
describe("filter-values dispatch coverage", () => {
  it("handles boolean and unsupported candidates", async () => {
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "geo.isEU",
        1,
      ),
    ).resolves.toMatchObject({
      items: [{ value: "false" }],
      pagination: { returned: 1, hasMore: false },
    });
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "event.payload",
        10,
      ),
    ).resolves.toEqual({
      items: [],
      pagination: { limit: 10, returned: 0, hasMore: false, nextCursor: null },
    });
  });

  it("dispatches paginated readers and validates cursors", async () => {
    mocks.decodeEventTypeCursor.mockResolvedValue({ event: "event-cursor" });
    mocks.queryEventTypePageFromD1.mockResolvedValue(
      page([{ value: "Signup", views: 4 }]),
    );
    mocks.decodeReferrersCursor.mockResolvedValue({ referrer: "ref-cursor" });
    mocks.queryReferrersPageFromD1.mockResolvedValue(
      page([{ referrer: "", views: 2 }]),
    );
    mocks.decodeSessionPathDimensionCursor.mockResolvedValue({
      value: "path-cursor",
    });
    mocks.querySessionPathDimensionPageFromD1.mockResolvedValue(
      page([{ value: " /entry ", views: 3 }]),
    );
    mocks.decodeDimensionCursor.mockResolvedValue({
      value: "dimension-cursor",
    });
    mocks.queryDimensionPageFromD1.mockResolvedValue(
      page([{ value: " US ", views: 5 }]),
    );
    mocks.resolveCrossBreakdownDimension.mockReturnValue({
      labelExpr: "v.country",
    });

    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "event.name",
        10,
        "cursor",
        "sign",
      ),
    ).resolves.toMatchObject({ items: [{ value: "Signup", occurrences: 4 }] });
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "referrer.url",
        10,
        "cursor",
      ),
    ).resolves.toMatchObject({
      items: [{ value: "__direct__", occurrences: 2 }],
    });
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "session.exitPath",
        10,
        "cursor",
      ),
    ).resolves.toMatchObject({ items: [{ value: "/entry", occurrences: 3 }] });
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "geo.country",
        10,
        "cursor",
      ),
    ).resolves.toMatchObject({ items: [{ value: "US", occurrences: 5 }] });

    mocks.decodeEventTypeCursor.mockResolvedValue(null);
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "event.name",
        10,
        "bad",
      ),
    ).rejects.toThrow("invalid-cursor");
    mocks.decodeReferrersCursor.mockResolvedValue(null);
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "referrer.domain",
        10,
        "bad",
      ),
    ).rejects.toThrow("invalid-cursor");
    mocks.decodeSessionPathDimensionCursor.mockResolvedValue(null);
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "session.entryPath",
        10,
        "bad",
      ),
    ).rejects.toThrow("invalid-cursor");
    mocks.decodeDimensionCursor.mockResolvedValue(null);
    await expect(
      queryFilterValuesPageFromD1(
        env,
        "site",
        window,
        EMPTY_FILTER_DOCUMENT,
        "geo.country",
        10,
        "bad",
      ),
    ).rejects.toThrow("invalid-cursor");
  });
});
