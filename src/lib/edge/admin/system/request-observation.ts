import { requireActor } from "@/lib/edge/admin/auth";
import { forb, jsonResponseFor, na } from "@/lib/edge/admin/response";
import { readRequestObservationSummary } from "@/lib/edge/collector/request-observations";
import type { Env } from "@/lib/edge/types";

const WINDOW_DAYS = new Set([1, 7, 30]);
const DAY_MS = 24 * 60 * 60 * 1000;

/** Blocked /collect traffic of the organization's sites, for admins. */
export async function handleRequestObservationAdmin(
  req: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (req.method !== "GET") return na(req);
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (!actor.isAdmin) {
    return forb(
      "Only members of the organization can observe requests",
      undefined,
      req,
    );
  }
  const requested = Number(url.searchParams.get("days"));
  const days = WINDOW_DAYS.has(requested) ? requested : 7;
  return jsonResponseFor(req, {
    ok: true,
    data: await readRequestObservationSummary(env, {
      sinceMs: Date.now() - days * DAY_MS,
      teamId: actor.teamId,
    }),
  });
}
