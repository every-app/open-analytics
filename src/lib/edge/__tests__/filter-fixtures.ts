import {
  analyticsFilterRegistry,
  type FilterDocument,
  normalizeFilterDocument,
} from "@/lib/edge/analytics/contract";

const fields: Readonly<Record<string, string>> = {
  country: "geo.country",
  device: "client.deviceType",
  browser: "client.browser",
  clientBrowser: "client.browser",
  path: "page.path",
  query: "page.query",
  title: "page.title",
  hostname: "page.hostname",
  entry: "session.entryPath",
  exit: "session.exitPath",
  sourceDomain: "referrer.domain",
  sourceLink: "referrer.url",
  clientOsVersion: "client.osVersion",
  clientDeviceType: "client.deviceType",
  clientLanguage: "client.language",
  clientScreenSize: "client.screenSize",
  geoContinent: "geo.continent",
  geoTimezone: "geo.timeZone",
};

/** Test-only migration aid. Production accepts only FilterDocument inputs. */
export function filterFixture(
  input: Readonly<Record<string, unknown>>,
): FilterDocument {
  const conditions: unknown[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (key === "geo" && typeof value === "string") {
      const [country, region, regionName, city] = value.split("::");
      for (const [field, part] of [
        ["geo.country", country],
        ["geo.region", region || regionName],
        ["geo.city", city],
      ] as const) {
        if (part)
          conditions.push({
            target: { kind: "field", field },
            operator: "eq",
            value: part,
          });
      }
      continue;
    }
    const field = fields[key];
    if (!field || !["string", "number", "boolean"].includes(typeof value))
      continue;
    conditions.push({
      target: { kind: "field", field },
      operator: "eq",
      value,
    });
  }
  return normalizeFilterDocument({ conditions }, analyticsFilterRegistry);
}
