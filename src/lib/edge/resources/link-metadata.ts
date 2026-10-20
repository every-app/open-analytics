import { jsonResponse } from "@/lib/response";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_TEXT_LENGTH = 500;
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const USER_AGENT =
  "Mozilla/5.0 (compatible; OpenAnalytics/1.0; +https://github.com/every-app/private-open-analytics)";

export interface LinkMetadata {
  finalUrl?: string;
  canonicalUrl?: string;
  title?: string;
  h1?: string;
  description?: string;
  firstParagraph?: string;
  icon?: string;
  siteName?: string;
  author?: string;
  language?: string;
  keywords?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

/** Only public web pages: http(s) on a hostname, never an address or port. */
function targetUrl(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.port || url.username || url.password) return null;
    const host = url.hostname;
    if (!host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":")) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function clean(value: string | null | undefined): string | undefined {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
  return text || undefined;
}

function absolute(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

/** Reads the head (and first heading and paragraph) of an HTML page. */
async function extract(response: Response): Promise<LinkMetadata> {
  const meta: Record<string, string> = {};
  const found: LinkMetadata = {};
  let title = "";
  let h1 = "";
  let paragraph = "";
  let inTitle = false;
  let inH1 = false;
  let inParagraph = false;

  const rewriter = new HTMLRewriter()
    .on("html", {
      element(el) {
        found.language ??= clean(el.getAttribute("lang"));
      },
    })
    .on("title", {
      element(el) {
        inTitle = true;
        el.onEndTag(() => {
          inTitle = false;
        });
      },
      text(chunk) {
        if (inTitle) title += chunk.text;
      },
    })
    .on("h1", {
      element(el) {
        if (h1) return;
        inH1 = true;
        el.onEndTag(() => {
          inH1 = false;
        });
      },
      text(chunk) {
        if (inH1) h1 += chunk.text;
      },
    })
    .on("p", {
      element(el) {
        if (paragraph) return;
        inParagraph = true;
        el.onEndTag(() => {
          inParagraph = false;
        });
      },
      text(chunk) {
        if (inParagraph) paragraph += chunk.text;
      },
    })
    .on("meta", {
      element(el) {
        const key = (
          el.getAttribute("property") ??
          el.getAttribute("name") ??
          ""
        ).toLowerCase();
        const content = el.getAttribute("content");
        if (key && content && !(key in meta)) meta[key] = content;
      },
    })
    .on("link", {
      element(el) {
        const rel = (el.getAttribute("rel") ?? "").toLowerCase();
        const href = el.getAttribute("href") ?? undefined;
        if (rel.split(/\s+/).includes("canonical")) found.canonicalUrl ??= href;
        if (rel.includes("icon")) found.icon ??= href;
      },
    });

  // Stop after MAX_HTML_BYTES: a page's head is near its start.
  const reader = response.body?.getReader();
  let bytes = 0;
  const limited = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = reader ? await reader.read() : { done: true as const };
      if (chunk.done || bytes >= MAX_HTML_BYTES) {
        await reader?.cancel().catch(() => {});
        controller.close();
        return;
      }
      bytes += chunk.value.byteLength;
      controller.enqueue(chunk.value);
    },
  });
  await rewriter.transform(new Response(limited)).arrayBuffer();

  const base = response.url;
  return {
    finalUrl: base,
    canonicalUrl: absolute(found.canonicalUrl, base),
    title: clean(meta["og:title"] ?? title),
    h1: clean(h1),
    description: clean(meta["og:description"] ?? meta.description),
    firstParagraph: clean(paragraph),
    icon: absolute(found.icon ?? "/favicon.ico", base),
    siteName: clean(meta["og:site_name"]),
    author: clean(meta.author ?? meta["article:author"]),
    language: found.language,
    keywords: clean(meta.keywords),
    publishedTime: clean(meta["article:published_time"]),
    modifiedTime: clean(meta["article:modified_time"]),
  };
}

/**
 * Title, description and icon of a referring page, for the referrer cards.
 * The Worker fetches the page itself, so the referrers a site's visitors
 * came from never leave the deployment.
 */
export async function handleLinkMetadata(request: Request): Promise<Response> {
  const url = targetUrl(new URL(request.url).searchParams.get("url"));
  if (!url) {
    return jsonResponse(
      { ok: false, error: "A public http(s) URL is required" },
      400,
    );
  }

  // Workers' default cache; absent outside the Workers runtime.
  const cache =
    (globalThis as { caches?: { default?: Cache } }).caches?.default ?? null;
  const cacheKey = new Request(
    `https://link-metadata.internal/?url=${encodeURIComponent(url.toString())}`,
  );
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;

  let data: LinkMetadata = {};
  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const type = response.headers.get("content-type") ?? "";
    if (response.ok && type.includes("html")) data = await extract(response);
    else await response.body?.cancel();
  } catch {
    // Unreachable pages simply have no metadata.
  }

  const result = jsonResponse({ ok: true, data }, 200, {
    "cache-control": `private, max-age=${CACHE_TTL_SECONDS}`,
  });
  await cache?.put(
    cacheKey,
    jsonResponse({ ok: true, data }, 200, {
      "cache-control": `public, max-age=${CACHE_TTL_SECONDS}`,
    }),
  );
  return result;
}
