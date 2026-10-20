import {
  GatewayRefusalError,
  integrationStatus,
  sendEmail,
} from "@every-app/sdk/server";

import { requireActor } from "@/lib/edge/admin/auth";
import { bad, forb, jsonResponseFor, na } from "@/lib/edge/admin/response";
import type { Env } from "@/lib/edge/types";
import {
  isValidEmail,
  type PublicNotificationEmailConfig,
} from "@/lib/notifications/email-config";

const TEST_EMAIL_SUBJECT = "Open Analytics email test";
const TEST_EMAIL_TEXT =
  "This is a test email from Open Analytics. Notification email is working.";
const TEST_EMAIL_HTML =
  "<p>This is a test email from Open Analytics.</p><p>Notification email is working.</p>";

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

/** Sends a test message, to the admin unless another address is given. */
export async function handleNotificationEmailTestAdmin(
  req: Request,
  env: Env,
): Promise<Response> {
  const actor = await requireActor(env, req);
  if (actor instanceof Response) return actor;
  if (!actor.isAdmin) {
    return forb(
      "Only organization admins can test notification email",
      undefined,
      req,
    );
  }
  if (req.method !== "POST") return na(req);

  // The test goes to the admin who asked for it, never to an address they
  // type: the gateway's sender must only reach the organization's members.
  const to = actor.user.email;
  if (!isValidEmail(to)) {
    return bad("Invalid test recipient email", undefined, req);
  }

  try {
    const sent = await sendEmail({
      env,
      for: req,
      message: {
        to,
        subject: TEST_EMAIL_SUBJECT,
        text: TEST_EMAIL_TEXT,
        html: TEST_EMAIL_HTML,
      },
    });
    return jsonResponseFor(req, {
      ok: true,
      data: { provider: "every-app", messageId: sent.messageId ?? null },
    });
  } catch (error) {
    if (error instanceof GatewayRefusalError) {
      return bad(error.message, error.code, req);
    }
    throw error;
  }
}
