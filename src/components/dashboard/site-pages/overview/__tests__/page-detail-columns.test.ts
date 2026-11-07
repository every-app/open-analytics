import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { pageDetailColumns } from "@/components/dashboard/site-pages/overview/overview-card-data";
import type { ReportRow } from "@/components/dashboard/site-pages/overview/types";
import { getMessages } from "@/lib/i18n/messages";

function page(scrollDepth: number | null): ReportRow {
  return {
    key: "/pricing",
    label: "/pricing",
    filterValue: "/pricing",
    views: 3,
    sessions: 2,
    visitors: 2,
    scrollDepth,
    mono: true,
  };
}

describe("the Pages details' scroll depth column", () => {
  const column = pageDetailColumns("en", getMessages("en")).find(
    (candidate) => candidate.key === "scrollDepth",
  )!;
  const shown = (row: ReportRow) =>
    column.format!(column.getValue(row, "path"), row, "path");

  it("shows a page's average depth as a percent, sorted on the server", () => {
    expect(column.label).toBe("Scroll depth");
    expect(column.sortable).not.toBe(false);
    expect(shown(page(60))).toBe("60%");
    expect(column.exportValue!(page(60), "path")).toBe(60);
  });

  it("shows a dash and exports nothing for a page without a depth", () => {
    expect(isValidElement(shown(page(null)))).toBe(true);
    expect(column.exportValue!(page(null), "path")).toBe("");
  });
});
