import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";

// Checked again while waiting, so the reports open once the first view lands.
const WAITING_REFETCH_MS = 15_000;

export interface SiteTracking {
  /** Whether the site has received a page view yet. */
  hasData: boolean;
  /** When its first page view happened; All time starts there. */
  firstDataAt: number | null;
}

export interface SiteTrackingState {
  /** `undefined` until known. */
  data: SiteTracking | undefined;
  /** The request failed and isn't being tried again. */
  failed: boolean;
  retry: () => void;
}

/**
 * Whether a site has received a page view yet, and when the first one came.
 * While it hasn't, the answer is checked again every few seconds; when the
 * first view arrives, every dashboard query refetches so the numbers load.
 */
export function useSiteTracking(siteId: string | undefined): SiteTrackingState {
  const queryClient = useQueryClient();
  const tracking = useQuery({
    queryKey: ["dashboard", "site-tracking", siteId],
    queryFn: ({ signal }) =>
      requestAdminService<SiteTracking>("site-tracking", {
        params: { siteId: siteId! },
        signal,
      }),
    enabled: Boolean(siteId) && typeof window !== "undefined",
    refetchInterval: (query) =>
      query.state.data?.hasData === false ? WAITING_REFETCH_MS : false,
  });
  const hasData = tracking.data?.hasData;
  // Keyed by site, so moving to a site that already has data isn't
  // mistaken for the first view arriving.
  const previous = useRef({ siteId, hasData });

  useEffect(() => {
    if (
      previous.current.siteId === siteId &&
      previous.current.hasData === false &&
      hasData === true
    ) {
      void queryClient.invalidateQueries({
        queryKey: ["dashboard"],
        predicate: (query) => query.queryKey[1] !== "site-tracking",
      });
    }
    previous.current = { siteId, hasData };
  }, [hasData, queryClient, siteId]);

  return {
    data: tracking.data,
    failed: tracking.isError && !tracking.isFetching,
    retry: () => void tracking.refetch(),
  };
}
