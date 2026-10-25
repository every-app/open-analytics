import {
  and,
  compileD1Query,
  createD1DatabaseClient,
  eq,
  filter,
  limit,
  param,
  project,
  scan,
} from "@/lib/db";
import { schema } from "@/lib/db/schema";
import {
  type EdgeSessionClaims,
  requireSession,
} from "@/lib/edge/auth/session-auth";
import type { Env } from "@/lib/edge/types";
import {
  bad as badRequest,
  nf as notFound,
  una as unauthorized,
} from "@/lib/response";

function normalizeFilterValue(value: string | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, 120);
  return normalized.length > 0 ? normalized : undefined;
}

export interface SiteAccessRecord {
  id: string;
  name: string;
  domain: string;
  canManage?: boolean;
}
type SiteRow = SiteAccessRecord;

function database(env: Pick<Env, "DB">) {
  return createD1DatabaseClient(env.DB);
}

function withSiteId<Row extends { id: string | null }>(row: Row | null) {
  if (!row || row.id === null) return null;
  return { ...row, id: row.id };
}

export async function resolvePrivateSite(
  request: Request,
  env: Env,
  url: URL,
): Promise<SiteRow | Response> {
  const session = await requireSession(request, env);
  if (!session) return unauthorized("Unauthorized", undefined, request);

  return resolvePrivateSiteForSession(request, env, url, session);
}

/** A site of the viewer's organization; every member manages it. */
export async function resolvePrivateSiteForSession(
  request: Request,
  env: Env,
  url: URL,
  session: EdgeSessionClaims,
): Promise<SiteRow | Response> {
  const siteId = normalizeFilterValue(url.searchParams.get("siteId"));
  if (!siteId) return badRequest("siteId is required", undefined, request);

  const sites = scan(schema.sites);
  const matchingSites = filter(
    sites,
    and(
      eq(sites.columns.id, param(siteId)),
      eq(sites.columns.team_id, param(session.teamId)),
    ),
  );
  const site = withSiteId(
    await database(env).first(
      compileD1Query(
        limit(
          project(matchingSites, {
            id: matchingSites.columns.id,
            name: matchingSites.columns.name,
            domain: matchingSites.columns.domain,
          }),
          1,
        ),
        { tag: "auth.sites.first" },
      ),
    ),
  );
  return site
    ? { ...site, canManage: session.systemRole === "admin" }
    : notFound("Site not found", undefined, request);
}

export async function resolvePrivateTeam(
  request: Request,
  env: Env,
  url: URL,
): Promise<{ id: string; allowedSiteIds?: string[] } | Response> {
  const session = await requireSession(request, env);
  if (!session) return unauthorized("Unauthorized", undefined, request);

  return resolvePrivateTeamForSession(request, env, url, session);
}

/** The viewer's organization workspace; a request naming another is refused. */
export async function resolvePrivateTeamForSession(
  request: Request,
  _env: Env,
  url: URL,
  session: EdgeSessionClaims,
): Promise<{ id: string; allowedSiteIds?: string[] } | Response> {
  const teamId = normalizeFilterValue(url.searchParams.get("teamId"));
  if (teamId && teamId !== session.teamId) {
    return notFound("Team not found", undefined, request);
  }
  return { id: session.teamId };
}

export async function fetchPublicSite(
  env: Env,
  url: URL,
): Promise<SiteRow | Response> {
  const segments = url.pathname.split("/").filter(Boolean);
  let slug = "";
  try {
    const shareIndex = segments.indexOf("share");
    const slugSegment =
      shareIndex >= 0 ? segments[shareIndex + 1] : segments[2];
    slug = decodeURIComponent(slugSegment || "").trim();
  } catch {
    return notFound("Public site not found");
  }
  if (!slug) return notFound("Public site not found");

  const sites = scan(schema.sites);
  const publicSites = filter(
    sites,
    and(
      eq(sites.columns.public_enabled, param(1)),
      eq(sites.columns.public_slug, param(slug)),
    ),
  );
  const site = withSiteId(
    await database(env).first(
      compileD1Query(
        limit(
          project(publicSites, {
            id: publicSites.columns.id,
            name: publicSites.columns.name,
            domain: publicSites.columns.domain,
          }),
          1,
        ),
        { tag: "auth.sites.first" },
      ),
    ),
  );
  return site ?? notFound("Public site not found");
}
