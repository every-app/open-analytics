import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { publicDashboardSiteId } from "@/lib/dashboard/client/request";
import { EMPTY_DASHBOARD_FILTER_DOCUMENT } from "@/lib/dashboard/filter-state";
import {
  type AccountNotificationPreferencesInitialData,
  type ManagementJsonObject,
  type NotificationCenterInitialData,
  type SerializableNotificationMessageData,
  type SiteSettingsInitialData,
  type SystemSettingsInitialData,
  type TeamNotificationsInitialData,
} from "@/lib/dashboard/management-data";
import { resolveDashboardInitialWindow } from "@/lib/dashboard/query-preferences";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import {
  getDashboardTeamContext,
  getDashboardTeamSites,
  readDashboardAdmin,
} from "@/lib/dashboard/server";
import { resolveTeamDashboardRequest } from "@/lib/dashboard/server/query";
import type { TeamDashboardSnapshot } from "@/lib/dashboard/team-dashboard-query";
import { normalizeNotificationPreferencesData } from "@/lib/dashboard-api/client/edge";
import { fetchPublicSite } from "@/lib/dashboard-api/client/edge";
import type { NotificationMessageData } from "@/lib/dashboard-api/contract/types";
import { createTeamDashboardQueryRuntime } from "@/lib/edge/analytics/composition/ssr-query-runtime";
import {
  createQueryTime,
  FilterAdapterError,
  parseFilterUrlForAudience,
  teamQueryContext,
} from "@/lib/edge/analytics/contract";
import { resolveEdgeRuntime } from "@/lib/edge/runtime";
import type { FilterDocument } from "@/lib/filter-contract";
import type { Locale } from "@/lib/i18n/config";
import { normalizeSiteScriptSettings } from "@/lib/site-settings";
import { gatewayHostname } from "@/lib/theme-cookie";
/** The address's filters, or none when they name a field that no longer exists. */
function parseDashboardUrlFilters(url: string): FilterDocument {
  try {
    return parseFilterUrlForAudience("private-dashboard", url);
  } catch (error) {
    if (error instanceof FilterAdapterError) {
      return EMPTY_DASHBOARD_FILTER_DOCUMENT;
    }
    throw error;
  }
}
function serializeManagementJsonObject(
  value: Record<string, unknown>,
): ManagementJsonObject {
  return JSON.parse(JSON.stringify(value)) as ManagementJsonObject;
}
function serializeNotificationMessage(
  message: NotificationMessageData,
): SerializableNotificationMessageData {
  return {
    ...message,
    data: serializeManagementJsonObject(message.data),
    channels: serializeManagementJsonObject(message.channels),
    deliveryResults: serializeManagementJsonObject(message.deliveryResults),
  };
}
/** Provides the SSR-safe initial query window to the dashboard shell. */
export const loadDashboardInitialWindow = createServerFn({
  method: "GET",
}).handler((): TimeWindow =>
  resolveDashboardInitialWindow(getRequest().headers.get("cookie")),
);
/** The Gateway's hostname, where the shared theme cookie lives; null standalone. */
export const loadGatewayHostname = createServerFn({ method: "GET" }).handler(
  async () => {
    const runtime = await resolveEdgeRuntime(getRequest());
    return gatewayHostname(runtime.env.GATEWAY_URL);
  },
);
/** The workspace, its sites and the signed-in person, for the app layout. */
export const loadDashboardTeam = createServerFn({ method: "GET" }).handler(() =>
  getDashboardTeamContext(),
);
/** Loads the first team-dashboard snapshot on the server for a stable hydrate. */
export const loadTeamDashboardSnapshot = createServerFn({ method: "GET" })
  .validator((data: { teamId: string }) => data)
  .handler(async ({ data }): Promise<TeamDashboardSnapshot | null> => {
    const request = getRequest();
    const runtime = await resolveEdgeRuntime(request);
    const resolved = await resolveTeamDashboardRequest({
      request,
      env: runtime.env,
      teamId: data.teamId,
    });
    if (resolved instanceof Response) return null;

    const preloadedSites = await getDashboardTeamSites(data.teamId);

    const window = resolveDashboardInitialWindow(request.headers.get("cookie"));
    const filters = parseDashboardUrlFilters(request.url);
    const teamDashboardRuntime = createTeamDashboardQueryRuntime({
      env: resolved.env,
      teamId: resolved.teamId,
      window: {
        startMs: window.from,
        endExclusiveMs: window.to,
        nowMs: window.to,
        timeZone: window.timeZone,
      },
      interval: window.interval,
      allowedSiteIds: resolved.allowedSiteIds,
      preloadedSites: preloadedSites.map(({ slug: _slug, ...site }) => ({
        ...site,
        publicEnabled: Number(Boolean(site.publicEnabled)),
      })),
    });
    const result = await teamDashboardRuntime.execute("team-dashboard", {
      context: teamQueryContext(
        resolved.teamId,
        "private-dashboard",
        resolved.allowedSiteIds,
      ),
      time: createQueryTime(window.from, window.to, window.timeZone, window.to),
      filters,
    });
    if (!result.ok) throw new Error(result.error.kind);
    return {
      data: result.data,
      window: {
        from: window.from,
        to: window.to,
        interval: window.interval,
        timeZone: window.timeZone,
      },
      range: window.preset,
      fetchedAt: Date.now(),
    };
  });
/** Loads tracker settings and the install snippet for site settings SSR. */
/**
 * Get started's progress, read on the server so the card renders with the
 * page instead of appearing a moment later. Null for members, who don't see
 * the card.
 */
export const loadGetStarted = createServerFn({ method: "GET" }).handler(() =>
  readDashboardAdmin("get-started"),
);
export const loadSiteSettingsInitialData = createServerFn({ method: "GET" })
  .validator((data: { siteId: string }) => data)
  .handler(async ({ data }): Promise<SiteSettingsInitialData | null> => {
    const [config, snippet] = await Promise.all([
      readDashboardAdmin("site-config", { siteId: data.siteId }),
      readDashboardAdmin("script-snippet", { siteId: data.siteId }),
    ]);
    if (!config || !snippet) return null;
    return {
      config: { ...config, ...normalizeSiteScriptSettings(config) },
      scriptSnippet: snippet.snippet,
      origin: new URL(getRequest().url).origin,
      fetchedAt: Date.now(),
    };
  });
export const loadTeamNotificationsInitialData = createServerFn({
  method: "GET",
})
  .validator((data: { teamId: string }) => data)
  .handler(async ({ data }): Promise<TeamNotificationsInitialData | null> => {
    const [rules, sites, emailConfig] = await Promise.all([
      readDashboardAdmin("notification-rules", { teamId: data.teamId }),
      readDashboardAdmin("sites", { teamId: data.teamId }),
      readDashboardAdmin("notification-email"),
    ]);
    if (!rules || !sites) return null;
    return {
      rules,
      sites,
      emailConfigured: emailConfig?.enabled ?? null,
      fetchedAt: Date.now(),
    };
  });
export const loadNotificationCenterInitialData = createServerFn({
  method: "GET",
})
  .validator((data: { locale: Locale }) => data)
  .handler(async ({ data }): Promise<NotificationCenterInitialData | null> => {
    const notifications = await readDashboardAdmin("notifications", {
      locale: data.locale,
      limit: 80,
    });
    return notifications
      ? {
          ...notifications,
          messages: notifications.messages.map(serializeNotificationMessage),
          fetchedAt: Date.now(),
        }
      : null;
  });
export const loadAccountNotificationPreferences = createServerFn({
  method: "GET",
}).handler(
  async (): Promise<AccountNotificationPreferencesInitialData | null> => {
    const [data, notificationEmail] = await Promise.all([
      readDashboardAdmin("notifications/preferences"),
      readDashboardAdmin("notification-email"),
    ]);
    return data
      ? {
          preferences: normalizeNotificationPreferencesData(data),
          notificationEmail,
          fetchedAt: Date.now(),
        }
      : null;
  },
);
export const loadSystemSettingsInitialData = createServerFn({
  method: "GET",
}).handler(async (): Promise<SystemSettingsInitialData | null> => {
  const [notificationEmail, retention] = await Promise.all([
    readDashboardAdmin("notification-email"),
    readDashboardAdmin("retention"),
  ]);
  if (!notificationEmail || !retention) return null;
  return { notificationEmail, retention, fetchedAt: Date.now() };
});
/**
 * The shared site behind a public link. Not a server function: an anonymous
 * viewer can't reach /_serverFn through the gateway, so the browser reads the
 * public share API and the server answers in-process.
 */
export const loadShareSite = createIsomorphicFn()
  .server(async (slug: string) => {
    const { readShareSite } = await import("@/lib/dashboard/share-site-server");
    const site = await readShareSite(slug);
    return site ? { site, publicSiteId: publicDashboardSiteId(slug) } : null;
  })
  .client(async (slug: string) => {
    try {
      const site = await fetchPublicSite(slug);
      return { site, publicSiteId: publicDashboardSiteId(slug) };
    } catch {
      return null;
    }
  });
export const loadRequestOrigin = createServerFn({ method: "GET" }).handler(
  () => {
    const request = getRequest();
    const host =
      request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (!host) return "";
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  },
);
/**
 * Whether this Worker runs under `everyapp dev`, for the setup error
 * (runtime-config-error): there the root secret comes from .dev.vars, on a
 * deployment from `everyapp secret set`. The SDK sets EVERYAPP_DEV in
 * development only; a deploy never does.
 */
export const loadRuntimeSetupMode = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ dev: boolean }> => {
    const runtime = await resolveEdgeRuntime(getRequest());
    return { dev: Boolean(runtime.env.EVERYAPP_DEV) };
  },
);
