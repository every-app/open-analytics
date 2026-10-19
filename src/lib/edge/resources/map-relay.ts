import {
  getInvocationLogger,
  measureExternalFetch,
} from "@/lib/edge/observability/bindings";
import type { Env } from "@/lib/edge/types";
import { requireSameOrigin } from "@/lib/edge/utils";
import { isValidLocale, type Locale } from "@/lib/i18n/config";

/**
 * The dashboard maps' basemap: OpenFreeMap's open vector styles (OpenMapTiles
 * schema, no key). The Worker serves the style with its labels in the
 * dashboard's language; tiles, fonts and sprites load from OpenFreeMap.
 * MAP_STYLE_BASE_URL points at another OpenMapTiles style host (its `light`
 * and `dark` styles are `<base>/positron` and `<base>/dark`).
 */
const DEFAULT_MAP_STYLE_BASE_URL = "https://tiles.openfreemap.org/styles";
const STYLE_PATH =
  /^\/api\/public\/resources\/map\/v1\/styles\/(light|dark)\/style\.json$/;
const STYLE_NAMES = { light: "positron", dark: "dark" } as const;
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

/** OpenMapTiles name fields per dashboard language, best first. */
const NAME_FIELDS: Record<Locale, readonly string[]> = {
  en: ["name:en"],
  zh: ["name:zh"],
  "zh-tw": ["name:zh-Hant", "name:zh"],
  ja: ["name:ja"],
};

function styleBaseUrl(env?: Env): string {
  const configured = env?.MAP_STYLE_BASE_URL?.trim();
  if (!configured) return DEFAULT_MAP_STYLE_BASE_URL;
  try {
    const url = new URL(configured);
    return url.protocol === "https:"
      ? url.toString().replace(/\/$/, "")
      : DEFAULT_MAP_STYLE_BASE_URL;
  } catch {
    return DEFAULT_MAP_STYLE_BASE_URL;
  }
}

type StyleLayer = { layout?: Record<string, unknown> };

/** Prefers the locale's own name on every place, road and water label. */
function localizeStyleLabels(
  style: { layers?: StyleLayer[] },
  locale: Locale,
): void {
  const preferred = NAME_FIELDS[locale].map((field) => ["get", field]);
  for (const layer of style.layers ?? []) {
    const textField = layer.layout?.["text-field"];
    if (!textField || !JSON.stringify(textField).includes('"name')) continue;
    layer.layout!["text-field"] = ["coalesce", ...preferred, textField];
  }
}

export async function handleMapRelayRequest(
  request: Request,
  env?: Env,
): Promise<Response> {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET" },
    });
  }

  const url = new URL(request.url);
  const theme = STYLE_PATH.exec(url.pathname)?.[1] as
    keyof typeof STYLE_NAMES | undefined;
  if (!theme) return new Response("Not Found", { status: 404 });
  const requestedLocale = url.searchParams.get("locale");
  const locale: Locale = isValidLocale(requestedLocale)
    ? requestedLocale
    : "en";

  const logger = env ? getInvocationLogger(env) : undefined;
  try {
    const response = await measureExternalFetch(
      logger,
      "external_fetch.map_style",
      () => fetch(`${styleBaseUrl(env)}/${STYLE_NAMES[theme]}`),
    );
    if (!response.ok) {
      return new Response("Map style unavailable", { status: 502 });
    }
    const style = (await response.json()) as { layers?: StyleLayer[] };
    localizeStyleLabels(style, locale);
    return Response.json(style, {
      headers: { "cache-control": CACHE_CONTROL },
    });
  } catch {
    logger?.info("map_style.unavailable", { theme });
    return new Response("Map style unavailable", { status: 502 });
  }
}
