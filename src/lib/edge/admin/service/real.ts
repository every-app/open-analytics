import { handleNotificationEmailConfigAdmin } from "@/lib/edge/admin/notifications/email";
import {
  handleNotificationPreferences,
  handleNotificationRead,
  handleNotificationRulesAdmin,
  handleNotifications,
  handleNotificationsReadAll,
} from "@/lib/edge/admin/notifications/handler";
import { nf } from "@/lib/edge/admin/response";
import { handleRetentionAdmin } from "@/lib/edge/admin/retention/handler";
import type { AdminServiceRequest } from "@/lib/edge/admin/service/index";
import {
  handleGetStartedAdmin,
  handleSiteTrackingAdmin,
} from "@/lib/edge/admin/setup/get-started";
import {
  handleScriptSnippetAdmin,
  handleSiteConfigAdmin,
  handleSitesAdmin,
} from "@/lib/edge/admin/sites/handler";
import {
  handleAuthMeAdmin,
  handleMembersAdmin,
  handleProfileAdmin,
} from "@/lib/edge/admin/users/handlers";
/**
 * Real adapter for the admin service. Existing handlers remain the source of
 * business rules during migration; this adapter is the only place that knows
 * how the existing handler modules are composed.
 */
export async function executeRealAdminService(
  input: AdminServiceRequest,
): Promise<Response> {
  const { route, request, env, url } = input;

  switch (route) {
    case "session":
      return handleAuthMeAdmin(request, env);
    case "profile":
      return handleProfileAdmin(request, env);
    case "sites":
      return handleSitesAdmin(request, env, url);
    case "members":
      return handleMembersAdmin(request, env);
    case "site-config":
      return handleSiteConfigAdmin(request, env, url);
    case "script-snippet":
      return handleScriptSnippetAdmin(request, env, url);
    case "notification-email":
      return handleNotificationEmailConfigAdmin(request, env);
    case "notification-rules":
      return handleNotificationRulesAdmin(request, env, url);
    case "retention":
      return handleRetentionAdmin(request, env);
    case "get-started":
      return handleGetStartedAdmin(request, env);
    case "site-tracking":
      return handleSiteTrackingAdmin(request, env, url);
    case "notifications":
      return handleNotifications(request, env, url);
    case "notifications/preferences":
      return handleNotificationPreferences(request, env);
    case "notifications/read-all":
      return handleNotificationsReadAll(request, env);
    default:
      if (route.startsWith("notifications/")) {
        return handleNotificationRead(
          request,
          env,
          route.slice("notifications/".length),
        );
      }
      return nf();
  }
}
