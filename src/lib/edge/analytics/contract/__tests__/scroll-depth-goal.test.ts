import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import { describe, expect, it } from "vitest";

import {
  type ScrollDepthGoal,
  ScrollDepthGoalError,
  scrollDepthGoalFilter,
  scrollDepthGoalFilterDsl,
  scrollDepthGoalFromDsl,
  scrollDepthGoalFromFilter,
} from "@/lib/edge/analytics/contract/scroll-depth-goal";
import { pageViewMatchSql } from "@/lib/edge/analytics/providers/d1/internal/filter-compiler";
import { analyticsFilterRegistry, parseFilterDsl } from "@/lib/filter-contract";

function dsl(pagePath: string, threshold = 75): string {
  return scrollDepthGoalFilterDsl({ threshold, pagePath });
}

/** Every string of `alphabet` up to `length` characters, "" included. */
function strings(alphabet: readonly string[], length: number): string[] {
  let level = [""];
  const all = [""];
  for (let size = 1; size <= length; size += 1) {
    level = level.flatMap((prefix) => alphabet.map((char) => prefix + char));
    all.push(...level);
  }
  return all;
}

/** Plausible's matching: `*` is any characters, slashes included. */
function globMatches(pattern: string, path: string): boolean {
  const source = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}$`, "s").test(path);
}

/** The paths the goal's filter matches, scrolled all the way down. */
function matchedPaths(pagePath: string, paths: readonly string[]): string[] {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(
      "CREATE TABLE visits (visit_id TEXT, pathname TEXT, scroll_depth INTEGER)",
    );
    const insert = database.prepare(
      "INSERT INTO visits (visit_id, pathname, scroll_depth) VALUES (?, ?, 100)",
    );
    paths.forEach((path, index) => insert.run(String(index), path));
    const predicate = pageViewMatchSql(
      scrollDepthGoalFilter({ threshold: 50, pagePath }),
      { siteId: "site-1", startMs: 0, endExclusiveMs: 100 },
    );
    const matched = new Set(
      database
        .prepare(`SELECT visit_id FROM visits v WHERE ${predicate.text}`)
        .all(...(predicate.bindings as SQLInputValue[]))
        .map((row) => String(row.visit_id)),
    );
    return paths.filter((_, index) => matched.has(String(index)));
  } finally {
    database.close();
  }
}

describe("scroll depth goal filter", () => {
  it("builds the threshold alone for a blank path, which means every page", () => {
    expect(dsl("")).toBe("page.scrollDepth gte 75");
    expect(dsl("   ")).toBe("page.scrollDepth gte 75");
    expect(dsl("*")).toBe("page.scrollDepth gte 75");
    expect(dsl("**")).toBe("page.scrollDepth gte 75");
  });

  it("maps each path form to the simplest exact page.path condition", () => {
    expect(dsl("/pricing")).toBe(
      'page.path eq "/pricing" AND page.scrollDepth gte 75',
    );
    expect(dsl(" /pricing ", 1)).toBe(
      'page.path eq "/pricing" AND page.scrollDepth gte 1',
    );
    expect(dsl("/blog*")).toBe(
      'page.path startsWith "/blog" AND page.scrollDepth gte 75',
    );
    expect(dsl("/checkout/order-received/*", 100)).toBe(
      'page.path startsWith "/checkout/order-received/" AND page.scrollDepth gte 100',
    );
    expect(dsl("*/thanks")).toBe(
      'page.path endsWith "/thanks" AND page.scrollDepth gte 75',
    );
    expect(dsl("*docs*")).toBe(
      'page.path contains "docs" AND page.scrollDepth gte 75',
    );
    expect(dsl("/blog**")).toBe(dsl("/blog*"));
  });

  it("matches a middle * exactly, leaving out paths where the two ends overlap", () => {
    // "/products/reviews" starts with "/products/" and ends with "/reviews",
    // but `*` sits between two slashes: the path needs both.
    expect(dsl("/products/*/reviews")).toBe(
      'page.path startsWith "/products/" AND page.path endsWith "/reviews" AND page.path notIn ["/products/reviews"] AND page.scrollDepth gte 75',
    );
    expect(dsl("/docs*/intro")).toBe(
      'page.path startsWith "/docs" AND page.path endsWith "/intro" AND page.scrollDepth gte 75',
    );
    expect(dsl("/aa*aa")).toBe(
      'page.path startsWith "/aa" AND page.path endsWith "aa" AND page.path notIn ["/aa", "/aaa"] AND page.scrollDepth gte 75',
    );
  });

  it("matches special characters literally", () => {
    expect(dsl('/search?q="a.b"+(c)\\%_[x]$')).toBe(
      'page.path eq "/search?q=\\"a.b\\"+(c)\\\\%_[x]$" AND page.scrollDepth gte 75',
    );
    expect(dsl("/a.b*")).toBe(
      'page.path startsWith "/a.b" AND page.scrollDepth gte 75',
    );
    const special = '/a"b\\c.d*%_e';
    expect(scrollDepthGoalFromDsl(dsl(special))?.pagePath).toBe(special);
  });

  it("matches the same paths as Plausible's wildcard pattern", () => {
    const paths = strings(["/", "a", "b"], 5);
    for (const pattern of [
      "/a",
      "/a*",
      "*a/",
      "*/*",
      "*ab*",
      "/a*a/",
      "/*/",
      "a*a",
      "ab*ab",
      "aa*aa",
      "/ab*b/a",
    ]) {
      expect(matchedPaths(pattern, paths), pattern).toEqual(
        paths.filter((path) => globMatches(pattern, path)),
      );
    }
  });

  it("refuses a threshold outside 1 to 100 or not a whole number", () => {
    for (const threshold of [0, 101, 75.5, Number.NaN]) {
      expect(() => dsl("/pricing", threshold)).toThrow(
        ScrollDepthGoalError.ThresholdInvalid,
      );
    }
  });

  it("refuses wildcards the filter can't match exactly", () => {
    for (const pagePath of ["/a/*/b/*", "*/a/*/b", "/a*b*c", "*a*b*"]) {
      expect(() => dsl(pagePath)).toThrow(
        ScrollDepthGoalError.PathWildcardUnsupported,
      );
    }
  });
});

describe("scroll depth goal detection", () => {
  it("reads back the goal from each filter it builds", () => {
    const goals: ScrollDepthGoal[] = [
      { threshold: 75, pagePath: "" },
      { threshold: 1, pagePath: "/pricing" },
      { threshold: 100, pagePath: "/blog*" },
      { threshold: 50, pagePath: "*/thanks" },
      { threshold: 25, pagePath: "*docs*" },
      { threshold: 90, pagePath: "/products/*/reviews" },
      { threshold: 10, pagePath: "/docs*/intro" },
    ];
    for (const goal of goals) {
      expect(
        scrollDepthGoalFromFilter(
          parseFilterDsl(
            scrollDepthGoalFilterDsl(goal),
            analyticsFilterRegistry,
          ),
        ),
      ).toEqual(goal);
    }
  });

  it("reads the conditions in any order", () => {
    expect(
      scrollDepthGoalFromDsl(
        'page.scrollDepth gte 60 AND page.path endsWith "/b" AND page.path notIn ["/a/b"] AND page.path startsWith "/a/"',
      ),
    ).toEqual({ threshold: 60, pagePath: "/a/*/b" });
  });

  it("leaves every other filter to the generic editor", () => {
    for (const filterDsl of [
      "",
      'event.name eq "signup"',
      'page.path eq "/pricing"',
      "page.scrollDepth gte 0",
      "page.scrollDepth gt 75",
      "page.scrollDepth gte 75 AND page.scrollDepth lte 90",
      'page.scrollDepth gte 75 AND page.hostname eq "example.com"',
      'page.path eq "" AND page.scrollDepth gte 75',
      // A literal asterisk isn't a wildcard.
      'page.path eq "/a*b" AND page.scrollDepth gte 75',
      'page.path contains "a*b" AND page.scrollDepth gte 75',
      // Without the overlap exclusion it isn't `/a/*/b` exactly.
      'page.path startsWith "/a/" AND page.path endsWith "/b" AND page.scrollDepth gte 75',
      'page.path startsWith "/a" AND page.path contains "b" AND page.scrollDepth gte 75',
    ]) {
      expect(scrollDepthGoalFromDsl(filterDsl), filterDsl).toBeNull();
    }
  });
});
