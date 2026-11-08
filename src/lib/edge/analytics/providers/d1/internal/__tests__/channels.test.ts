import { describe, expect, it, vi } from "vitest";

import { queryChannelsFromD1 } from "@/lib/edge/analytics/providers/d1/internal/channels";

describe("channel aggregate query", () => {
  it("uses visit_source/filter bindings and stable metric ordering", async () => {
    const all = vi.fn().mockResolvedValue({
      results: [
        { channel: "organic_search", views: 5, sessions: 3, visitors: 2 },
      ],
      meta: {},
    });
    const bind = vi.fn(() => ({ all }));
    const prepare = vi.fn(() => ({ bind }));
    const env = { DB: { prepare } } as never;

    await expect(
      queryChannelsFromD1(
        env,
        "site-1",
        { startMs: 10, endExclusiveMs: 20, nowMs: 20, timeZone: "UTC" },
        { conditions: [] },
        20,
      ),
    ).resolves.toEqual([
      { channel: "organic_search", views: 5, sessions: 3, visitors: 2 },
    ]);

    const sql = String((prepare.mock.calls as unknown[][])[0]?.[0]);
    expect(sql).toContain("FROM visits");
    expect(sql).toContain("filtered_visits");
    expect(sql).toContain("count(DISTINCT CASE WHEN session_id");
    expect(sql).toContain("count(DISTINCT CASE WHEN visitor_id");
    expect(sql).toContain("ORDER BY views DESC, sessions DESC, channel ASC");
    expect(bind).toHaveBeenCalledWith("site-1", 10, 20, 20);
  });
});
