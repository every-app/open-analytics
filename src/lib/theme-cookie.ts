// The light/dark pick shared with the Every App launcher and every other app.
// Each app has its own host (`<app>.<gateway host>`), so localStorage is per
// app; the `everyapp-theme` cookie on the Gateway host reaches all of them.
// Keep its name, values and domain as they are: the other apps read the same
// one. Standalone (no Gateway) the pick stays in localStorage only.

export type ThemePreference = "system" | "light" | "dark";

export const THEME_COOKIE_NAME = "everyapp-theme";
/** This app's own copy, from before the shared cookie. */
export const THEME_STORAGE_KEY = "insightflare-theme";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const THEME_COOKIE_PATTERN = new RegExp(
  `(?:^|;\\s*)${THEME_COOKIE_NAME}=(system|light|dark)(?:;|$)`,
);

/** The pick in a `document.cookie` string, or null when there is none. */
export function readThemeCookie(cookie: string): ThemePreference | null {
  const match = THEME_COOKIE_PATTERN.exec(cookie);
  return match ? (match[1] as ThemePreference) : null;
}

/** The cookie, then this app's own copy, then the OS. */
export function resolveThemePreference(
  cookie: string,
  stored: string | null,
): ThemePreference {
  const shared = readThemeCookie(cookie);
  if (shared) return shared;
  return stored === "light" || stored === "dark" ? stored : "system";
}

/** The hostname of `GATEWAY_URL`, or null when it is unset or not a URL. */
export function gatewayHostname(gatewayUrl: string | undefined): string | null {
  if (!gatewayUrl) return null;
  try {
    return new URL(gatewayUrl).hostname || null;
  } catch {
    return null;
  }
}

/**
 * The Domain the cookie is set on: the Gateway's hostname, when the page is
 * on it or on one of its subdomains. Null otherwise (a custom hostname, or no
 * Gateway): the pick then stays in localStorage.
 */
export function themeCookieDomain(
  pageHostname: string,
  gatewayHost: string | null | undefined,
): string | null {
  if (!gatewayHost) return null;
  const page = pageHostname.toLowerCase().replace(/\.$/, "");
  const gateway = gatewayHost.toLowerCase().replace(/\.$/, "");
  if (page === gateway || page.endsWith(`.${gateway}`)) return gateway;
  return null;
}

/** The `document.cookie` assignment that stores a pick. */
export function themeCookieString(
  theme: ThemePreference,
  domain: string,
  secure: boolean,
): string {
  return [
    `${THEME_COOKIE_NAME}=${theme}`,
    // `localhost` gets a host-only cookie, which reaches every port.
    ...(domain.includes(".") ? [`Domain=${domain}`] : []),
    "Path=/",
    `Max-Age=${ONE_YEAR_SECONDS}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** Stores the pick on the shared cookie; false when the page can't share it. */
export function writeThemeCookie(
  theme: ThemePreference,
  gatewayHost: string | null | undefined,
): boolean {
  const domain = themeCookieDomain(location.hostname, gatewayHost);
  if (!domain) return false;
  document.cookie = themeCookieString(
    theme,
    domain,
    location.protocol === "https:",
  );
  return true;
}

/**
 * The no-flash script's first step, as source: sets `t` to the cookie's pick,
 * else this app's copy, else "system". Scripts that run before the bundle
 * can't import, so they inline this.
 */
export const readThemeScript = `var m=${THEME_COOKIE_PATTERN.toString()}.exec(document.cookie);var t=m?m[1]:localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||'system';`;
