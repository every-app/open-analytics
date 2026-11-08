import { describe, expect, it } from "vitest";

import { EMPTY_FILTER_DOCUMENT } from "@/lib/edge/analytics/contract";
import type { QueryWindow } from "@/lib/edge/analytics/providers/d1/internal/core";
import { queryFilterValuesPageFromD1 } from "@/lib/edge/analytics/providers/d1/internal/filter-values";
import type { Env } from "@/lib/edge/types";

const window: QueryWindow = {
  startMs: Date.UTC(2026, 0, 1),
  endExclusiveMs: Date.UTC(2026, 0, 2),
  nowMs: Date.UTC(2026, 0, 3),
  timeZone: "UTC",
};

function envWithRows(): Env {
  const statement = {
    bind() {
      return statement;
    },
    all: async () => ({
      results: [
        {
          value: "/docs",
          referrer: "Google",
          views: 4,
          sessions: 3,
          visitors: 2,
        },
      ],
    }),
  };
  return {
    DB: { prepare: () => statement },
    MAIN_SECRET: "filter-values-test-secret",
  } as unknown as Env;
}

interface D1Call {
  readonly sql: string;
  readonly bindings: readonly unknown[];
}

interface DimensionRow {
  readonly value: string;
  readonly views: number;
  readonly sessions: number;
  readonly visitors: number;
}

function envWithDimensionRows(
  calls: D1Call[],
  results: readonly DimensionRow[] = [
    { value: "user_123", views: 4, sessions: 3, visitors: 2 },
    { value: "user-456", views: 2, sessions: 2, visitors: 1 },
  ],
): Env {
  let currentCall: { sql: string; bindings: readonly unknown[] } | null = null;
  const statement = {
    bind(...bindings: unknown[]) {
      if (currentCall) currentCall.bindings = bindings;
      return statement;
    },
    all: async () => ({
      results,
    }),
  };
  return {
    DB: {
      prepare(sql: string) {
        currentCall = { sql, bindings: [] };
        calls.push(currentCall);
        return statement;
      },
    },
    MAIN_SECRET: "filter-values-test-secret",
  } as unknown as Env;
}

describe("canonical filter value reader", () => {
  it("denies private field suggestions for public audiences before D1", async () => {
    const calls: D1Call[] = [];
    await expect(
      queryFilterValuesPageFromD1(
        envWithDimensionRows(calls),
        "site-1",
        window,
        EMPTY_FILTER_DOCUMENT,
        "referrer.url",
        10,
        null,
        undefined,
        "public-share",
      ),
    ).resolves.toEqual({
      items: [],
      pagination: { limit: 10, returned: 0, hasMore: false, nextCursor: null },
    });
    expect(calls).toHaveLength(0);
  });

  it("keeps dimension suggestion search bounded and escapes LIKE metacharacters", async () => {
    const calls: D1Call[] = [];
    const result = await queryFilterValuesPageFromD1(
      envWithDimensionRows(calls, [
        { value: "user_%", views: 1, sessions: 1, visitors: 1 },
      ]),
      "site-1",
      window,
      EMPTY_FILTER_DOCUMENT,
      "utm.campaign",
      10,
      null,
      "user_%",
      "private-dashboard",
    );

    expect(result.items).toEqual([{ value: "user_%", occurrences: 1 }]);
    expect(calls.at(-1)?.bindings).toContain("%user\\_\\%%");
  });

  it("routes paginated candidates through every registered source", async () => {
    const fields = [
      "event.name",
      "referrer.domain",
      "referrer.url",
      "session.entryPath",
      "session.exitPath",
      "traffic.channel",
      "page.path",
    ];
    for (const field of fields) {
      await expect(
        queryFilterValuesPageFromD1(
          envWithRows(),
          "site-1",
          window,
          EMPTY_FILTER_DOCUMENT,
          field,
          10,
          null,
          "doc",
          "public-share",
        ),
      ).resolves.toMatchObject({
        items: expect.any(Array),
        pagination: {
          limit: 10,
          returned: expect.any(Number),
          hasMore: false,
          nextCursor: null,
        },
      });
    }
    await expect(
      queryFilterValuesPageFromD1(
        envWithRows(),
        "site-1",
        window,
        EMPTY_FILTER_DOCUMENT,
        "event.payload",
        10,
      ),
    ).resolves.toMatchObject({
      items: [],
      pagination: { hasMore: false, nextCursor: null },
    });
    await expect(
      queryFilterValuesPageFromD1(
        envWithRows(),
        "site-1",
        window,
        EMPTY_FILTER_DOCUMENT,
        "missing.field",
        10,
      ),
    ).resolves.toMatchObject({ items: [], pagination: { returned: 0 } });
  });

  it("rejects a cursor before querying each paginated candidate source", async () => {
    for (const field of [
      "event.name",
      "referrer.domain",
      "session.entryPath",
      "traffic.channel",
    ]) {
      await expect(
        queryFilterValuesPageFromD1(
          envWithRows(),
          "site-1",
          window,
          EMPTY_FILTER_DOCUMENT,
          field,
          10,
          "invalid-cursor",
        ),
      ).rejects.toThrow("invalid-cursor");
    }
  });
});
