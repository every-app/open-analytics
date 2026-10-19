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
import { resolveViewer } from "@/lib/edge/auth/viewer";
import type { Env } from "@/lib/edge/types";

async function siteBelongsToTeam(
  env: Env,
  siteId: string,
  teamId: string,
): Promise<boolean> {
  const sites = scan(schema.sites);
  const matching = filter(
    sites,
    and(
      eq(sites.columns.id, param(siteId)),
      eq(sites.columns.team_id, param(teamId)),
    ),
  );
  const site = await createD1DatabaseClient(env.DB).first(
    compileD1Query(limit(project(matching, { id: matching.columns.id }), 1), {
      tag: "admin.sites.first",
    }),
  );
  return Boolean(site?.id);
}

/**
 * The dashboard's realtime WebSocket, handed to the site's ingest Durable
 * Object. The gateway checks who is upgrading (and that the page is the
 * app's own); the site must belong to their organization.
 */
export async function handleAdminWs(
  request: Request,
  env: Env,
): Promise<Response> {
  const viewer = await resolveViewer(request, env);
  if (!viewer) return new Response("Unauthorized", { status: 401 });

  const incomingUrl = new URL(request.url);
  const siteId = incomingUrl.searchParams.get("siteId");
  if (!siteId) {
    return new Response("siteId is required", { status: 400 });
  }

  if (!(await siteBelongsToTeam(env, siteId, viewer.teamId))) {
    return new Response("Forbidden", { status: 403 });
  }

  const doId = env.INGEST_DO.idFromName(siteId);
  const stub = env.INGEST_DO.get(doId);
  const forwardUrl = "https://ingest.internal/ws" + incomingUrl.search;
  return stub.fetch(new Request(forwardUrl, request));
}
