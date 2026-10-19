import type { ScriptSnippetData } from "@/lib/dashboard/management-data";
import type { NotificationPreferencesData } from "@/lib/dashboard-api/client/edge";
import type { AdminServiceRoute } from "@/lib/dashboard-api/contract/admin-service";
import type {
  AccountUserData,
  MemberData,
  NotificationMessageData,
  NotificationRuleData,
  SiteData,
  TeamData,
} from "@/lib/dashboard-api/contract/types";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";
import type { ScheduledTasksData } from "@/lib/scheduled-tasks";
import type { SiteSettingsConfig } from "@/lib/site-settings";
import type { SystemPerformanceData } from "@/lib/system-performance";
export {
  adminServicePath,
  type AdminServiceRoute,
  adminServiceRouteForPath,
} from "@/lib/dashboard-api/contract/admin-service";
import type { Env } from "@/lib/edge/types";
/**
 * Management routes are deliberately modeled separately from analytics
 * operations. Analytics has a read-only query contract; admin service routes
 * also include mutations, tests, previews, and operational commands.
 */
export interface AdminServiceRequest {
  readonly route: AdminServiceRoute;
  readonly request: Request;
  readonly env: Env;
  readonly url: URL;
}
export interface AdminSessionData {
  readonly user: AccountUserData;
  readonly teams: TeamData[];
}
export interface AdminNotificationsData {
  readonly messages: NotificationMessageData[];
  readonly unreadAttentionCount: number;
}
/** Read payloads used by SSR management loaders. */
export interface AdminServiceReadMap {
  session: AdminSessionData;
  sites: SiteData[];
  members: MemberData[];
  notifications: AdminNotificationsData;
  "site-config": SiteSettingsConfig;
  "script-snippet": ScriptSnippetData;
  "notification-rules": NotificationRuleData[];
  "notification-email": PublicNotificationEmailConfig;
  "notifications/preferences": NotificationPreferencesData;
  "scheduled-tasks": ScheduledTasksData;
  "system-performance": SystemPerformanceData;
}
export async function executeAdminService(
  input: AdminServiceRequest,
): Promise<Response> {
  const { executeRealAdminService } =
    await import("@/lib/edge/admin/service/real");
  return executeRealAdminService(input);
}
/**
 * Typed server-side read helper. It intentionally returns null for auth,
 * permission, and malformed responses so SSR loaders can use their existing
 * unauthenticated/not-found fallback without leaking API response details.
 */
export async function readAdminService<K extends keyof AdminServiceReadMap>(
  input: Omit<AdminServiceRequest, "route"> & {
    readonly route: K;
  },
): Promise<AdminServiceReadMap[K] | null> {
  const response = await executeAdminService(input);
  if (!response.ok) return null;

  try {
    const payload = (await response.json()) as {
      ok?: unknown;
      data?: unknown;
    };
    if (payload.ok !== true) return null;
    return payload.data as AdminServiceReadMap[K];
  } catch {
    return null;
  }
}
