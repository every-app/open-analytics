import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/edge/analytics/providers/d1/internal/events-records", () => ({
  queryEventRecordPageFromD1: vi.fn(),
}));

import { queryEventRecordPageFromD1 } from "@/lib/edge/analytics/providers/d1/internal/events-records";
import { readSiteEventRecords } from "@/lib/edge/analytics/providers/d1/operations/site-event-records";

const base = {
  env: { MAIN_SECRET: "cursor-secret" } as never,
  siteId: "site-1",
  window: { startMs: 0, endExclusiveMs: 100, nowMs: 100, timeZone: "UTC" },
  filters: { conditions: [] },
};

describe("site event-record runtime", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses signed cursors and binds records to the typed query", async () => {
    vi.mocked(queryEventRecordPageFromD1).mockResolvedValue({
      rows: [],
      nextCursor: {
        occurredAt: 1,
        eventId: "evt",
        eventPk: 1,
      },
    });
    const result = await readSiteEventRecords({
      ...base,
      sort: { field: "occurredAt", direction: "desc" },
      page: { limit: 20 },
    });
    expect(result).toMatchObject({
      items: [],
      pagination: {
        limit: 20,
        hasMore: true,
        nextCursor: expect.any(String),
      },
    });
    expect(queryEventRecordPageFromD1).toHaveBeenCalledWith(
      base.env,
      "site-1",
      base.window,
      base.filters,
      expect.objectContaining({ limit: 20, cursor: null }),
    );

    const next = result.pagination.nextCursor;
    vi.mocked(queryEventRecordPageFromD1).mockResolvedValueOnce({
      rows: [],
      nextCursor: null,
    });
    await expect(
      readSiteEventRecords({
        ...base,
        sort: { field: "occurredAt", direction: "desc" },
        page: { limit: 20, cursor: next },
      }),
    ).resolves.toMatchObject({
      pagination: { hasMore: false, nextCursor: null },
    });
  });

  it("rejects malformed cursors before the provider", async () => {
    await expect(
      readSiteEventRecords({
        ...base,
        sort: { field: "occurredAt", direction: "desc" },
        page: { limit: 20, cursor: "not-a-signed-cursor" },
      }),
    ).rejects.toThrow("invalid-cursor");
    expect(queryEventRecordPageFromD1).not.toHaveBeenCalled();
  });

  it("uses the same trimmed search for cursor binding and SQL", async () => {
    vi.mocked(queryEventRecordPageFromD1).mockResolvedValue({
      rows: [],
      nextCursor: null,
    });

    await readSiteEventRecords({
      ...base,
      search: "  checkout  ",
      sort: { field: "occurredAt", direction: "desc" },
      page: { limit: 20 },
    });

    expect(queryEventRecordPageFromD1).toHaveBeenCalledWith(
      base.env,
      "site-1",
      base.window,
      base.filters,
      expect.objectContaining({ search: "checkout" }),
    );
  });

  it("requires a signing root", async () => {
    vi.mocked(queryEventRecordPageFromD1).mockResolvedValue({
      rows: [],
      nextCursor: {
        occurredAt: 1,
        eventId: "evt",
        eventPk: 1,
      },
    });
    await expect(
      readSiteEventRecords({
        ...base,
        env: {} as never,
        sort: { field: "occurredAt", direction: "desc" },
        page: { limit: 20 },
      }),
    ).rejects.toThrow("data-unavailable");
  });

  it("maps provider failures", async () => {
    vi.mocked(queryEventRecordPageFromD1).mockRejectedValueOnce(
      new Error("down"),
    );
    await expect(
      readSiteEventRecords({
        ...base,
        sort: { field: "occurredAt", direction: "desc" },
        page: { limit: 20 },
      }),
    ).rejects.toThrow("down");
  });
});
