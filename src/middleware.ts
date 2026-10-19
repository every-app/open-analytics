import type { Env } from "@/lib/edge/types";
import {
  DEFAULT_LOCALE,
  isValidLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config";

export interface PageRequestDecision {
  locale: string | null;
  pathname: string;
  response: Response | null;
}

function hasRootSecret(env: Env): boolean {
  return Boolean(
    String(env.MAIN_SECRET || "").trim() ||
    String(env.DAILY_SALT_SECRET || "").trim(),
  );
}

/**
 * The browser's language. The gateway strips every cookie before a request
 * reaches the app, so the path's locale prefix is the only remembered choice.
 */
function requestLocale(request: Request): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((part) => part.trim().split(";")[0].trim().toLowerCase())
      .map((tag) => {
        if (
          tag === "zh-tw" ||
          tag === "zh-hk" ||
          tag === "zh-mo" ||
          tag.startsWith("zh-hant")
        ) {
          return "zh-tw";
        }
        return isValidLocale(tag) ? tag : tag.slice(0, 2);
      })
      .find(isValidLocale);
    if (preferred) return preferred;
  }
  return DEFAULT_LOCALE;
}

function pathnameHasLocale(pathname: string): boolean {
  return SUPPORTED_LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

function normalizePathname(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function localizedPath(pathname: string, locale: string): string {
  const normalized = normalizePathname(pathname);
  return normalized === "/" ? `/${locale}/app` : `/${locale}${normalized}`;
}

function localeFromPathname(pathname: string): string | null {
  const segment = pathname.split("/")[1];
  return isValidLocale(segment) ? segment : null;
}

function redirectResponse(
  request: Request,
  pathname: string,
  preserveSearch = false,
): Response {
  const url = new URL(request.url);
  url.pathname = normalizePathname(pathname);
  if (!preserveSearch) url.search = "";
  return new Response(null, {
    status: 307,
    headers: { location: url.toString(), "x-pathname": url.pathname },
  });
}

/**
 * Puts every page under a locale prefix, and sends every page to the setup
 * error while MAIN_SECRET is unset. The gateway signs people in before any
 * private page reaches the app.
 */
export function resolvePageRequest(
  request: Request,
  env: Env,
): PageRequestDecision {
  const url = new URL(request.url);
  const { pathname } = url;
  const normalizedPathname = normalizePathname(pathname);
  const localeFromPath = localeFromPathname(pathname);
  const localeForRequest = localeFromPath || requestLocale(request);

  if (
    normalizedPathname !== `/${localeForRequest}/runtime-config-error` &&
    !hasRootSecret(env)
  ) {
    return {
      locale: localeForRequest,
      pathname,
      response: redirectResponse(
        request,
        `/${resolveLocale(localeForRequest)}/runtime-config-error`,
      ),
    };
  }

  if (!pathnameHasLocale(pathname)) {
    return {
      locale: localeForRequest,
      pathname,
      response: redirectResponse(
        request,
        localizedPath(pathname, localeForRequest),
        true,
      ),
    };
  }
  if (normalizedPathname === `/${localeFromPath}`) {
    return {
      locale: localeFromPath,
      pathname,
      response: redirectResponse(request, `/${localeFromPath}/app`, true),
    };
  }

  return { locale: localeFromPath, pathname, response: null };
}
