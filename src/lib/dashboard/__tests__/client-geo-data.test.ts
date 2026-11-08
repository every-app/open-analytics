import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOverviewGeoDimensionTabPage } from "@/lib/dashboard/client/data/geo";
import type { TimeWindow } from "@/lib/dashboard/query-state";
describe("dashboard client geo data helpers", () => {
  const realFetch = globalThis.fetch;
  const window: TimeWindow = {
    preset: "today",
    from: 1000,
    to: 2000,
    timeZone: "UTC",
    interval: "hour",
  };

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    });
  }

  function geoTabResponse(items: unknown[]): Response {
    return jsonResponse({
      ok: true,
      data: {
        items,
        pagination: {
          limit: 100,
          returned: items.length,
          hasMore: false,
          nextCursor: null,
        },
      },
    });
  }

  function paramsFromCall(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
    const url = String(fetchMock.mock.calls[index][0]);
    return new URLSearchParams(url.split("?")[1] ?? "");
  }

  it("normalizes geo dimension labels for generic, region, and city tabs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        geoTabResponse([
          {
            value: "",
            label: "  United States  ",
            views: "11",
            sessions: "5",
            visitors: "3",
          },
        ]),
      )
      .mockResolvedValueOnce(
        geoTabResponse([
          {
            value: "US::CA::California",
            label: "United States :: CA :: California",
          },
          {
            value: "raw-region",
            label: " ",
            views: "2",
          },
        ]),
      )
      .mockResolvedValueOnce(
        geoTabResponse([
          {
            value: "US::CA::California::San Francisco",
            label: "United States :: CA :: California :: San Francisco",
            sessions: "4",
          },
          {
            value: "raw-city",
            label: "",
            visitors: "6",
          },
        ]),
      );
    globalThis.fetch = fetchMock;

    await expect(
      fetchOverviewGeoDimensionTabPage("geo-country", window, "country").then(
        (page) => page.items,
      ),
    ).resolves.toEqual([
      {
        value: "United States",
        label: "United States",
        views: 11,
        sessions: 5,
        visitors: 3,
      },
    ]);
    await expect(
      fetchOverviewGeoDimensionTabPage("geo-region", window, "region").then(
        (page) => page.items,
      ),
    ).resolves.toEqual([
      {
        value: "US::CA::California",
        label: "California",
        views: 0,
        sessions: 0,
        visitors: 0,
      },
      {
        value: "raw-region",
        label: "raw-region",
        views: 2,
        sessions: 0,
        visitors: 0,
      },
    ]);
    await expect(
      fetchOverviewGeoDimensionTabPage("geo-city", window, "city").then(
        (page) => page.items,
      ),
    ).resolves.toEqual([
      {
        value: "US::CA::California::San Francisco",
        label: "San Francisco",
        views: 0,
        sessions: 4,
        visitors: 0,
      },
      {
        value: "raw-city",
        label: "raw-city",
        views: 0,
        sessions: 0,
        visitors: 6,
      },
    ]);
    expect(paramsFromCall(fetchMock, 0).get("limit")).toBe("100");
  });

  it("fails when the endpoint fails, so the card can say so", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(
      fetchOverviewGeoDimensionTabPage("geo-failed", window, "country"),
    ).rejects.toThrow("offline");
  });

  it("reads paginated dimension responses from the overview contract", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          items: [
            {
              value: "US",
              label: "United States",
              views: "12",
              sessions: "7",
              visitors: "5",
            },
          ],
          pagination: {
            limit: 100,
            returned: 1,
            hasMore: false,
            nextCursor: null,
          },
        },
      }),
    );

    await expect(
      fetchOverviewGeoDimensionTabPage("geo-paginated", window, "country").then(
        (page) => page.items,
      ),
    ).resolves.toEqual([
      {
        value: "US",
        label: "United States",
        views: 12,
        sessions: 7,
        visitors: 5,
      },
    ]);
  });

  it("rejects legacy array dimension responses instead of masking the contract mismatch", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        data: [
          {
            value: "US",
            label: "United States",
          },
        ],
      }),
    );

    await expect(
      fetchOverviewGeoDimensionTabPage("geo-legacy", window, "country").then(
        (page) => page.items,
      ),
    ).rejects.toThrow("pagination_contract_violation");
  });
});
