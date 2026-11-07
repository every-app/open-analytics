import { describe, expect, it } from "vitest";

import {
  goalConversionColumns,
  type GoalConversionRow,
  goalConversionRows,
  goalHref,
} from "@/components/dashboard/site-pages/overview/goal-conversions";
import type {
  GoalDefinition,
  GoalSummary,
} from "@/lib/dashboard-api/client/edge";
import { getMessages } from "@/lib/i18n/messages";

function goal(
  id: string,
  name: string,
  filterDsl = 'page.path eq "/pricing"',
): GoalDefinition {
  return {
    id,
    siteId: "site-1",
    name,
    filterDslVersion: 1,
    filterDsl,
    semanticFingerprint: `goal-v1:${id}`,
    createdAt: 1,
    updatedAt: 1,
  };
}

function summary(
  uniques: number,
  visits: number,
  rate: number,
  revenue: GoalSummary["revenue"] = null,
): GoalSummary {
  return {
    visitors: { total: 100, converted: uniques, conversionRate: rate },
    sessions: { total: 120, converted: visits, conversionRate: 0 },
    revenue,
  };
}

describe("goal conversion rows", () => {
  it("lists each goal's unique and total conversions and rate, most uniques first", () => {
    const goals = [
      goal("signup", "Signed up"),
      goal("pricing", "Visited pricing"),
      goal("docs", "Read docs"),
    ];
    const revenue = { currency: "USD", total: 59.5, average: 11.9 };
    const summaries = new Map([
      ["signup", summary(4, 5, 0.04, revenue)],
      ["pricing", summary(20, 26, 0.2)],
      ["docs", summary(4, 4, 0.04)],
    ]);

    expect(goalConversionRows(goals, summaries)).toEqual([
      {
        key: "pricing",
        goalId: "pricing",
        name: "Visited pricing",
        uniques: 20,
        total: 26,
        conversionRate: 0.2,
        revenue: null,
      },
      // A tie goes by name.
      expect.objectContaining({ goalId: "docs", uniques: 4, total: 4 }),
      expect.objectContaining({
        goalId: "signup",
        uniques: 4,
        total: 5,
        revenue,
      }),
    ]);
  });

  it("shows a scroll depth goal's uniques and rate, and — for its total", () => {
    const goals = [
      goal(
        "scroll",
        "Scroll 75% on /blog*",
        'page.path startsWith "/blog" AND page.scrollDepth gte 75',
      ),
      goal("pricing", "Visited pricing"),
    ];
    const rows = goalConversionRows(
      goals,
      new Map([
        ["scroll", summary(12, 15, 0.12)],
        ["pricing", summary(3, 4, 0.03)],
      ]),
    );
    expect(rows[0]).toEqual({
      key: "scroll",
      goalId: "scroll",
      name: "Scroll 75% on /blog*",
      uniques: 12,
      total: null,
      conversionRate: 0.12,
      revenue: null,
    });

    const columns = goalConversionColumns(
      getMessages("en").dashboard.goals,
      "en",
      false,
    );
    const cells = (row: GoalConversionRow) =>
      columns.map((column) =>
        column.format?.(column.getValue(row, "goals"), row, "goals"),
      );
    expect(columns.map((column) => column.key)).toEqual([
      "uniques",
      "total",
      "conversionRate",
    ]);
    expect(cells(rows[0]!)).toEqual(["12", "—", "12%"]);
    expect(cells(rows[1]!)).toEqual(["3", "4", "3%"]);
  });

  it("adds revenue columns, — for a goal without a currency", () => {
    const columns = goalConversionColumns(
      getMessages("en").dashboard.goals,
      "en",
      true,
    );
    const row: GoalConversionRow = {
      key: "signup",
      goalId: "signup",
      name: "Signed up",
      uniques: 4,
      total: 5,
      conversionRate: 0.04,
      revenue: { currency: "USD", total: 59.5, average: 11.9 },
    };
    const cells = (value: GoalConversionRow) =>
      columns
        .slice(3)
        .map((column) =>
          column.format?.(column.getValue(value, "goals"), value, "goals"),
        );
    expect(cells(row)).toEqual(["$59.50", "$11.90"]);
    expect(cells({ ...row, revenue: null })).toEqual(["—", "—"]);
  });

  it("refuses a goal without its summary instead of showing zeros", () => {
    expect(() =>
      goalConversionRows([goal("missing", "Missing")], new Map()),
    ).toThrow("goal_summary_missing:missing");
  });

  it("links a row to its goal on Goals & funnels, keeping the page's state", () => {
    expect(goalHref("/sites/shop/funnels", "goal 1", (path) => path)).toBe(
      "/sites/shop/funnels?goal=goal%201",
    );
    expect(
      goalHref(
        "/sites/shop/funnels",
        "pricing",
        (path) => `${path}?compare=year`,
      ),
    ).toBe("/sites/shop/funnels?compare=year&goal=pricing");
  });
});
