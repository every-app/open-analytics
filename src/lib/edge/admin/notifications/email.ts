import { integrationStatus } from "@every-app/sdk/server";

import { requireActor } from "@/lib/edge/admin/auth";
import { jsonResponseFor, na } from "@/lib/edge/admin/response";
import type { Env } from "@/lib/edge/types";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";

/** Whether the gateway can send notification email, and as whom. */
export async function readNotificationEmailStatus(
  env: Env,
): Promise<PublicNotificationEmailConfig> {
  try {
    const status = await integrationStatus({ env, provider: "email" });
    return { enabled: status.ready, sender: status.sender?.address ?? null };
  } catch {
    return { enabled: false, sender: null };
  }
}

export async function handleNotificationEmailConfigAdmin(
  req: Request,
  env: Env,
): Promise<Response> {
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (req.method !== "GET") return na(req);
  return jsonResponseFor(req, {
    ok: true,
    data: await readNotificationEmailStatus(env),
  });
}
