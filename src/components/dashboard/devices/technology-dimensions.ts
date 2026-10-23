import type { ComponentType } from "react";

import { resolveDeviceTypeMeta } from "@/components/dashboard/journeys/journey-display";
import type { ShareTrendFetcher } from "@/components/dashboard/sharing/share-trend-card";
import {
  type CrossBreakdownDimension,
  fetchBrowserEngineTrend,
  fetchBrowserTrend,
  fetchClientDimensionTrend,
} from "@/lib/dashboard/client/data/index";
import type { AppMessages } from "@/lib/i18n/messages";

/** What the Devices page can break visitors down by. */
export enum TechnologyDimension {
  Device = "device",
  Os = "os",
  Browser = "browser",
  Engine = "engine",
  ScreenSize = "screenSize",
}

export const TECHNOLOGY_DIMENSIONS = Object.values(TechnologyDimension);

export function isTechnologyDimension(
  value: string,
): value is TechnologyDimension {
  return (TECHNOLOGY_DIMENSIONS as string[]).includes(value);
}

export const TECHNOLOGY_TREND_FETCHERS: Record<
  TechnologyDimension,
  ShareTrendFetcher
> = {
  [TechnologyDimension.Device]: (siteId, window, filters, options) =>
    fetchClientDimensionTrend(siteId, window, "deviceType", filters, options),
  [TechnologyDimension.Os]: (siteId, window, filters, options) =>
    fetchClientDimensionTrend(
      siteId,
      window,
      "operatingSystem",
      filters,
      options,
    ),
  [TechnologyDimension.Browser]: fetchBrowserTrend,
  [TechnologyDimension.Engine]: fetchBrowserEngineTrend,
  [TechnologyDimension.ScreenSize]: (siteId, window, filters, options) =>
    fetchClientDimensionTrend(siteId, window, "screenSize", filters, options),
};

export const TECHNOLOGY_CROSS_DIMENSIONS: Record<
  TechnologyDimension,
  CrossBreakdownDimension
> = {
  [TechnologyDimension.Device]: "deviceType",
  [TechnologyDimension.Os]: "operatingSystem",
  [TechnologyDimension.Browser]: "browser",
  [TechnologyDimension.Engine]: "client.browserEngine",
  [TechnologyDimension.ScreenSize]: "screenSize",
};

export function technologyDimensionLabel(
  dimension: TechnologyDimension,
  messages: AppMessages,
): string {
  return messages.devices.dimensions[dimension];
}

/** Device types read as "Desktop" or "Mobile" with an icon; the rest as reported. */
export function technologyValueLabel(
  dimension: TechnologyDimension,
  value: string,
  messages: AppMessages,
): string {
  if (dimension !== TechnologyDimension.Device) return value;
  return resolveDeviceTypeMeta(
    value,
    messages.common.deviceLabels,
    messages.common.unknown,
  ).label;
}

export function technologyValueIcon(
  dimension: TechnologyDimension,
  value: string,
  messages: AppMessages,
): ComponentType<{ className?: string }> | undefined {
  if (dimension !== TechnologyDimension.Device) return undefined;
  return resolveDeviceTypeMeta(
    value,
    messages.common.deviceLabels,
    messages.common.unknown,
  ).Icon;
}
