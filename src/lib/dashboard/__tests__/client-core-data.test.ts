import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFunnel,
  deleteFunnel,
  fetchFunnelDetail,
  fetchFunnels,
} from "@/lib/dashboard/client/data/core";
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
  withFilters: vi.fn((params: Record<string, unknown>) => params),
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
