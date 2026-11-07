import { emptyEventFieldValues } from "@/lib/dashboard/client/data/empty";
import { fetchPrivateJson } from "@/lib/dashboard/client/request";
import {
  normalizePaginatedCollection,
  withFilters,
  withPagination,
} from "@/lib/dashboard/client/utils";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  EventField,
  EventFieldValuesData,
  EventFieldValueStat,
  EventTypeFieldsData,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument, FilterScope } from "@/lib/filter-contract";
function fallbackUnlessAborted<T>(error: unknown, fallback: () => T): T {
  if (error instanceof Error && error.name === "AbortError") throw error;
  if (
    error instanceof Error &&
    error.message === "pagination_contract_violation"
  ) {
    throw error;
  }
  return fallback();
}
export async function fetchEventTypeFields(
  siteId: string,
  window: TimeWindow,
  eventName?: string,
  filters?: FilterDocument,
  options?: {
    limit?: number;
    cursor?: string | null;
    signal?: AbortSignal;
    resolvedScope?: FilterScope;
  },
): Promise<EventTypeFieldsData> {
  const normalizedEventName = eventName?.trim() ?? "";
  const payload = await fetchPrivateJson<EventTypeFieldsData>(
    "/api/private/event-type-fields",
    withFilters(
      withPagination(
        {
          siteId,
          from: window.from,
          to: window.to,
          timeZone: window.timeZone,
          ...(normalizedEventName ? { eventName: normalizedEventName } : {}),
        },
        options,
        100,
      ),
      filters,
      options?.resolvedScope,
    ),
    { signal: options?.signal },
  ).catch((error) =>
    fallbackUnlessAborted(error, () => ({
      ok: true,
      eventName: normalizedEventName,
      data: {
        items: [],
        pagination: {
          limit: options?.limit ?? 100,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    })),
  );
  const rawPayload = payload as EventTypeFieldsData & {
    fields?: unknown;
  };
  return {
    ...rawPayload,
    data: normalizePaginatedCollection<EventField>(
      rawPayload.data ?? rawPayload.fields,
    ),
  };
}
export async function fetchEventTypeFieldValues(
  siteId: string,
  window: TimeWindow,
  eventName: string | undefined,
  fieldPath: string,
  fieldValueType: EventField["valueType"],
  filters?: FilterDocument,
  options?: {
    limit?: number;
    cursor?: string | null;
    search?: string;
    signal?: AbortSignal;
    resolvedScope?: FilterScope;
  },
): Promise<EventFieldValuesData> {
  const normalizedEventName = eventName?.trim() ?? "";
  const normalizedFieldPath = String(fieldPath ?? "");
  if (!normalizedFieldPath) {
    return emptyEventFieldValues(normalizedFieldPath, fieldValueType);
  }
  const payload = await fetchPrivateJson<EventFieldValuesData>(
    "/api/private/event-type-field-values",
    withFilters(
      withPagination(
        {
          siteId,
          from: window.from,
          to: window.to,
          timeZone: window.timeZone,
          ...(normalizedEventName ? { eventName: normalizedEventName } : {}),
          fieldPath: normalizedFieldPath,
          fieldValueType,
          ...(options?.search?.trim() ? { search: options.search.trim() } : {}),
        },
        options,
        25,
      ),
      filters,
      options?.resolvedScope,
    ),
    { signal: options?.signal },
  ).catch((error) =>
    fallbackUnlessAborted(error, () =>
      emptyEventFieldValues(normalizedFieldPath, fieldValueType),
    ),
  );
  return {
    ...payload,
    data: normalizePaginatedCollection<EventFieldValueStat>(payload.data),
  };
}
