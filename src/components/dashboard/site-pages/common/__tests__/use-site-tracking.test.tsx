import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const requestAdminService = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dashboard-api/client/admin-service", () => ({
  requestAdminService,
}));

import {
  type SiteTrackingState,
  useSiteTracking,
} from "@/components/dashboard/site-pages/common/use-site-tracking";

afterEach(() => {
  document.body.replaceChildren();
  requestAdminService.mockReset();
});

describe("useSiteTracking", () => {
  it("says when the request failed, and loads on retry", async () => {
    requestAdminService
      .mockRejectedValueOnce(new Error("Internal Server Error"))
      .mockResolvedValueOnce({ hasData: true, firstDataAt: 1_000 });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let tracking: SiteTrackingState | undefined;
    function Probe() {
      tracking = useSiteTracking("site-1");
      return null;
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(QueryClientProvider, { client }, createElement(Probe)),
      );
    });

    await vi.waitFor(() => expect(tracking?.failed).toBe(true));
    expect(tracking?.data).toBeUndefined();

    act(() => tracking?.retry());
    await vi.waitFor(() =>
      expect(tracking?.data).toEqual({ hasData: true, firstDataAt: 1_000 }),
    );
    expect(tracking?.failed).toBe(false);
    act(() => root.unmount());
  });
});
