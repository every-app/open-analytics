import { createDatabaseRuntime } from "@/lib/db";
import { canReadSite } from "@/lib/edge/admin/access";
import { requireActor } from "@/lib/edge/admin/auth";
import { bad, forb, jsonResponseFor, na } from "@/lib/edge/admin/response";
import type { Env } from "@/lib/edge/types";
import { clampString } from "@/lib/edge/utils";

/** Get started's steps, in the order the card offers them. */
export const GET_STARTED_STEPS = [
  "site",
  "tracking",
  "team",
  "notifications",
  "sharing",
] as const;

export type GetStartedStepId = (typeof GET_STARTED_STEPS)[number];

export interface GetStartedData {
  /** The steps worth offering now, done or not; none means no card. */
  steps: Array<{ id: GetStartedStepId; done: boolean }>;
}

/**
 * Nothing before the first site (All sites asks for one), then adding the
 * site and installing its script, then the rest once a page view arrives.
 */
function offeredSteps(
  done: Record<GetStartedStepId, boolean>,
): readonly GetStartedStepId[] {
  if (!done.site) return [];
  if (!done.tracking) return ["site", "tracking"];
  return GET_STARTED_STEPS;
}

// A site has data once a visit is stored, or once rolled-up hours remain
// after retention deleted the visits themselves.
const SITE_HAS_DATA = `
  EXISTS (SELECT 1 FROM visits v WHERE v.site_pk = si.site_pk)
  OR EXISTS (SELECT 1 FROM visit_hourly_rollups r WHERE r.site_id = s.id)
`;

/** Which of Get started's steps the organization has done. */
export async function readGetStarted(
  env: Pick<Env, "DB">,
  teamId: string,
): Promise<GetStartedData> {
  const row = await createDatabaseRuntime(env.DB).first<
    Record<GetStartedStepId, number>
  >({
    sql: `
      SELECT
        EXISTS (SELECT 1 FROM sites WHERE team_id = ?1) AS site,
        EXISTS (
          SELECT 1 FROM sites s
          JOIN site_identities si ON si.site_id = s.id
          WHERE s.team_id = ?1 AND (${SITE_HAS_DATA})
        ) AS tracking,
        (SELECT COUNT(*) FROM (
          SELECT 1 FROM members WHERE team_id = ?1 LIMIT 2
        )) > 1 AS team,
        EXISTS (
          SELECT 1 FROM notification_rules WHERE team_id = ?1
        ) AS notifications,
        EXISTS (
          SELECT 1 FROM sites WHERE team_id = ?1 AND public_enabled = 1
        ) AS sharing
    `,
    bindings: [teamId],
    tag: "admin.get_started.progress",
  });
  const done = Object.fromEntries(
    GET_STARTED_STEPS.map((id) => [id, Boolean(row?.[id])]),
  ) as Record<GetStartedStepId, boolean>;
  return {
    steps: offeredSteps(done).map((id) => ({ id, done: done[id] })),
  };
}

/** Whether a site has received a page view yet. */
export async function readSiteHasData(
  env: Pick<Env, "DB">,
  siteId: string,
): Promise<boolean> {
  const row = await createDatabaseRuntime(env.DB).first<{ hasData: number }>({
    sql: `
      SELECT EXISTS (
        SELECT 1 FROM sites s
        JOIN site_identities si ON si.site_id = s.id
        WHERE s.id = ? AND (${SITE_HAS_DATA})
      ) AS hasData
    `,
    bindings: [siteId],
    tag: "admin.get_started.site_has_data",
  });
  return Boolean(row?.hasData);
}

/** The organization's Get started progress, for owners and admins. */
export async function handleGetStartedAdmin(
  req: Request,
  env: Env,
): Promise<Response> {
  if (req.method !== "GET") return na(req);
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (!actor.isAdmin) {
    return forb("Only organization admins can set up", undefined, req);
  }
  return jsonResponseFor(req, {
    ok: true,
    data: await readGetStarted(env, actor.teamId),
  });
}

/** Whether one of the organization's sites has received a page view. */
export async function handleSiteTrackingAdmin(
  req: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (req.method !== "GET") return na(req);
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  const siteId = clampString(url.searchParams.get("siteId") || "", 120);
  if (!siteId) return bad("Missing siteId", undefined, req);
  if (!(await canReadSite(env, actor, siteId))) {
    return forb("Site access denied", undefined, req);
  }
  return jsonResponseFor(req, {
    ok: true,
    data: { hasData: await readSiteHasData(env, siteId) },
  });
}
