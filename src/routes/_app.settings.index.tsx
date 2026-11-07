import { createFileRoute, redirect } from "@tanstack/react-router";

import { buildSettingsPath } from "@/lib/dashboard/paths";

// Settings opens on Notifications, where everyone sets up their own reports.
export const Route = createFileRoute("/_app/settings/")({
  beforeLoad: () => {
    throw redirect({ href: buildSettingsPath("notifications") });
  },
});
