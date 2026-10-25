import { createFileRoute, redirect } from "@tanstack/react-router";

import { buildSettingsPath } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";

// Settings opens on Notifications for anyone who manages (everyone), Account otherwise.
export const Route = createFileRoute("/$locale/app/settings/")({
  beforeLoad: ({ context }) => {
    const c = context.teamContext;
    const canManage = canManageTeam(
      c.activeTeam.membershipRole,
      c.user.systemRole,
    );
    throw redirect({
      href: buildSettingsPath(
        context.locale,
        canManage ? "notifications" : "account",
      ),
    });
  },
});
