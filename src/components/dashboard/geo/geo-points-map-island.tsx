import { memo } from "react";
import { Spinner } from "@insightflare/ui/spinner";
import { createIsomorphicFn } from "@tanstack/react-start";

import dynamic from "@/lib/dynamic";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import type {
  GeoPointsMapCountryCount,
  GeoPointsMapPoint,
} from "./geo-points-map-flat";
interface GeoPointsMapIslandProps {
  locale: Locale;
  messages: AppMessages;
  points: GeoPointsMapPoint[];
  countryCounts?: GeoPointsMapCountryCount[];
  loading?: boolean;
  emptyLabel?: string;
  heightClassName?: string;
  initialZoom?: number;
  countryHoverEnabled?: boolean;
  pointColor?: [number, number, number];
  bordered?: boolean;
  reuseMaps?: boolean;
  selectedCountryCode?: string | null;
  onCountrySelect?: (countryCode: string | null) => void;
}
const DEFAULT_MAP_HEIGHT_CLASS = "h-[460px]";
function GeoPointsMapFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden border border-border/70 bg-muted/20">
      <Spinner className="size-6" />
    </div>
  );
}
const FlatGeoPointsMapClient = createIsomorphicFn()
  .server(() => GeoPointsMapFallback)
  .client(() =>
    dynamic<GeoPointsMapIslandProps>(
      () =>
        import("@/components/dashboard/geo/geo-points-map-flat").then(
          (module) => module.FlatGeoPointsMap,
        ),
      {
        ssr: false,
        loading: GeoPointsMapFallback,
      },
    ),
  )();
export type { GeoPointsMapCountryCount, GeoPointsMapPoint };
export const GeoPointsMapIsland = memo(function GeoPointsMapIsland({
  heightClassName,
  ...props
}: GeoPointsMapIslandProps) {
  return (
    <div className={`${heightClassName ?? DEFAULT_MAP_HEIGHT_CLASS} w-full`}>
      <FlatGeoPointsMapClient {...props} heightClassName="h-full" />
    </div>
  );
});
