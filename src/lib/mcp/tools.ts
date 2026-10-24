/**
 * OpenAnalytics' agent tools. The Every App gateway snapshots this catalog
 * at deploy and serves it to MCP clients at `https://<app-host>/mcp` and next
 * to other apps' tools at the gateway's own `/mcp`; the app never speaks MCP.
 *
 * Each tool acts as the calling member: it calls the same private API the
 * dashboard uses, in-process, with the gateway identity the call arrived
 * with, so permissions (any member reads; owners and admins change sites and
 * settings) and validation live in one place.
 */
import {
  defineTools,
  type ToolContext,
  ToolError,
} from "@every-app/sdk/server";
import { z } from "zod";

import { resolveViewer } from "@/lib/edge/auth/viewer";
import type { Env } from "@/lib/edge/types";
import {
  analyticsFilterRegistry,
  FILTER_DSL_EXAMPLES,
  FilterDslParseError,
  parseFilterDsl,
  serializeFilterParams,
} from "@/lib/filter-contract";
import { apiApp } from "@/lib/hono/app";

type ToolCall = ToolContext;

/** The Worker's bindings, as the rest of the app types them. */
function envOf(call: ToolCall): Env {
  return call.env as unknown as Env;
}

/** Results past this many bytes ask the agent for a narrower question. */
const MAX_RESULT_BYTES = 800_000;

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = {
  "24h": DAY_MS,
  "7d": 7 * DAY_MS,
  "30d": 30 * DAY_MS,
  "90d": 90 * DAY_MS,
  "12mo": 365 * DAY_MS,
} as const;

const FILTER_FIELDS = [...analyticsFilterRegistry.keys()].join(", ");

const windowSchema = {
  period: z
    .enum(["24h", "7d", "30d", "90d", "12mo"])
    .default("7d")
    .describe("Time range ending now; ignored when from is set"),
  from: z
    .string()
    .optional()
    .describe("Range start as an ISO 8601 date or time, inclusive"),
  to: z
    .string()
    .optional()
    .describe("Range end as an ISO 8601 date or time, exclusive; default now"),
  time_zone: z
    .string()
    .optional()
    .describe(
      "IANA time zone for day buckets, e.g. Europe/Berlin; default UTC",
    ),
  interval: z
    .enum(["hour", "day", "week", "month"])
    .optional()
    .describe("Bucket size for trends"),
};

const filterSchema = z
  .string()
  .max(4_000)
  .optional()
  .describe(
    `Filter expression. Fields: ${FILTER_FIELDS}. Examples: ${FILTER_DSL_EXAMPLES.slice(0, 5).join(" | ")}`,
  );

function parseTime(value: string, name: string): number {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new ToolError(`${name} is not an ISO 8601 date or time: ${value}`);
  }
  return ms;
}

function windowParams(args: {
  period: keyof typeof PERIODS;
  from?: string;
  to?: string;
  time_zone?: string;
  interval?: string;
}): Record<string, string> {
  const to = args.to ? parseTime(args.to, "to") : Date.now();
  const from = args.from
    ? parseTime(args.from, "from")
    : to - PERIODS[args.period];
  if (from >= to) throw new ToolError("from must be before to.");
  return {
    from: String(from),
    to: String(to),
    ...(args.time_zone ? { timeZone: args.time_zone } : {}),
    ...(args.interval ? { interval: args.interval } : {}),
  };
}

function filterParams(filter: string | undefined): URLSearchParams {
  if (!filter?.trim()) return new URLSearchParams();
  try {
    return serializeFilterParams(
      parseFilterDsl(filter, analyticsFilterRegistry),
      analyticsFilterRegistry,
    );
  } catch (error) {
    if (error instanceof FilterDslParseError) {
      throw new ToolError(
        `Invalid filter at character ${error.offset}: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Calls the app's private API as the calling member: the request carries the
 * gateway identity headers the tool call arrived with.
 */
async function privateApi<T>(
  call: ToolCall,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options: {
    params?: Record<string, string> | URLSearchParams;
    body?: unknown;
  } = {},
): Promise<T> {
  const url = new URL(path, call.request.url);
  for (const [key, value] of new URLSearchParams(options.params ?? {})) {
    url.searchParams.append(key, value);
  }
  const headers = new Headers(call.request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  const response = await apiApp.fetch(
    new Request(url, {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    envOf(call),
    call.ctx as ExecutionContext,
  );
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    data?: T;
    error?: { message?: string } | string;
  } | null;
  if (!response.ok || !payload || payload.ok === false) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : payload?.error?.message;
    if (response.status === 403) {
      throw new ToolError(
        message ??
          "Only organization owners and admins can change sites and settings.",
      );
    }
    if (response.status === 404) {
      throw new ToolError(message ?? "Not found. list_sites shows site ids.");
    }
    if (response.status < 500) {
      throw new ToolError(message ?? `Request failed (${response.status}).`);
    }
    throw new Error(`private API ${path} answered ${response.status}`);
  }
  return payload.data as T;
}

function bounded<T extends object>(result: T): T {
  if (JSON.stringify(result).length > MAX_RESULT_BYTES) {
    throw new ToolError(
      "The result is too large. Use a shorter time range, a filter or a smaller limit.",
    );
  }
  return result;
}

async function organizationId(call: ToolCall): Promise<string> {
  const viewer = await resolveViewer(call.request, envOf(call));
  if (!viewer)
    throw new ToolError("This deployment doesn't serve your organization.");
  return viewer.teamId;
}

/** Reports an agent can ask a site for, by the dashboard's query names. */
const SITE_REPORTS = {
  overview:
    "Headline metrics: views, visitors, sessions, bounce rate, average duration",
  trend: "Views, visitors and sessions per interval",
  pages: "Top pages",
  referrers: "Top referrers",
  "overview-source-channel": "Traffic by channel (direct, search, social, ...)",
  "overview-source-domain": "Traffic by referring domain",
  "overview-page-entry": "Top entry pages",
  "overview-page-exit": "Top exit pages",
  "overview-page-title": "Top page titles",
  "utm-source": "Campaign sources (UTM)",
  "utm-medium": "Campaign mediums (UTM)",
  "utm-campaign": "Campaign names (UTM)",
  "utm-term": "Campaign terms (UTM)",
  "utm-content": "Campaign content (UTM)",
  countries: "Visitors by country",
  "overview-geo-region": "Visitors by region",
  "overview-geo-city": "Visitors by city",
  "overview-geo-continent": "Visitors by continent",
  "overview-geo-organization": "Visitors by network organization (ASN)",
  "overview-client-browser": "Visitors by browser",
  "overview-client-os-version": "Visitors by operating system",
  "overview-client-device-type": "Visitors by device type",
  "overview-client-language": "Visitors by language",
  "overview-client-screen-size": "Visitors by screen size",
  retention: "Returning-visitor retention cohorts",
  performance: "Web Vitals (TTFB, FCP, LCP, CLS, INP)",
  "event-types": "Custom event names and counts",
  "events-summary": "Custom event totals",
  "events-trend": "Custom events per interval",
  "events-records": "Recent custom events (params: eventName, cursor)",
  "event-type-detail": "One custom event's breakdown (params: eventName)",
  "event-type-fields": "Payload fields of a custom event (params: eventName)",
  sessions:
    "Sessions list (params: sortBy startedAt|durationMs|views, sortDir, cursor)",
  "session-detail": "One session (params: sessionId)",
  "session-events": "A session's pages and events (params: sessionId)",
  visitors:
    "Visitors list (params: sortBy firstSeenAt|lastSeenAt|sessions|views, sortDir, cursor)",
  "visitor-detail": "One visitor (params: visitorId)",
  "visitor-sessions": "A visitor's sessions (params: visitorId)",
  "visitor-events": "A visitor's pages and events (params: visitorId)",
  funnels: "Funnels; with params.id, that funnel's conversion analysis",
  goals: "Goals; with params.id, one goal's definition",
  "goal-summary": "A goal's conversions (params: id)",
  "goal-timeseries": "A goal's conversions per interval (params: id)",
  "filter-values":
    "Known values of a filter field, for building filters (params: field)",
} as const;

type SiteReport = keyof typeof SITE_REPORTS;
const SITE_REPORT_NAMES = Object.keys(SITE_REPORTS) as [
  SiteReport,
  ...SiteReport[],
];

const funnelStepsSchema = z
  .array(
    z.object({
      name: z.string().min(1).max(120).optional(),
      filter: z
        .string()
        .min(1)
        .max(4_000)
        .describe(
          'Filter expression for this step, e.g. page.path eq "/signup"',
        ),
    }),
  )
  .min(2)
  .max(10);

export const tools = defineTools(
  {
    list_sites: {
      title: "List sites",
      description:
        "List the organization's tracked sites with their ids, names, domains and public share links. Call this first: every site tool takes a site_id.",
      risk: "read",
      input: z.object({}),
      handler: async (_args, call) => ({
        sites: await privateApi<unknown[]>(
          call,
          "GET",
          "/api/private/admin/sites",
          {
            params: { teamId: await organizationId(call) },
          },
        ),
      }),
    },

    get_organization_overview: {
      title: "Organization overview",
      description:
        "Compare every site at once: each site's views, visitors, sessions, bounce rate and duration with change rates, and the combined trend.",
      risk: "read",
      input: z.object({ ...windowSchema, filter: filterSchema }),
      handler: async (args, call) => {
        const params = new URLSearchParams({
          teamId: await organizationId(call),
          ...windowParams(args),
        });
        for (const [key, value] of filterParams(args.filter)) {
          params.append(key, value);
        }
        return bounded({
          overview: await privateApi(
            call,
            "GET",
            "/api/private/team-dashboard",
            {
              params,
            },
          ),
        });
      },
    },

    get_site_report: {
      title: "Site report",
      description:
        "Read one analytics report for a site: headline metrics, trends, pages, referrers, campaigns, places, devices, Web Vitals, custom events, sessions, visitors, retention, funnels and goals. The report argument lists each report and the params it takes. Lists accept limit; paged lists return a cursor to pass back in params.cursor.",
      risk: "read",
      input: z.object({
        site_id: z.string().min(1),
        report: z.enum(SITE_REPORT_NAMES).describe(
          Object.entries(SITE_REPORTS)
            .map(([name, what]) => `${name}: ${what}`)
            .join("; "),
        ),
        ...windowSchema,
        filter: filterSchema,
        limit: z.number().int().min(1).max(100).optional(),
        params: z
          .record(z.string(), z.string())
          .optional()
          .describe("Report-specific parameters named in the report list"),
      }),
      handler: async (args, call) => {
        const params = new URLSearchParams({
          ...args.params,
          siteId: args.site_id,
          ...windowParams(args),
          ...(args.limit ? { limit: String(args.limit) } : {}),
        });
        for (const [key, value] of filterParams(args.filter)) {
          params.append(key, value);
        }
        return bounded({
          report: args.report,
          data: await privateApi(call, "GET", `/api/private/${args.report}`, {
            params,
          }),
        });
      },
    },

    get_realtime: {
      title: "Realtime visitors",
      description:
        "Who is on a site right now: active visitors in the last 5 minutes, and the latest page views and events of the last 30 minutes.",
      risk: "read",
      input: z.object({
        site_id: z.string().min(1),
        limit: z.number().int().min(1).max(100).default(50),
      }),
      handler: async (args, call) => {
        // Proves the site is the organization's before reading its buffer.
        await privateApi(call, "GET", "/api/private/admin/site-config", {
          params: { siteId: args.site_id },
        });
        const { RealtimeProvider } =
          await import("@/lib/edge/analytics/providers/realtime/provider");
        const now = Date.now();
        const snapshot = await new RealtimeProvider(envOf(call)).snapshot({
          siteId: args.site_id,
          fromMs: now - 30 * 60 * 1000,
          toMs: now,
          limit: args.limit,
        });
        return bounded({ ...snapshot });
      },
    },

    get_site_settings: {
      title: "Site settings",
      description:
        "A site's tracking settings (tracking strength, query and hash tracking, outbound links, Do Not Track, Web Vitals sampling, bot protection, allowed domains, excluded paths) and its tracking snippet.",
      risk: "read",
      input: z.object({ site_id: z.string().min(1) }),
      handler: async (args, call) => {
        const params = { siteId: args.site_id };
        const [settings, snippet] = await Promise.all([
          privateApi(call, "GET", "/api/private/admin/site-config", { params }),
          privateApi(call, "GET", "/api/private/admin/script-snippet", {
            params,
          }),
        ]);
        return { settings, snippet };
      },
    },

    list_saved_filters: {
      title: "Saved filters",
      description:
        "Filters people saved for a site, with their filter expressions; pass one as filter to the report tools.",
      risk: "read",
      input: z.object({ site_id: z.string().min(1) }),
      handler: async (args, call) => ({
        saved_filters: await privateApi(
          call,
          "GET",
          "/api/private/saved-filters",
          {
            params: { siteId: args.site_id },
          },
        ),
      }),
    },

    create_site: {
      title: "Create site",
      description:
        "Start tracking a website. Returns the new site and the script tag to add to its pages. Owners and admins only.",
      risk: "write",
      input: z.object({
        name: z.string().min(2).max(120),
        domain: z
          .string()
          .min(3)
          .max(255)
          .describe("The site's hostname, e.g. example.com"),
      }),
      handler: async (args, call) => {
        const site = await privateApi<{ id: string }>(
          call,
          "POST",
          "/api/private/admin/sites",
          {
            body: {
              teamId: await organizationId(call),
              name: args.name,
              domain: args.domain,
            },
          },
        );
        const snippet = await privateApi(
          call,
          "GET",
          "/api/private/admin/script-snippet",
          { params: { siteId: site.id } },
        );
        return { site, snippet };
      },
    },

    update_site: {
      title: "Rename site",
      description: "Change a site's name or domain. Owners and admins only.",
      risk: "write",
      input: z.object({
        site_id: z.string().min(1),
        name: z.string().min(2).max(120).optional(),
        domain: z.string().min(3).max(255).optional(),
      }),
      handler: async (args, call) => ({
        site: await privateApi(call, "PATCH", "/api/private/admin/sites", {
          body: {
            intent: "update",
            siteId: args.site_id,
            ...(args.name ? { name: args.name } : {}),
            ...(args.domain ? { domain: args.domain } : {}),
          },
        }),
      }),
    },

    update_tracking_settings: {
      title: "Update tracking settings",
      description:
        "Change how a site's tracker collects data. Only the settings you pass change. Owners and admins only.",
      risk: "write",
      input: z.object({
        site_id: z.string().min(1),
        tracking_strength: z
          .enum(["strong", "smart", "weak"])
          .optional()
          .describe(
            "strong: a persistent visitor id; weak: daily-rotating anonymous ids; smart: weak for EU visitors only",
          ),
        track_query_params: z.boolean().optional(),
        track_hash: z.boolean().optional(),
        auto_track_outbound_links: z.boolean().optional(),
        ignore_do_not_track: z.boolean().optional(),
        performance_sample_rate: z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .describe("Percent of page views that report Web Vitals"),
        bot_protection_enabled: z.boolean().optional(),
        hosting_proxy_blocking_enabled: z.boolean().optional(),
        domain_whitelist: z.array(z.string().max(255)).max(200).optional(),
        path_blacklist: z.array(z.string().max(255)).max(200).optional(),
      }),
      handler: async (args, call) => {
        const config = Object.fromEntries(
          Object.entries({
            trackingStrength: args.tracking_strength,
            trackQueryParams: args.track_query_params,
            trackHash: args.track_hash,
            autoTrackOutboundLinks: args.auto_track_outbound_links,
            ignoreDoNotTrack: args.ignore_do_not_track,
            performanceSampleRate: args.performance_sample_rate,
            botProtectionEnabled: args.bot_protection_enabled,
            hostingProxyBlockingEnabled: args.hosting_proxy_blocking_enabled,
            domainWhitelist: args.domain_whitelist,
            pathBlacklist: args.path_blacklist,
          }).filter(([, value]) => value !== undefined),
        );
        if (Object.keys(config).length === 0) {
          throw new ToolError("Pass at least one setting to change.");
        }
        return {
          settings: await privateApi(
            call,
            "POST",
            "/api/private/admin/site-config",
            {
              body: { siteId: args.site_id, config },
            },
          ),
        };
      },
    },

    save_funnel: {
      title: "Save funnel",
      description:
        "Create a funnel, or replace one when id is given. Steps are filter expressions matched in order; read conversions with get_site_report report=funnels params.id. Owners and admins only.",
      risk: "write",
      input: z.object({
        site_id: z.string().min(1),
        id: z.string().optional().describe("The funnel to replace"),
        name: z.string().min(1).max(120),
        steps: funnelStepsSchema,
        scope: z
          .enum(["session", "visitor"])
          .default("session")
          .describe(
            "Whether steps must happen in one session or across a visitor's sessions",
          ),
        conversion_window_hours: z
          .number()
          .positive()
          .max(24 * 365)
          .optional()
          .describe(
            "Time allowed from the first step to the last; default none",
          ),
      }),
      handler: async (args, call) => {
        const body = {
          name: args.name,
          filterDslVersion: 1,
          progressionScope: args.scope,
          conversionWindowMs: args.conversion_window_hours
            ? Math.round(args.conversion_window_hours * 60 * 60 * 1000)
            : null,
          steps: args.steps.map((step, index) => ({
            id: `step-${index + 1}`,
            ...(step.name ? { name: step.name } : {}),
            filterDsl: step.filter,
          })),
        };
        return privateApi(
          call,
          args.id ? "PATCH" : "POST",
          "/api/private/funnels",
          {
            params: {
              siteId: args.site_id,
              ...(args.id ? { id: args.id } : {}),
            },
            body,
          },
        );
      },
    },

    save_goal: {
      title: "Save goal",
      description:
        'Create a goal, or replace one when id is given: a filter expression that counts a conversion, e.g. event.name eq "signup". Read it with get_site_report report=goal-summary params.id. Owners and admins only.',
      risk: "write",
      input: z.object({
        site_id: z.string().min(1),
        id: z.string().optional().describe("The goal to replace"),
        name: z.string().min(1).max(120),
        filter: z.string().min(1).max(4_000),
      }),
      handler: async (args, call) =>
        privateApi(call, args.id ? "PATCH" : "POST", "/api/private/goals", {
          params: { siteId: args.site_id, ...(args.id ? { id: args.id } : {}) },
          body: {
            name: args.name,
            filterDslVersion: 1,
            filterDsl: args.filter,
          },
        }),
    },

    set_public_sharing: {
      title: "Share a site publicly",
      description:
        "Turn a site's public share link on or off. While on, anyone with the link can read the site's dashboards. Owners and admins only.",
      risk: "destructive",
      input: z.object({
        site_id: z.string().min(1),
        enabled: z.boolean(),
        slug: z
          .string()
          .regex(/^[a-z0-9-]{3,120}$/)
          .optional()
          .describe("The link's path segment; default random"),
      }),
      handler: async (args, call) => ({
        site: await privateApi(call, "PATCH", "/api/private/admin/sites", {
          body: {
            intent: "update",
            siteId: args.site_id,
            publicEnabled: args.enabled,
            publicSlug:
              args.slug ??
              (args.enabled ? crypto.randomUUID().slice(0, 12) : undefined),
          },
        }),
      }),
    },

    delete_site: {
      title: "Delete site",
      description:
        "Delete a site and all of its analytics data. This can't be undone. Owners and admins only.",
      risk: "destructive",
      input: z.object({ site_id: z.string().min(1) }),
      handler: async (args, call) =>
        privateApi(call, "PATCH", "/api/private/admin/sites", {
          body: { intent: "remove", siteId: args.site_id },
        }),
    },

    delete_funnel: {
      title: "Delete funnel",
      description: "Delete a funnel. Owners and admins only.",
      risk: "destructive",
      input: z.object({ site_id: z.string().min(1), id: z.string().min(1) }),
      handler: async (args, call) => {
        await privateApi(call, "DELETE", "/api/private/funnels", {
          params: { siteId: args.site_id, id: args.id },
        });
        return { deleted: true };
      },
    },

    delete_goal: {
      title: "Delete goal",
      description: "Delete a goal. Owners and admins only.",
      risk: "destructive",
      input: z.object({ site_id: z.string().min(1), id: z.string().min(1) }),
      handler: async (args, call) => {
        await privateApi(call, "DELETE", "/api/private/goals", {
          params: { siteId: args.site_id, id: args.id },
        });
        return { deleted: true };
      },
    },
  },
  {
    instructions:
      "OpenAnalytics: privacy-friendly web analytics for the organization's sites. Call list_sites first; every site tool takes its site_id. Times default to the last 7 days. Filters use the filter expression language described on the filter argument. Deleting sites, funnels and goals and turning public sharing on or off are done in the app's Settings, not through tools.",
  },
);
