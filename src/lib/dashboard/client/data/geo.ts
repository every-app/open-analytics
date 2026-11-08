import type {
  DashboardListRequestOptions,
  OverviewGeoDimensionTab,
  OverviewGeoTabRows,
} from "@/lib/dashboard/client/data/types";
import { fetchPrivateJson } from "@/lib/dashboard/client/request";
import {
  normalizePaginatedCollection,
  withComparison,
  withFilters,
} from "@/lib/dashboard/client/utils";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { OverviewGeoTabData } from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract";
function normalizeGeoDimensionLabel(
  tab: OverviewGeoDimensionTab,
  row: Record<string, unknown>,
): string {
  const label = String(row.label ?? "").trim();
  const value = String(row.value ?? "").trim();
  const fallback = label || value;
  if (tab !== "region" && tab !== "city") return fallback;
  const segmentIndex = tab === "region" ? 2 : 3;
  return (
    fallback
      .split("::")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)[segmentIndex] || fallback
  );
}
/** Paginated form used by TabbedDataTableCard loaders. */
export async function fetchOverviewGeoDimensionTabPage(
  siteId: string,
  window: TimeWindow,
  tab: OverviewGeoDimensionTab,
  filters?: FilterDocument,
  options?: DashboardListRequestOptions,
): Promise<OverviewGeoTabData["data"]> {
  const payload = await fetchPrivateJson<OverviewGeoTabData>(
    `/api/private/overview-geo-${tab}`,
    withComparison(
      withFilters(
        {
          siteId,
          from: window.from,
          to: window.to,
          timeZone: window.timeZone,
          limit: options?.limit ?? 100,
          ...(options?.cursor ? { cursor: options.cursor } : {}),
          ...(options?.search?.trim() ? { search: options.search.trim() } : {}),
          ...(options?.sort ? { sort: options.sort } : {}),
          ...(options?.direction ? { direction: options.direction } : {}),
        },
        filters,
      ),
      options?.comparison,
      {
        metric: options?.comparisonMetric,
        sortBy: options?.comparisonSortBy,
      },
    ),
    { signal: options?.signal },
  );
  const rows = normalizePaginatedCollection<
    OverviewGeoTabData["data"]["items"][number]
  >(payload.data);
  return {
    ...rows,
    items: rows.items.map((row) => ({
      ...row,
      value:
        String((row as { value?: unknown }).value ?? "").trim() ||
        String((row as { label?: unknown }).label ?? "").trim(),
      label: normalizeGeoDimensionLabel(
        tab,
        row as unknown as Record<string, unknown>,
      ),
      views: Number((row as { views?: unknown }).views ?? 0),
      sessions: Number((row as { sessions?: unknown }).sessions ?? 0),
      visitors: Number((row as { visitors?: unknown }).visitors ?? 0),
    })) as OverviewGeoTabRows,
  };
}
