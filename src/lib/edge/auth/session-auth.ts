import { resolveViewer, type Viewer } from "@/lib/edge/auth/viewer";
import type { Env } from "@/lib/edge/types";

export type EdgeSystemRole = "admin" | "user";

/**
 * Who a dashboard request is from, as the analytics and admin code reads it:
 * the gateway viewer (viewer.ts). Everyone in the organization manages the
 * app, so every member is `systemRole: "admin"`.
 */
export interface EdgeSessionClaims {
  userId: string;
  email: string;
  teamId: string;
  systemRole: EdgeSystemRole;
}

export function sessionFromViewer(viewer: Viewer): EdgeSessionClaims {
  return {
    userId: viewer.userId,
    email: viewer.email,
    teamId: viewer.teamId,
    systemRole: viewer.isAdmin ? "admin" : "user",
  };
}

export async function requireSession(
  request: Request,
  env: Env,
): Promise<EdgeSessionClaims | null> {
  const viewer = await resolveViewer(request, env);
  return viewer ? sessionFromViewer(viewer) : null;
}
