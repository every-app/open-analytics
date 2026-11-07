import {
  buildLocalityLocationValue,
  buildRegionLocationValue,
  canonicalizeGeoLocationValue,
} from "@/lib/analytics/geo-location";
import { isSameGeoLabel } from "@/lib/dashboard/geo-translation";
import {
  resolveCountryFlagCode,
  resolveCountryLabel,
} from "@/lib/i18n/code-labels";
import type { Locale } from "@/lib/i18n/config";

import { normalizeDimensionLabel } from "./overview-labels";
import type { LocationTab } from "./types";

export const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;
export const DIRECT_REFERRER_FILTER_VALUE = "__direct__";
const GEO_REGION_VALUE_SEPARATOR = "::";
export function extractGeoCountryCodeFromFilterValue(
  value: string | null | undefined,
): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const country = normalized
    .split(GEO_REGION_VALUE_SEPARATOR)
    .map((segment) => segment.trim())[0]
    ?.toUpperCase();
  if (!country) return null;
  return /^[A-Z]{2}$/.test(country) ? country : null;
}
export function canonicalizeGeoFilterValue(
  raw: string | null | undefined,
): string | null {
  return canonicalizeGeoLocationValue(raw);
}
export function resolveGeoLocationHighlightValue(
  tab: Exclude<LocationTab, "map">,
  geoFilterValue: string | null,
): string | null {
  if (!geoFilterValue) return null;
  const normalized = canonicalizeGeoFilterValue(geoFilterValue);
  if (!normalized) return null;
  const segments = normalized
    .split(GEO_REGION_VALUE_SEPARATOR)
    .map((segment) => segment.trim());
  if (tab === "country") {
    return segments[0] || null;
  }
  if (tab === "region") {
    if (segments.length < 3) return null;
    return `${segments[0]}${GEO_REGION_VALUE_SEPARATOR}${segments[1]}${GEO_REGION_VALUE_SEPARATOR}${segments[2]}`;
  }
  if (segments.length < 4) return null;
  return `${segments[0]}${GEO_REGION_VALUE_SEPARATOR}${segments[1]}${GEO_REGION_VALUE_SEPARATOR}${segments[2]}${GEO_REGION_VALUE_SEPARATOR}${segments.slice(3).join(GEO_REGION_VALUE_SEPARATOR)}`;
}
export function resolveGeoRegionBreadcrumbData(
  value: string,
  locale: Locale,
  unknownLabel: string,
): {
  displayLabel: string;
  filterValue: string;
  breadcrumb: {
    countryLabel: string;
    countryIconName: string | null;
    regionLabel: string;
    countryCode: string;
    stateCode: string;
    hideRegion: boolean;
  };
} {
  const normalized = value.trim();
  const segments = normalized
    .split(GEO_REGION_VALUE_SEPARATOR)
    .map((segment) => segment.trim());
  const rawCountry = segments[0] || "";
  const rawStateCode = segments.length >= 3 ? segments[1] || "" : "";
  const rawStateName =
    segments.length >= 3
      ? segments.slice(2).join(GEO_REGION_VALUE_SEPARATOR).trim()
      : segments.length >= 2
        ? segments[1] || ""
        : "";
  const hasRegion = Boolean(rawStateCode.trim() || rawStateName.trim());
  const countryCode = rawCountry.toUpperCase();
  const effectiveStateCode = rawStateCode.trim() || rawStateName.trim();
  const effectiveStateName = rawStateName.trim() || effectiveStateCode;

  const regionLabel = normalizeDimensionLabel(rawStateName, unknownLabel);
  const { label: countryLabel, code } = resolveCountryLabel(
    rawCountry,
    locale,
    unknownLabel,
  );
  const flagCode = resolveCountryFlagCode(code);
  const countryIconName = flagCode
    ? `flagpack:${flagCode.toLowerCase()}`
    : null;

  return {
    displayLabel: hasRegion ? `${countryLabel} > ${regionLabel}` : countryLabel,
    filterValue: hasRegion
      ? buildRegionLocationValue(
          countryCode,
          effectiveStateCode,
          effectiveStateName,
        )
      : countryCode || countryLabel,
    breadcrumb: {
      countryLabel,
      countryIconName,
      regionLabel,
      countryCode,
      stateCode: rawStateCode,
      hideRegion: !hasRegion,
    },
  };
}
export function resolveGeoCityBreadcrumbData(
  value: string,
  locale: Locale,
  unknownLabel: string,
): {
  displayLabel: string;
  filterValue: string;
  breadcrumb: {
    countryLabel: string;
    countryIconName: string | null;
    regionLabel: string;
    cityLabel: string;
    countryCode: string;
    stateCode: string;
    cityNameDefault: string;
    hideRegion: boolean;
    hideCity: boolean;
  } | null;
} {
  const normalized = value.trim();
  const segments = normalized
    .split(GEO_REGION_VALUE_SEPARATOR)
    .map((segment) => segment.trim());

  if (segments.length < 2) {
    const cityLabel = normalizeDimensionLabel(normalized, unknownLabel);
    return {
      displayLabel: cityLabel,
      filterValue: cityLabel,
      breadcrumb: null,
    };
  }

  if (segments.length === 2) {
    const rawCountry = segments[0] || "";
    const rawCity = segments[1] || "";
    const countryCode = rawCountry.toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode) || !rawCity) {
      const cityLabel = normalizeDimensionLabel(normalized, unknownLabel);
      return {
        displayLabel: cityLabel,
        filterValue: cityLabel,
        breadcrumb: null,
      };
    }

    const cityLabel = normalizeDimensionLabel(rawCity, unknownLabel);
    const { label: countryLabel, code } = resolveCountryLabel(
      rawCountry,
      locale,
      unknownLabel,
    );
    const flagCode = resolveCountryFlagCode(code);
    const countryIconName = flagCode
      ? `flagpack:${flagCode.toLowerCase()}`
      : null;
    const englishCountryLabel = resolveCountryLabel(
      rawCountry,
      "en",
      unknownLabel,
    ).label;
    const hideCity =
      isSameGeoLabel(countryLabel, cityLabel) ||
      isSameGeoLabel(englishCountryLabel, cityLabel);

    return {
      displayLabel: hideCity ? countryLabel : `${countryLabel} > ${cityLabel}`,
      filterValue: buildLocalityLocationValue(countryCode, "", "", rawCity),
      breadcrumb: {
        countryLabel,
        countryIconName,
        regionLabel: "",
        cityLabel,
        countryCode,
        stateCode: "",
        cityNameDefault: rawCity,
        hideRegion: true,
        hideCity,
      },
    };
  }

  const rawCountry = segments[0] || "";
  const rawStateCode = segments.length >= 4 ? segments[1] || "" : "";
  const rawStateName =
    segments.length >= 4 ? segments[2] || "" : segments[1] || "";
  const rawCity =
    segments.length >= 4
      ? segments.slice(3).join(GEO_REGION_VALUE_SEPARATOR).trim()
      : segments.slice(2).join(GEO_REGION_VALUE_SEPARATOR).trim();
  const hasRegion = Boolean(rawStateCode.trim() || rawStateName.trim());
  const hideRegion = !hasRegion;
  const regionLabel = normalizeDimensionLabel(rawStateName, unknownLabel);
  const cityLabel = normalizeDimensionLabel(rawCity, unknownLabel);
  const countryCode = rawCountry.toUpperCase();
  const effectiveStateCode = rawStateCode.trim() || rawStateName.trim();
  const effectiveStateName = rawStateName.trim() || effectiveStateCode;
  const effectiveCity = rawCity.trim() || cityLabel;
  const { label: countryLabel, code } = resolveCountryLabel(
    rawCountry,
    locale,
    unknownLabel,
  );
  const flagCode = resolveCountryFlagCode(code);
  const countryIconName = flagCode
    ? `flagpack:${flagCode.toLowerCase()}`
    : null;
  const englishCountryLabel = resolveCountryLabel(
    rawCountry,
    "en",
    unknownLabel,
  ).label;
  const hideCity =
    isSameGeoLabel(rawStateName, rawCity) ||
    (hideRegion &&
      (isSameGeoLabel(countryLabel, cityLabel) ||
        isSameGeoLabel(englishCountryLabel, cityLabel)));

  return {
    displayLabel: hideRegion
      ? hideCity
        ? countryLabel
        : `${countryLabel} > ${cityLabel}`
      : hideCity
        ? `${countryLabel} > ${regionLabel}`
        : `${countryLabel} > ${regionLabel} > ${cityLabel}`,
    filterValue:
      countryCode && effectiveCity
        ? buildLocalityLocationValue(
            countryCode,
            effectiveStateCode,
            effectiveStateName,
            effectiveCity,
          )
        : effectiveCity,
    breadcrumb: {
      countryLabel,
      countryIconName,
      regionLabel,
      cityLabel,
      countryCode,
      stateCode: rawStateCode,
      cityNameDefault: effectiveCity,
      hideRegion,
      hideCity,
    },
  };
}
export function resolveGeoDimensionRowRawValue(item: {
  label?: string;
  value?: string;
}): string {
  const rawValue = typeof item.value === "string" ? item.value.trim() : "";
  if (rawValue) return rawValue;
  return String(item.label || "").trim();
}
