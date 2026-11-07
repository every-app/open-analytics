import {
  getInvocationLogger,
  measureExternalFetch,
} from "@/lib/edge/observability/bindings";
import type { InvocationLogger } from "@/lib/edge/observability/logger";
import type { Env } from "@/lib/edge/types";
import { requireSameOrigin } from "@/lib/edge/utils";
import { jsonResponse } from "@/lib/response";
const WIKIDATA_API_ENDPOINT = "https://www.wikidata.org/w/api.php";
const WIKI_LANGUAGE = "en";
const CACHE_CONTROL_HEADER =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const WIKIMEDIA_USER_AGENT =
  "OpenAnalytics/1.0 (+https://github.com/every-app/open-analytics)";
const CACHE_HEADERS = { "cache-control": CACHE_CONTROL_HEADER };
interface WikidataTerm {
  value?: string;
}
interface WikidataSitelink {
  title?: string;
  url?: string;
}
interface WikidataEntity {
  id?: string;
  labels?: Record<string, WikidataTerm>;
  descriptions?: Record<string, WikidataTerm>;
  sitelinks?: Record<string, WikidataSitelink>;
}
interface WikidataEntityResponse {
  entities?: Record<string, WikidataEntity>;
}
interface WikipediaSummaryResponse {
  title?: string;
  description?: string;
  extract?: string;
  extract_html?: string;
  thumbnail?: {
    source?: string;
  };
  content_urls?: {
    desktop?: {
      page?: string;
    };
    mobile?: {
      page?: string;
    };
  };
}
function isValidWikidataId(value: string): boolean {
  return /^Q\d+$/i.test(value);
}
function englishTerm(
  values: Record<string, WikidataTerm> | undefined,
): string | null {
  return String(values?.[WIKI_LANGUAGE]?.value ?? "").trim() || null;
}
function englishSitelink(
  sitelinks: Record<string, WikidataSitelink> | undefined,
): { title: string; url: string | null } | null {
  const sitelink = sitelinks?.[`${WIKI_LANGUAGE}wiki`];
  const title = String(sitelink?.title ?? "").trim();
  if (!title) return null;
  return { title, url: String(sitelink?.url ?? "").trim() || null };
}
async function fetchWikidataEntity(
  wikidataId: string,
  logger?: InvocationLogger,
): Promise<WikidataEntity | null> {
  const url = new URL(WIKIDATA_API_ENDPOINT);
  url.searchParams.set("action", "wbgetentities");
  url.searchParams.set("ids", wikidataId);
  url.searchParams.set("props", "labels|descriptions|sitelinks/urls");
  url.searchParams.set("format", "json");

  const response = await measureExternalFetch(
    logger,
    "external_fetch.wikidata",
    () =>
      fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": WIKIMEDIA_USER_AGENT,
        },
      }),
  );

  if (!response.ok) {
    throw new Error(`Wikidata upstream failed with ${response.status}`);
  }

  const payload = (await response.json()) as WikidataEntityResponse;
  const entity = payload.entities?.[wikidataId];
  return entity ?? null;
}
async function fetchWikipediaSummary(
  title: string,
  logger?: InvocationLogger,
): Promise<WikipediaSummaryResponse | null> {
  const endpoint = `https://${WIKI_LANGUAGE}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const response = await measureExternalFetch(
    logger,
    "external_fetch.wikipedia",
    () =>
      fetch(endpoint, {
        headers: {
          accept: "application/json",
          "user-agent": WIKIMEDIA_USER_AGENT,
        },
      }),
  );

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Wikipedia upstream failed with ${response.status}`);
  }

  return (await response.json()) as WikipediaSummaryResponse;
}
export async function handleWikiSummaryRequest(
  request: Request,
  env?: Env,
): Promise<Response> {
  const sameOriginError = requireSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const url = new URL(request.url);
  const wikidataId = String(url.searchParams.get("wikidataId") ?? "")
    .trim()
    .toUpperCase();

  if (!isValidWikidataId(wikidataId)) {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid or missing wikidataId",
      },
      400,
      CACHE_HEADERS,
    );
  }

  try {
    const logger = env ? getInvocationLogger(env) : undefined;
    const entity = await fetchWikidataEntity(wikidataId, logger);
    if (!entity) {
      return jsonResponse(
        {
          ok: false,
          error: "Wikidata entity not found",
        },
        404,
        CACHE_HEADERS,
      );
    }

    const label = englishTerm(entity.labels) ?? wikidataId;
    const description = englishTerm(entity.descriptions);
    const sitelink = englishSitelink(entity.sitelinks);

    let wikipedia: {
      title: string;
      description: string | null;
      extract: string | null;
      extractHtml: string | null;
      thumbnailUrl: string | null;
      pageUrl: string | null;
    } | null = null;

    if (sitelink) {
      const summary = await fetchWikipediaSummary(sitelink.title, logger);
      wikipedia = {
        title:
          String(summary?.title ?? sitelink.title).trim() || sitelink.title,
        description:
          String(summary?.description ?? "").trim() || description || null,
        extract: String(summary?.extract ?? "").trim() || null,
        extractHtml: String(summary?.extract_html ?? "").trim() || null,
        thumbnailUrl: String(summary?.thumbnail?.source ?? "").trim() || null,
        pageUrl:
          String(summary?.content_urls?.desktop?.page ?? "").trim() ||
          sitelink.url ||
          null,
      };
    }

    return jsonResponse(
      {
        ok: true,
        wikidataId,
        wikidata: {
          id: entity.id ?? wikidataId,
          label,
          description,
        },
        wikipedia,
      },
      200,
      CACHE_HEADERS,
    );
  } catch (error) {
    void error;
    return jsonResponse(
      {
        ok: false,
        error: "Wiki upstream unavailable",
      },
      502,
      CACHE_HEADERS,
    );
  }
}
