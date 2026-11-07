import {
  buildLocalityLocationValue,
  buildRegionLocationValue,
} from "@/lib/analytics/geo-location";
import type { Env } from "@/lib/edge/types";

import type {
  FilterDocument,
  GeoCountryCountRow,
  GeoDimensionCountRow,
  GeoPointAggregate,
  GeoPointRow,
  QueryWindow,
} from "./core";
import {
  buildVisitFilterSql,
  buildVisitSourceCte,
  queryD1All,
  visitSourceBindings,
} from "./core";
import type { D1ReadDiagnostics } from "./diagnostics";
import {
  dailyDimensionRows,
  dailyGeoPoints,
  type RollupEdgeSource,
  rollupEdgeSource,
} from "./rollup-breakdowns";
import { RollupDimension } from "./rollup-dimensions";
import { scopedDatasetFor } from "./scoped-dataset";
const RAW_POINT_COLUMNS = `
    ROUND(latitude, 3) AS lat_bucket,
    ROUND(longitude, 3) AS lon_bucket,
    country,
    region,
    region_code AS regionCode,
    city,
    MAX(started_at) AS latest_at,
    COUNT(*) AS point_count`;
const VALID_COORDINATES = `latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND ABS(latitude) <= 90
    AND ABS(longitude) <= 180`;
const POINT_GROUP =
  "lat_bucket, lon_bucket, country, region, region_code, city";
/**
 * The unfiltered map: rolled-up days' points and countries plus the raw
 * edges', merged the way the raw query groups them.
 */
async function queryRolledUpGeoPoints(
  env: Env,
  siteId: string,
  rollup: RollupEdgeSource,
  diagnostics?: D1ReadDiagnostics,
): Promise<GeoPointAggregate> {
  const points = dailyGeoPoints(siteId, rollup.split);
  const countries = dailyDimensionRows(
    siteId,
    RollupDimension.Country,
    rollup.split,
  );
  const pointRows = await queryD1All<Record<string, unknown>>(
    env,
    `
WITH
${rollup.visitSource.sql},
raw_points AS (
  SELECT ${RAW_POINT_COLUMNS}
  FROM visit_source
  WHERE ${VALID_COORDINATES}
  GROUP BY ${POINT_GROUP}
),
merged_points AS (
  SELECT
    lat_bucket, lon_bucket, country, region, regionCode, city,
    MAX(latest_at) AS latest_at,
    SUM(point_count) AS point_count
  FROM (
    SELECT * FROM raw_points
    UNION ALL
    ${points.sql}
  )
  GROUP BY lat_bucket, lon_bucket, country, region, regionCode, city
)
SELECT
  lat_bucket AS latitude,
  lon_bucket AS longitude,
  latest_at AS timestampMs,
  country,
  region,
  regionCode,
  city,
  point_count AS pointCount
FROM merged_points
ORDER BY timestampMs DESC
`,
    [...rollup.visitSource.bindings, ...points.bindings],
    diagnostics,
  );
  const countryRows = await queryD1All<Record<string, unknown>>(
    env,
    `
WITH
${rollup.visitSource.sql},
raw_countries AS (
  SELECT
    country AS value,
    count(*) AS views,
    count(DISTINCT CASE WHEN session_id != '' THEN session_id ELSE NULL END) AS sessions,
    count(DISTINCT CASE WHEN visitor_id != '' THEN visitor_id ELSE NULL END) AS visitors
  FROM visit_source
  GROUP BY country
)
SELECT
  value AS country,
  SUM(views) AS views,
  SUM(sessions) AS sessions,
  SUM(visitors) AS visitors
FROM (
  SELECT * FROM raw_countries
  UNION ALL
  ${countries.sql}
)
GROUP BY value
ORDER BY views DESC, sessions DESC, country ASC
`,
    [...rollup.visitSource.bindings, ...countries.bindings],
    diagnostics,
  );
  return {
    points: pointRows.map(mapGeoPointRow),
    countryCounts: countryRows.map(mapCountryCountRow),
    regionCounts: [],
    cityCounts: [],
  };
}
function mapCountryCountRow(row: Record<string, unknown>): GeoCountryCountRow {
  return {
    country: String(row.country ?? ""),
    views: Number(row.views ?? 0),
    sessions: Number(row.sessions ?? 0),
    visitors: Number(row.visitors ?? 0),
  };
}
export async function queryGeoPointsFromD1(
  env: Env,
  siteId: string,
  window: QueryWindow,
  filters: FilterDocument,
  diagnostics?: D1ReadDiagnostics,
): Promise<GeoPointAggregate> {
  const rollup = await rollupEdgeSource(
    env,
    siteId,
    window,
    filters,
    diagnostics,
  );
  if (rollup) {
    return queryRolledUpGeoPoints(env, siteId, rollup, diagnostics);
  }
  const scopedDataset = scopedDatasetFor(siteId, window, filters);
  const filter = scopedDataset
    ? null
    : buildVisitFilterSql(filters, "visit_source", { window });
  const conditions =
    filters.root?.kind === "and"
      ? filters.root.children
      : [filters.root].filter(Boolean);
  const valueFor = (field: string) => {
    const condition = conditions.find(
      (item) =>
        item?.kind === "condition" &&
        item.target.kind === "field" &&
        item.target.field === field &&
        item.operator === "eq" &&
        typeof item.value === "string",
    );
    return condition?.kind === "condition" &&
      typeof condition.value === "string"
      ? condition.value
      : undefined;
  };
  const parsedGeo = {
    country: valueFor("geo.country"),
    regionCode: valueFor("geo.region"),
    city: valueFor("geo.city"),
  };
  const coordinateClause = filter?.clause ? "AND" : "WHERE";
  const pointsSql = `
WITH
${scopedDataset?.ctes ?? buildVisitSourceCte()},
filtered_visits AS (
  SELECT ${RAW_POINT_COLUMNS}
  FROM ${scopedDataset?.visitRelation ?? "visit_source"}
  ${filter?.clause ?? ""}
  ${coordinateClause}
    ${VALID_COORDINATES}
  GROUP BY ${POINT_GROUP}
)
SELECT
  lat_bucket AS latitude,
  lon_bucket AS longitude,
  latest_at AS timestampMs,
  country,
  region,
  regionCode,
  city,
  point_count AS pointCount
FROM filtered_visits
ORDER BY timestampMs DESC
`;
  const points = (
    await queryD1All<Record<string, unknown>>(
      env,
      pointsSql,
      [
        ...(scopedDataset
          ? scopedDataset.bindings.map((binding) => binding.value)
          : [
              ...visitSourceBindings(siteId, window),
              ...(filter?.bindings ?? []),
            ]),
      ],
      diagnostics,
    )
  ).map(mapGeoPointRow);

  const countryCounts: GeoCountryCountRow[] = [];
  const regionCounts: GeoDimensionCountRow[] = [];
  const cityCounts: GeoDimensionCountRow[] = [];

  if (!parsedGeo?.country) {
    const countrySql = `
WITH
${scopedDataset?.ctes ?? buildVisitSourceCte()},
filtered_visits AS (
  SELECT
    country,
    session_id AS sessionId,
    visitor_id AS visitorId
  FROM ${scopedDataset?.visitRelation ?? "visit_source"}
  ${filter?.clause ?? ""}
)
SELECT
  country,
  count(*) AS views,
  count(DISTINCT CASE WHEN sessionId != '' THEN sessionId ELSE NULL END) AS sessions,
  count(DISTINCT CASE WHEN visitorId != '' THEN visitorId ELSE NULL END) AS visitors
FROM filtered_visits
GROUP BY country
ORDER BY views DESC, sessions DESC, country ASC
`;
    countryCounts.push(
      ...(
        await queryD1All<Record<string, unknown>>(
          env,
          countrySql,
          scopedDataset
            ? scopedDataset.bindings.map((binding) => binding.value)
            : [
                ...visitSourceBindings(siteId, window),
                ...(filter?.bindings ?? []),
              ],
          diagnostics,
        )
      ).map(mapCountryCountRow),
    );
  } else if (!parsedGeo.regionCode) {
    const regionSql = `
WITH
${scopedDataset?.ctes ?? buildVisitSourceCte()},
filtered_visits AS (
  SELECT
    country,
    region,
    region_code AS regionCode,
    session_id AS sessionId,
    visitor_id AS visitorId
  FROM ${scopedDataset?.visitRelation ?? "visit_source"}
  ${filter?.clause ?? ""}
)
SELECT
  country,
  regionCode,
  region,
  count(*) AS views,
  count(DISTINCT CASE WHEN sessionId != '' THEN sessionId ELSE NULL END) AS sessions,
  count(DISTINCT CASE WHEN visitorId != '' THEN visitorId ELSE NULL END) AS visitors
FROM filtered_visits
WHERE
  TRIM(COALESCE(country, '')) != ''
  AND (
    TRIM(COALESCE(regionCode, '')) != ''
    OR TRIM(COALESCE(region, '')) != ''
  )
GROUP BY country, regionCode, region
ORDER BY views DESC, sessions DESC, region ASC, regionCode ASC
`;
    regionCounts.push(
      ...(
        await queryD1All<Record<string, unknown>>(
          env,
          regionSql,
          scopedDataset
            ? scopedDataset.bindings.map((binding) => binding.value)
            : [
                ...visitSourceBindings(siteId, window),
                ...(filter?.bindings ?? []),
              ],
          diagnostics,
        )
      )
        .map((row) => {
          const country = String(row.country ?? "")
            .trim()
            .toUpperCase();
          const regionCode = String(row.regionCode ?? "")
            .trim()
            .toUpperCase();
          const regionName = String(row.region ?? "").trim() || regionCode;
          const value = buildRegionLocationValue(
            country,
            regionCode || regionName,
            regionName || regionCode,
          );
          if (!value) return null;
          return {
            value,
            label: regionName || regionCode,
            views: Number(row.views ?? 0),
            sessions: Number(row.sessions ?? 0),
            visitors: Number(row.visitors ?? 0),
          };
        })
        .filter((row): row is GeoDimensionCountRow => Boolean(row)),
    );
  } else {
    const citySql = `
WITH
${scopedDataset?.ctes ?? buildVisitSourceCte()},
filtered_visits AS (
  SELECT
    country,
    region,
    region_code AS regionCode,
    city,
    session_id AS sessionId,
    visitor_id AS visitorId
  FROM ${scopedDataset?.visitRelation ?? "visit_source"}
  ${filter?.clause ?? ""}
)
SELECT
  country,
  regionCode,
  region,
  city,
  count(*) AS views,
  count(DISTINCT CASE WHEN sessionId != '' THEN sessionId ELSE NULL END) AS sessions,
  count(DISTINCT CASE WHEN visitorId != '' THEN visitorId ELSE NULL END) AS visitors
FROM filtered_visits
WHERE
  TRIM(COALESCE(country, '')) != ''
  AND TRIM(COALESCE(city, '')) != ''
GROUP BY country, regionCode, region, city
ORDER BY views DESC, sessions DESC, city ASC
`;
    cityCounts.push(
      ...(
        await queryD1All<Record<string, unknown>>(
          env,
          citySql,
          scopedDataset
            ? scopedDataset.bindings.map((binding) => binding.value)
            : [
                ...visitSourceBindings(siteId, window),
                ...(filter?.bindings ?? []),
              ],
          diagnostics,
        )
      )
        .map((row) => {
          const country = String(row.country ?? "")
            .trim()
            .toUpperCase();
          const regionCode = String(row.regionCode ?? "")
            .trim()
            .toUpperCase();
          const regionName = String(row.region ?? "").trim() || regionCode;
          const city = String(row.city ?? "").trim();
          const value = buildLocalityLocationValue(
            country,
            regionCode || null,
            regionName || null,
            city,
          );
          if (!value || !city) return null;
          return {
            value,
            label: city,
            views: Number(row.views ?? 0),
            sessions: Number(row.sessions ?? 0),
            visitors: Number(row.visitors ?? 0),
          };
        })
        .filter((row): row is GeoDimensionCountRow => Boolean(row)),
    );
  }

  return {
    points,
    countryCounts,
    regionCounts,
    cityCounts,
  };
}
function mapGeoPointRow(row: Record<string, unknown>): GeoPointRow {
  return {
    latitude: Number(row.latitude ?? 0),
    longitude: Number(row.longitude ?? 0),
    timestampMs: Number(row.timestampMs ?? 0),
    country: String(row.country ?? ""),
    region: String(row.region ?? ""),
    regionCode: String(row.regionCode ?? ""),
    city: String(row.city ?? ""),
    pointCount: Math.max(1, Number(row.pointCount ?? 1)),
  };
}
