import type { Env } from "@/lib/edge/types";
import { isValidLocale } from "@/lib/i18n/config";

export const RUNTIME_CONFIG_ERROR_PATH = "/runtime-config-error";

function hasRootSecret(env: Env): boolean {
  return Boolean(
    String(env.MAIN_SECRET || "").trim() ||
    String(env.DAILY_SALT_SECRET || "").trim(),
  );
}

/**
 * Where a link from before pages dropped their `/<locale>/app` prefix points
 * now: `/en/app/sites/a` → `/sites/a`, `/en/share/a` → `/share/a`. Null for a
 * current path.
 */
export function unprefixedPath(pathname: string): string | null {
  const [first, ...rest] = pathname.split("/").filter(Boolean);
  if (!isValidLocale(first)) return null;
  const path = rest[0] === "app" ? rest.slice(1) : rest;
  return `/${path.join("/")}`;
}

function redirectResponse(
  request: Request,
  pathname: string,
  preserveSearch: boolean,
): Response {
  const url = new URL(request.url);
  url.pathname = pathname;
  if (!preserveSearch) url.search = "";
  return new Response(null, {
    status: 307,
    headers: { location: url.toString(), "x-pathname": url.pathname },
  });
}

/**
 * Redirects old locale-prefixed links to their page, and sends every page to
 * the setup error while MAIN_SECRET is unset. The gateway signs people in
 * before any private page reaches the app.
 */
export function resolvePageRequest(
  request: Request,
  env: Env,
): Response | null {
  const { pathname } = new URL(request.url);
  const current = unprefixedPath(pathname);
  if (current !== null) return redirectResponse(request, current, true);
  if (pathname !== RUNTIME_CONFIG_ERROR_PATH && !hasRootSecret(env)) {
    return redirectResponse(request, RUNTIME_CONFIG_ERROR_PATH, false);
  }
  return null;
}
