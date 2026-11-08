import { afterEach, describe, expect, it, vi } from "vitest";

const requestAdminService = vi.hoisted(() => vi.fn());

vi.mock("@/lib/dashboard-api/client/admin-service", () => ({
  requestAdminService,
}));

import type {
  TabbedDataTableColumn,
  TabbedDataTableRowBase,
  TabbedDataTableTab,
} from "@/components/dashboard/common/tabbed-data-table-card/types";
import {
  buildCsv,
  createTabRecord,
  csvCell,
  defaultNormalizeRows,
  downloadCsv,
  exportRowLabelFallback,
  firstSortableColumnKey,
  getColumnsForTab,
  sanitizeCsvFilename,
} from "@/components/dashboard/common/tabbed-data-table-card/utils";
import {
  leadingLabelLetter,
  resolveFaviconUrlForLabel,
  sanitizeHostname,
  toAbsoluteHttpsUrl,
} from "@/components/dashboard/site-pages/overview/overview-url";
import {
  blockingRuleRows,
  blockingRulesPatch,
  invalidBlockingRules,
  postJson,
  randomPublicSlug,
  resolveSiteSlug,
} from "@/components/dashboard/site-pages/settings/settings-model";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import type { AppMessages } from "@/lib/i18n/messages";

const messages = {
  common: { noData: "No data", unknown: "Unknown" },
  sessionDetail: { yes: "Yes", no: "No" },
  realtime: {
    statusLabels: { connected: "Connected" },
    customEvent: "Custom event",
    viewPage: "Page view",
  },
  dashboardHeader: {
    previousPeriod: "Previous period",
    compareButton: "Compare",
  },
  filterBuilder: {
    fieldLabels: { "page.path": "Page path" },
  },
  systemPerformance: {
    range15m: "15m",
    range1h: "1h",
    range6h: "6h",
    range24h: "24h",
  },
} as unknown as AppMessages;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("recently split dashboard helpers", () => {
  it("normalizes host and favicon URLs and labels", () => {
    expect(sanitizeHostname(" HTTPS://Example.com/path?q=1 ")).toBe(
      "Example.com",
    );
    expect(sanitizeHostname("example.com///")).toBe("example.com");
    expect(toAbsoluteHttpsUrl(" ")).toBeNull();
    expect(toAbsoluteHttpsUrl("https://example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(toAbsoluteHttpsUrl("//example.com/path")).toBe(
      "https://example.com/path",
    );
    expect(toAbsoluteHttpsUrl("example.com")).toBe("https://example.com/");
    expect(toAbsoluteHttpsUrl("https://[invalid")).toBeNull();
    expect(resolveFaviconUrlForLabel(" ")).toBeNull();
    expect(resolveFaviconUrlForLabel("/local/icon.png")).toBeNull();
    expect(resolveFaviconUrlForLabel("https://example.com/path")).toBe(
      "https://example.com/favicon.ico",
    );
    expect(resolveFaviconUrlForLabel("//example.com/path")).toBe(
      "https://example.com/favicon.ico",
    );
    expect(resolveFaviconUrlForLabel("example.com/path")).toBe(
      "https://example.com/favicon.ico",
    );
    expect(resolveFaviconUrlForLabel("https://[invalid")).toBeNull();
    expect(leadingLabelLetter("  insight ")).toBe("I");
    expect(leadingLabelLetter(" ")).toBe("?");
  });

  it("covers settings helpers and blocking-rule list conversions", async () => {
    const site = {
      id: "12345678-90",
      name: "Example",
      domain: "www.example.com",
      publicSlug: "x",
    } as SiteData;
    expect(resolveSiteSlug(site)).toBe("www-example-com");
    expect(resolveSiteSlug({ ...site, domain: "!!!" })).toBe("12345678");
    expect(randomPublicSlug()).toMatch(/^[a-z0-9]{8}$/);
    let id = 0;
    const rows = blockingRuleRows(
      {
        blockingRules: [
          {
            version: 2,
            data: { paths: ["# comment", "/admin/*", "-/admin/health", ""] },
          },
        ],
      },
      () => `row-${id++}`,
    );
    expect(rows).toEqual([
      { id: "row-0", field: "paths", action: "block", value: "/admin/*" },
      { id: "row-1", field: "paths", action: "allow", value: "/admin/health" },
    ]);
    expect(
      blockingRulesPatch([
        ...rows,
        { id: "row-2", field: "ips", action: "block", value: " " },
      ]),
    ).toMatchObject({ paths: ["/admin/*", "-/admin/health"], ips: [] });
    const invalid = invalidBlockingRules([
      ...rows,
      { id: "row-3", field: "ips", action: "block", value: "not-an-ip" },
    ]);
    expect([...invalid.rowIds]).toEqual(["row-3"]);
    expect(invalid.tooManyFields).toEqual([]);

    requestAdminService.mockReset().mockResolvedValue({ ok: true });
    await expect(postJson("sites", { teamId: "team-1" })).resolves.toEqual({
      ok: true,
    });
    expect(requestAdminService).toHaveBeenLastCalledWith("sites", {
      method: "POST",
      body: { teamId: "team-1" },
    });
    await postJson("sites", { teamId: "team-1" }, "PATCH");
    expect(requestAdminService).toHaveBeenLastCalledWith("sites", {
      method: "PATCH",
      body: { teamId: "team-1" },
    });
  });

  it("creates tabs, selects columns, exports labels, and serializes CSV", () => {
    type Row = TabbedDataTableRowBase & {
      label?: string;
      displayLabel?: string;
      rawLabel?: string;
    };
    const tabs: TabbedDataTableTab<"all" | "bot">[] = [
      { value: "all", label: "All" },
      { value: "bot", label: "Bot" },
    ];
    const rows: Row[] = [{ key: "k" }];
    expect(defaultNormalizeRows(rows)).toBe(rows);
    expect(createTabRecord(tabs, (tab) => tab.label)).toEqual({
      all: "All",
      bot: "Bot",
    });
    const columns: TabbedDataTableColumn<
      Row,
      "name" | "count",
      "all" | "bot"
    >[] = [
      { key: "name", label: "Name", sortable: false, getValue: () => 0 },
      { key: "count", label: "Count", getValue: () => 1 },
    ];
    expect(getColumnsForTab(columns, "all")).toBe(columns);
    expect(
      getColumnsForTab(
        (tab) => (tab === "bot" ? columns.slice(1) : columns),
        "bot",
      ),
    ).toEqual(columns.slice(1));
    expect(firstSortableColumnKey(columns)).toBe("count");
    expect(firstSortableColumnKey(columns.slice(0, 1))).toBe("name");
    expect(sanitizeCsvFilename("  ")).toBe("table-export.csv");
    expect(sanitizeCsvFilename("Some <report>?.CSV")).toBe("Some-report-.CSV");
    expect(sanitizeCsvFilename("already.csv")).toBe("already.csv");
    expect(csvCell(null)).toBe("");
    expect(csvCell(4)).toBe("4");
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell('a,"b"\nnext')).toBe('"a,""b""\nnext"');
    expect(
      buildCsv([
        ["a", 2],
        [null, "b"],
      ]),
    ).toBe("a,2\r\n,b");
    expect(
      exportRowLabelFallback({ displayLabel: " Display ", key: "k" }),
    ).toBe(" Display ");
    expect(exportRowLabelFallback({ label: "Label", key: "k" })).toBe("Label");
    expect(exportRowLabelFallback({ rawLabel: 42, key: "k" })).toBe("42");
    expect(exportRowLabelFallback({ rawLabel: Number.NaN, key: "k" })).toBe(
      "k",
    );

    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    downloadCsv("unsafe?.csv", "a,b");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="unsafe-.csv"]')).toBeNull();
  });
});
