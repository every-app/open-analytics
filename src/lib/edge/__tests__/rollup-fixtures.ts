import type { DatabaseSync } from "node:sqlite";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { classifyTrafficChannel } from "@/lib/analytics/traffic-channel-rules";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import type { Env } from "@/lib/edge/types";

export const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** A small deterministic generator, so every run sees the same data. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

const PATHS = [
  "/",
  "/pricing",
  "/blog/launch",
  "/blog/rollups",
  "/docs",
  "/signup",
  " /spaced ",
];
const SOURCES: ReadonlyArray<{
  referrerUrl: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
}> = [
  {
    referrerUrl: "",
    referrerHost: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
  },
  {
    referrerUrl: "https://www.google.com/",
    referrerHost: "www.google.com",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
  },
  {
    referrerUrl: "https://news.ycombinator.com/item?id=1",
    referrerHost: "news.ycombinator.com",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
  },
  {
    referrerUrl: "https://l.facebook.com/",
    referrerHost: "l.facebook.com",
    utmSource: "facebook",
    utmMedium: "social",
    utmCampaign: "launch",
    utmTerm: "",
    utmContent: "video",
  },
  {
    referrerUrl: "",
    referrerHost: "",
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "november",
    utmTerm: "rollups",
    utmContent: "",
  },
];
const PLACES: ReadonlyArray<{
  country: string;
  region: string;
  regionCode: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}> = [
  {
    country: "US",
    region: "California",
    regionCode: "CA",
    city: "San Francisco",
    latitude: 37.8,
    longitude: -122.4,
  },
  {
    country: "US",
    region: "New York",
    regionCode: "NY",
    city: "New York",
    latitude: 40.7,
    longitude: -74,
  },
  {
    country: "DE",
    region: "Berlin",
    regionCode: "BE",
    city: "Berlin",
    latitude: 52.5,
    longitude: 13.4,
  },
  {
    country: "IN",
    region: "Karnataka",
    regionCode: "KA",
    city: "Bengaluru",
    latitude: 13,
    longitude: 77.6,
  },
  {
    country: "AU",
    region: "",
    regionCode: "",
    city: "",
    latitude: null,
    longitude: null,
  },
];
const DEVICES: ReadonlyArray<{
  browser: string;
  os: string;
  osVersion: string;
  deviceType: string;
}> = [
  { browser: "Chrome", os: "macOS", osVersion: "15", deviceType: "desktop" },
  { browser: "Safari", os: "iOS", osVersion: "18.1", deviceType: "mobile" },
  { browser: "Firefox", os: "Windows", osVersion: "11", deviceType: "desktop" },
  { browser: "Chrome", os: "Android", osVersion: "", deviceType: "tablet" },
  { browser: "", os: "", osVersion: "", deviceType: "" },
];

export interface SyntheticVisit {
  visitId: string;
  sitePk: number;
  siteId: string;
  visitorId: string;
  sessionId: string;
  status: string;
  startedAt: number;
  durationMs: number | null;
  pathname: string;
  source: (typeof SOURCES)[number];
  place: (typeof PLACES)[number];
  device: (typeof DEVICES)[number];
}

/**
 * Page views as ingest stores them: a visitor id rotates at UTC midnight and
 * a visit ends when its visitor id changes, so a visit that runs past
 * midnight continues as a new visitor's new visit. People return across
 * days, keeping their place and device.
 */
export function syntheticVisits(input: {
  readonly siteId: string;
  readonly sitePk: number;
  readonly fromMs: number;
  readonly toMs: number;
  readonly peoplePerDay: number;
  readonly seed: number;
}): SyntheticVisit[] {
  const random = seededRandom(input.seed);
  const people = Array.from({ length: input.peoplePerDay * 3 }, (_, index) => ({
    id: `${input.siteId}-p${index}`,
    place: pick(random, PLACES),
    device: pick(random, DEVICES),
  }));
  const visits: SyntheticVisit[] = [];
  let sessionCounter = 0;
  for (let dayStart = input.fromMs; dayStart < input.toMs; dayStart += DAY_MS) {
    for (let index = 0; index < input.peoplePerDay; index += 1) {
      const person = pick(random, people);
      const sessions = 1 + Math.floor(random() * 2);
      for (let session = 0; session < sessions; session += 1) {
        const source = pick(random, SOURCES);
        let at = dayStart + Math.floor(random() * DAY_MS);
        const pageViews = 1 + Math.floor(random() * 5);
        let day = Math.floor(at / DAY_MS);
        let sessionId = `${input.siteId}-s${sessionCounter++}`;
        for (let view = 0; view < pageViews; view += 1) {
          if (at >= input.toMs) break;
          if (Math.floor(at / DAY_MS) !== day) {
            // The visitor id rotated: a new visitor, so a new visit.
            day = Math.floor(at / DAY_MS);
            sessionId = `${input.siteId}-s${sessionCounter++}`;
          }
          const anonymous = random() < 0.02;
          visits.push({
            visitId: `${sessionId}-v${view}`,
            sitePk: input.sitePk,
            siteId: input.siteId,
            visitorId: anonymous ? "" : `${person.id}-d${day}`,
            sessionId: anonymous ? "" : sessionId,
            status: random() < 0.1 ? "timeout" : "complete",
            startedAt: at,
            durationMs:
              random() < 0.25 ? null : Math.floor(random() * 5 * MINUTE_MS),
            pathname: pick(random, PATHS),
            source,
            place: person.place,
            device: person.device,
          });
          at += Math.floor(random() * 50 * MINUTE_MS) + 1;
        }
      }
    }
  }
  return visits;
}

export function insertVisits(
  database: DatabaseSync,
  visits: readonly SyntheticVisit[],
): void {
  const statement = database.prepare(`
    INSERT INTO visits (
      visit_id, site_id, site_pk, visitor_id, session_id, status, started_at,
      last_activity_at, duration_ms, pathname, hostname, referrer_url,
      referrer_host, utm_source, utm_medium, utm_campaign, utm_term,
      utm_content, channel, country, region, region_code, city, latitude,
      longitude, browser, os, os_version, device_type
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'example.com', ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  database.exec("BEGIN");
  for (const visit of visits) {
    statement.run(
      visit.visitId,
      visit.siteId,
      visit.sitePk,
      visit.visitorId,
      visit.sessionId,
      visit.status,
      visit.startedAt,
      visit.startedAt,
      visit.durationMs,
      visit.pathname,
      visit.source.referrerUrl,
      visit.source.referrerHost,
      visit.source.utmSource,
      visit.source.utmMedium,
      visit.source.utmCampaign,
      visit.source.utmTerm,
      visit.source.utmContent,
      classifyTrafficChannel(visit.source),
      visit.place.country,
      visit.place.region,
      visit.place.regionCode,
      visit.place.city,
      visit.place.latitude,
      visit.place.longitude,
      visit.device.browser,
      visit.device.os,
      visit.device.osVersion,
      visit.device.deviceType,
    );
  }
  database.exec("COMMIT");
}

export function seedSites(
  database: DatabaseSync,
  sites: ReadonlyArray<{ readonly siteId: string; readonly sitePk: number }>,
  teamId = "team-1",
): void {
  database
    .prepare("INSERT INTO teams (id, name, slug) VALUES (?, 'Team', ?)")
    .run(teamId, teamId);
  for (const site of sites) {
    database
      .prepare("INSERT INTO site_identities (site_pk, site_id) VALUES (?, ?)")
      .run(site.sitePk, site.siteId);
    database
      .prepare(
        "INSERT INTO sites (id, team_id, name, domain, created_at) VALUES (?, ?, ?, 'example.com', ?)",
      )
      .run(site.siteId, teamId, site.siteId, site.sitePk);
  }
}

export function createRollupTestEnv(): {
  database: DatabaseSync;
  env: Env;
  preparedSql: string[];
  /** D1 queries made so far, a batch counting as one, as Cloudflare counts them. */
  d1Queries: () => number;
} {
  const database = createMigratedDatabase();
  const preparedSql: string[] = [];
  const batchStatements: string[][] = [];
  return {
    database,
    preparedSql,
    d1Queries: () =>
      preparedSql.length -
      batchStatements.flat().length +
      batchStatements.length,
    env: {
      DB: createSqliteD1Database(database, {
        preparedSql,
        bindings: [],
        batchStatements,
      }),
      MAIN_SECRET: "rollup-test-secret",
    } as unknown as Env,
  };
}
