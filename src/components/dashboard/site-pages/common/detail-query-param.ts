/** Route query key used by app detail pages. */
export const DETAIL_QUERY_PARAM = "detail";

/** Route query key choosing the Visitors page's table. */
export const VIEW_QUERY_PARAM = "view";

/** The Visitors page's tables: one row per visitor, or per session. */
export enum PeopleView {
  Visitors = "visitors",
  Sessions = "sessions",
}

export function parsePeopleView(searchParams: URLSearchParams): PeopleView {
  return searchParams.get(VIEW_QUERY_PARAM) === PeopleView.Sessions
    ? PeopleView.Sessions
    : PeopleView.Visitors;
}

/** A visitor's journey, opened on the Visitors page. */
export function visitorDetailHref(siteBasePath: string, visitorId: string) {
  return `${siteBasePath}/visitors?${DETAIL_QUERY_PARAM}=${encodeURIComponent(visitorId)}`;
}

/** A session's journey, opened in the Visitors page's Sessions view. */
export function sessionDetailHref(siteBasePath: string, sessionId: string) {
  return `${siteBasePath}/visitors?${VIEW_QUERY_PARAM}=${PeopleView.Sessions}&${DETAIL_QUERY_PARAM}=${encodeURIComponent(sessionId)}`;
}
