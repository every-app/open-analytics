import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFunnel,
  deleteFunnel,
  fetchEventTypeFields,
  fetchEventTypeFieldValues,
  fetchFunnelDetail,
  fetchFunnels,
} from "@/lib/dashboard/client/data/core";
import { emptyEventFieldValues } from "@/lib/dashboard/client/data/empty";
import { dashboardFilterDocumentFromPresentation } from "@/lib/dashboard/filter-state";
vi.mock("@/lib/dashboard/client/request", () => ({
  fetchPrivateJson: vi.fn(),
  fetchPrivateJsonMutate: vi.fn(),
}));
vi.mock("@/lib/dashboard/client/utils", () => ({
  normalizePaginatedCollection: vi.fn((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("pagination_contract_violation");
    }
    const record = value as Record<string, unknown>;
    if (
      Object.keys(record).length !== 2 ||
      !Array.isArray(record.items) ||
      !record.pagination ||
      typeof record.pagination !== "object" ||
      Array.isArray(record.pagination)
    ) {
      throw new Error("pagination_contract_violation");
    }
    const pagination = record.pagination as Record<string, unknown>;
    if (
      Object.keys(pagination).length !== 4 ||
      typeof pagination.limit !== "number" ||
      pagination.limit < 1 ||
      pagination.returned !== record.items.length ||
      typeof pagination.hasMore !== "boolean" ||
      (pagination.nextCursor !== null &&
        typeof pagination.nextCursor !== "string") ||
      pagination.hasMore !== (pagination.nextCursor !== null)
    ) {
      throw new Error("pagination_contract_violation");
    }
    return { items: record.items, pagination };
  }),
  withFilters: vi.fn(
    (
      params: Record<string, unknown>,
      _filters: unknown,
      resolvedScope?: string,
    ) => (resolvedScope ? { ...params, scope: resolvedScope } : params),
  ),
  withPagination: vi.fn(
    (
      params: Record<string, unknown>,
      options?: { limit?: number; cursor?: string | null },
      defaultLimit?: number,
    ) => ({
      ...params,
      ...(options?.limit !== undefined
        ? { limit: options.limit }
        : defaultLimit !== undefined
          ? { limit: defaultLimit }
          : {}),
      ...(options?.cursor ? { cursor: options.cursor } : {}),
    }),
  ),
}));
import {
  fetchPrivateJson,
  fetchPrivateJsonMutate,
} from "@/lib/dashboard/client/request";
const fetchPrivateJsonMock = vi.mocked(fetchPrivateJson);
const fetchPrivateJsonMutateMock = vi.mocked(fetchPrivateJsonMutate);
const window = {
  preset: "custom" as const,
  from: 1000,
  to: 2000,
  timeZone: "UTC",
  interval: "day" as const,
};
beforeEach(() => {
  fetchPrivateJsonMock.mockReset();
  fetchPrivateJsonMutateMock.mockReset();
  fetchPrivateJsonMock.mockResolvedValue({
    ok: true,
    data: {
      items: [],
      pagination: {
        limit: 1,
        returned: 0,
        hasMore: false,
        nextCursor: null,
      },
    },
  } as any);
});
describe("fetchFunnelDetail", () => {
  it("fetches funnel lists by site", async () => {
    fetchPrivateJsonMock.mockResolvedValueOnce({ funnels: [] } as any);

    await fetchFunnels("site-1");

    expect(fetchPrivateJsonMock).toHaveBeenCalledWith("/api/private/funnels", {
      siteId: "site-1",
      limit: 100,
    });
  });

  it("throws for empty funnelId", async () => {
    await expect(fetchFunnelDetail("site-1", "  ", window)).rejects.toThrow(
      "Funnel id is required",
    );
    expect(fetchPrivateJsonMock).not.toHaveBeenCalled();
  });

  it("creates and deletes funnels through mutation requests", async () => {
    fetchPrivateJsonMutateMock.mockResolvedValueOnce({ ok: true } as any);
    fetchPrivateJsonMutateMock.mockResolvedValueOnce({ ok: true } as any);

    await createFunnel("site-1", {
      name: "Signup",
      progressionScope: "session",
      conversionWindowMs: null,
      steps: [
        { id: "step-1", filterDsl: 'page.path eq "/signup"' },
        { id: "step-2", filterDsl: 'event.name eq "complete"' },
      ],
    });
    await deleteFunnel("site-1", "funnel-1");

    expect(fetchPrivateJsonMutateMock).toHaveBeenNthCalledWith(
      1,
      "/api/private/funnels",
      "POST",
      { siteId: "site-1" },
      {
        name: "Signup",
        progressionScope: "session",
        conversionWindowMs: null,
        steps: [
          { id: "step-1", filterDsl: 'page.path eq "/signup"' },
          { id: "step-2", filterDsl: 'event.name eq "complete"' },
        ],
      },
    );
    expect(fetchPrivateJsonMutateMock).toHaveBeenNthCalledWith(
      2,
      "/api/private/funnels",
      "DELETE",
      { siteId: "site-1", id: "funnel-1" },
    );
  });
});
describe("fetchEventTypeFields", () => {
  it("loads fields across event types without an event name", async () => {
    await fetchEventTypeFields("site-1", window, "  ");

    expect(fetchPrivateJsonMock).toHaveBeenCalledWith(
      "/api/private/event-type-fields",
      expect.not.objectContaining({ eventName: expect.anything() }),
      { signal: undefined },
    );
  });

  it("uses the private fields endpoint and keeps filters", async () => {
    await fetchEventTypeFields(
      "site-1",
      window,
      "click",
      dashboardFilterDocumentFromPresentation({ country: "CN" }),
    );

    expect(fetchPrivateJsonMock).toHaveBeenCalledWith(
      "/api/private/event-type-fields",
      expect.objectContaining({ eventName: "click" }),
      { signal: undefined },
    );
  });

  it("passes the resolved scope for payload field suggestions", async () => {
    await fetchEventTypeFields("site-1", window, "click", undefined, {
      resolvedScope: "session",
    });

    expect(fetchPrivateJsonMock).toHaveBeenCalledWith(
      "/api/private/event-type-fields",
      expect.objectContaining({ scope: "session" }),
      { signal: undefined },
    );
  });

  it("falls back to empty fields when the request fails", async () => {
    fetchPrivateJsonMock.mockRejectedValueOnce(new Error("fail"));

    await expect(
      fetchEventTypeFields("site-1", window, "click"),
    ).resolves.toEqual({
      ok: true,
      eventName: "click",
      data: {
        items: [],
        pagination: {
          limit: 100,
          returned: 0,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
  });
});
describe("fetchEventTypeFieldValues", () => {
  it("forwards a trimmed search term", async () => {
    fetchPrivateJsonMock.mockResolvedValueOnce(
      emptyEventFieldValues("path", "string"),
    );

    await fetchEventTypeFieldValues(
      "site-1",
      window,
      "click",
      "path",
      "string",
      undefined,
      { search: "  pro  " },
    );

    expect(fetchPrivateJsonMock).toHaveBeenCalledWith(
      "/api/private/event-type-field-values",
      expect.objectContaining({ search: "pro" }),
      { signal: undefined },
    );
  });

  it("passes the resolved scope with event payload value filters", async () => {
    fetchPrivateJsonMock.mockResolvedValueOnce(
      emptyEventFieldValues("payload.plan", "string"),
    );

    await fetchEventTypeFieldValues(
      "site-1",
      window,
      "click",
      "payload.plan",
      "string",
      dashboardFilterDocumentFromPresentation({ path: "/pricing" }),
      { resolvedScope: "visitor" },
    );

    expect(fetchPrivateJsonMock).toHaveBeenCalledWith(
      "/api/private/event-type-field-values",
      expect.objectContaining({
        scope: "visitor",
      }),
      { signal: undefined },
    );
  });

  it("loads field values across event types without an event name", async () => {
    await fetchEventTypeFieldValues("site-1", window, "  ", "field", "string");

    expect(fetchPrivateJsonMock).toHaveBeenCalledWith(
      "/api/private/event-type-field-values",
      expect.not.objectContaining({ eventName: expect.anything() }),
      { signal: undefined },
    );
  });

  it("returns emptyEventFieldValues for empty fieldPath", async () => {
    const result = await fetchEventTypeFieldValues(
      "site-1",
      window,
      "click",
      "",
      "string",
    );
    expect(result).toEqual(emptyEventFieldValues("", "string"));
    expect(fetchPrivateJsonMock).not.toHaveBeenCalled();
  });

  it("falls back on error", async () => {
    fetchPrivateJsonMock.mockRejectedValueOnce(new Error("fail"));

    const result = await fetchEventTypeFieldValues(
      "site-1",
      window,
      "click",
      "path",
      "number",
    );
    expect(result).toEqual(emptyEventFieldValues("path", "number"));
  });
});
