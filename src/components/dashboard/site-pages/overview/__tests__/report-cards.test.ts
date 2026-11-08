import { describe, expect, it } from "vitest";

import type { ReportRowsRequest } from "@/components/dashboard/site-pages/overview/report-card";
import { isTopRowsRequest } from "@/components/dashboard/site-pages/overview/report-cards";
import { DASHBOARD_CARD_ROW_LIMIT } from "@/lib/edge/analytics/contract/dashboard";

const topRows: ReportRowsRequest = {
  cursor: null,
  limit: DASHBOARD_CARD_ROW_LIMIT,
  search: "",
  sort: { key: "visitors", direction: "desc" },
  signal: new AbortController().signal,
  comparison: null,
};

describe("a card's rows from the dashboard load", () => {
  it("answer only the card's own first page", () => {
    expect(isTopRowsRequest(topRows)).toBe(true);
    // Details asks for more rows than the load brought.
    expect(isTopRowsRequest({ ...topRows, limit: 100 })).toBe(false);
    expect(isTopRowsRequest({ ...topRows, cursor: "next" })).toBe(false);
    expect(isTopRowsRequest({ ...topRows, search: "/docs" })).toBe(false);
  });
});
