import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ fetchPrivateJson: vi.fn() }));

vi.mock("@/lib/dashboard/client/request", () => ({
  fetchPrivateJson: mocks.fetchPrivateJson,
}));

import { setPropertyFilterValue } from "@/lib/dashboard/filter-state";
import type { TimeWindow } from "@/lib/dashboard/query-state";

import { fetchPropertyKeys, fetchPropertyValues } from "./properties";

const window: TimeWindow = {
  preset: "custom",
  from: 1_000,
  to: 2_000,
  interval: "hour",
  timeZone: "UTC",
};
const filters = setPropertyFilterValue({ conditions: [] }, "author", "Jane");

beforeEach(() => {
  mocks.fetchPrivateJson.mockReset().mockResolvedValue({ ok: true });
});

describe("property data client helpers", () => {
  it("fetches the period's keys with the page's filters", async () => {
    const controller = new AbortController();
    await fetchPropertyKeys("site-1", window, filters, {
      signal: controller.signal,
    });

    expect(mocks.fetchPrivateJson).toHaveBeenCalledWith(
      "/api/private/properties",
      {
        siteId: "site-1",
        from: 1_000,
        to: 2_000,
        timeZone: "UTC",
        "filter[event.payload][/author]": "Jane",
      },
      { signal: controller.signal },
    );
  });

  it("fetches a key's values, sorted, and searched when asked", async () => {
    await fetchPropertyValues("site-1", window, "author", filters, {
      limit: 10,
      search: "",
      sort: "visitors",
      direction: "desc",
    });
    await fetchPropertyValues("site-1", window, "author", filters, {
      limit: 100,
      search: "ja",
      sort: "events",
      direction: "asc",
    });

    expect(mocks.fetchPrivateJson).toHaveBeenNthCalledWith(
      1,
      "/api/private/property-values",
      expect.not.objectContaining({ search: expect.anything() }),
      { signal: undefined },
    );
    expect(mocks.fetchPrivateJson).toHaveBeenNthCalledWith(
      2,
      "/api/private/property-values",
      expect.objectContaining({
        key: "author",
        limit: 100,
        sort: "events",
        direction: "asc",
        search: "ja",
        "filter[event.payload][/author]": "Jane",
      }),
      { signal: undefined },
    );
  });
});
