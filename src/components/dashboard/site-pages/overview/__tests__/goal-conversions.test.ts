import { describe, expect, it } from "vitest";

import {
  goalConversionRows,
  goalHref,
} from "@/components/dashboard/site-pages/overview/goal-conversions";
import type {
  GoalDefinition,
  GoalSummary,
} from "@/lib/dashboard-api/client/edge";

function goal(id: string, name: string): GoalDefinition {
  return {
    id,
    siteId: "site-1",
    name,
    filterDslVersion: 1,
    filterDsl: 'page.path eq "/pricing"',
    semanticFingerprint: `goal-v1:${id}`,
    createdAt: 1,
    updatedAt: 1,
  };
}

function summary(uniques: number, visits: number, rate: number): GoalSummary {
  return {
    visitors: { total: 100, converted: uniques, conversionRate: rate },
    sessions: { total: 120, converted: visits, conversionRate: 0 },
  };
}

describe("goal conversion rows", () => {
  it("lists each goal's unique and total conversions and rate, most uniques first", () => {
    const goals = [
      goal("signup", "Signed up"),
      goal("pricing", "Visited pricing"),
      goal("docs", "Read docs"),
    ];
    const summaries = new Map([
      ["signup", summary(4, 5, 0.04)],
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
      },
      // A tie goes by name.
      expect.objectContaining({ goalId: "docs", uniques: 4, total: 4 }),
      expect.objectContaining({ goalId: "signup", uniques: 4, total: 5 }),
    ]);
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
