import { buildTrafficChannelSqlExpression } from "@/lib/analytics/traffic-channel-rules";

import {
  cityValueExpr,
  clientDimensionDefinition,
  regionValueExpr,
  utmDimensionDefinition,
} from "./core-dimensions";

/**
 * The Overview card dimensions kept per site and UTC day, as stored in
 * `visit_daily_dimension_rollups.dimension`.
 */
export enum RollupDimension {
  PagePath = "page.path",
  EntryPage = "page.entry",
  ExitPage = "page.exit",
  Channel = "source.channel",
  Referrer = "source.referrer",
  UtmSource = "utm.source",
  UtmMedium = "utm.medium",
  UtmCampaign = "utm.campaign",
  UtmTerm = "utm.term",
  UtmContent = "utm.content",
  Country = "geo.country",
  Region = "geo.region",
  City = "geo.city",
  Browser = "client.browser",
  OperatingSystem = "client.os",
  DeviceType = "client.device",
}

export type SessionRollupDimension =
  RollupDimension.EntryPage | RollupDimension.ExitPage;

/**
 * Dimensions that label each page view. The expression is exactly what the
 * card's raw query groups by, so a rolled-up value matches a raw one.
 */
export const PAGE_VIEW_ROLLUP_DIMENSIONS: ReadonlyArray<{
  readonly dimension: Exclude<RollupDimension, SessionRollupDimension>;
  readonly expression: string;
}> = [
  { dimension: RollupDimension.PagePath, expression: "pathname" },
  {
    dimension: RollupDimension.Channel,
    expression: buildTrafficChannelSqlExpression(),
  },
  { dimension: RollupDimension.Referrer, expression: "referrer_host" },
  {
    dimension: RollupDimension.UtmSource,
    expression: utmDimensionDefinition("source").labelExpr,
  },
  {
    dimension: RollupDimension.UtmMedium,
    expression: utmDimensionDefinition("medium").labelExpr,
  },
  {
    dimension: RollupDimension.UtmCampaign,
    expression: utmDimensionDefinition("campaign").labelExpr,
  },
  {
    dimension: RollupDimension.UtmTerm,
    expression: utmDimensionDefinition("term").labelExpr,
  },
  {
    dimension: RollupDimension.UtmContent,
    expression: utmDimensionDefinition("content").labelExpr,
  },
  { dimension: RollupDimension.Country, expression: "country" },
  { dimension: RollupDimension.Region, expression: regionValueExpr() },
  { dimension: RollupDimension.City, expression: cityValueExpr() },
  {
    dimension: RollupDimension.Browser,
    expression: clientDimensionDefinition("browser").labelExpr,
  },
  {
    dimension: RollupDimension.OperatingSystem,
    expression: clientDimensionDefinition("osVersion").labelExpr,
  },
  {
    dimension: RollupDimension.DeviceType,
    expression: clientDimensionDefinition("deviceType").labelExpr,
  },
];

/** The rolled-up dimension a card's raw grouping expression reads, if any. */
export function rollupDimensionForExpression(
  expression: string,
): RollupDimension | null {
  return (
    PAGE_VIEW_ROLLUP_DIMENSIONS.find((entry) => entry.expression === expression)
      ?.dimension ?? null
  );
}

export function sessionRollupDimension(
  kind: "entry" | "exit",
): SessionRollupDimension {
  return kind === "entry"
    ? RollupDimension.EntryPage
    : RollupDimension.ExitPage;
}
