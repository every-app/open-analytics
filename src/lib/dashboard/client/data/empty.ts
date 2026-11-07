import type {
  DashboardFilterOptionsData,
  EventField,
  EventFieldValuesData,
} from "@/lib/dashboard-api/client/edge";
function emptyPagination(limit = 1) {
  return {
    limit,
    returned: 0,
    hasMore: false,
    nextCursor: null,
  } as const;
}
export function emptyEventFieldValues(
  fieldPath = "",
  fieldValueType: EventField["valueType"] | "" = "",
): EventFieldValuesData {
  return {
    ok: true,
    fieldPath,
    fieldValueType,
    data: { items: [], pagination: emptyPagination() },
  };
}
export function emptyDashboardFilterOptions(): DashboardFilterOptionsData {
  return {
    ok: true,
    data: { items: [], pagination: emptyPagination() },
  };
}
