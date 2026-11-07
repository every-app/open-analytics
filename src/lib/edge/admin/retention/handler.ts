import { requireActor } from "@/lib/edge/admin/auth";
import {
  bad,
  forb,
  jsonResponseFor,
  na,
  parseJson,
} from "@/lib/edge/admin/response";
import {
  readRetentionConfig,
  writeRetentionConfig,
} from "@/lib/edge/scheduled-tasks/retention-config";
import type { Env } from "@/lib/edge/types";
import { mergeRetentionConfig } from "@/lib/retention";

/** Reads or changes how long the instance keeps notifications and analytics. */
export async function handleRetentionAdmin(
  req: Request,
  env: Env,
): Promise<Response> {
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (!actor.isAdmin) {
    return forb("Only admins can change data retention", undefined, req);
  }
  if (req.method === "GET") {
    return jsonResponseFor(req, {
      ok: true,
      data: await readRetentionConfig(env),
    });
  }
  if (req.method !== "PATCH") return na(req);
  const body = await parseJson(req);
  if (!body.retention || typeof body.retention !== "object") {
    return bad("retention is required", undefined, req);
  }
  const current = await readRetentionConfig(env);
  const saved = await writeRetentionConfig(
    env,
    mergeRetentionConfig(current, body.retention as Record<string, unknown>),
  );
  return jsonResponseFor(req, { ok: true, data: saved });
}
