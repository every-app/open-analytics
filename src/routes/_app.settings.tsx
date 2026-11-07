import { createFileRoute, Outlet } from "@tanstack/react-router";

import {
  SectionLayout,
  SectionNavLink,
} from "@/components/settings/section-layout";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/_app/settings")({
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.settingsNav.label,
          match.context,
        ),
      },
    ],
  }),
  component: SettingsLayout,
});

const SECTION_ROUTES = {
  account: "/settings/account",
  notifications: "/settings/notifications",
  system: "/settings/system",
} as const satisfies Record<SettingsSection, string>;

function SettingsLayout() {
  const { messages, teamContext } = Route.useRouteContext();
  const copy = messages.settingsNav;
  const canManage = canManageTeam(teamContext.activeTeam.membershipRole);
  const visible = SETTINGS_SECTIONS.filter(
    (section) => section.access === "member" || canManage,
  );
  const labels: Record<SettingsSection, string> = {
    account: copy.account,
    notifications: copy.notifications,
    system: copy.system,
  };

  return (
    <SectionLayout
      label={copy.label}
      nav={visible.map((section) => (
        <SectionNavLink
          key={section.key}
          to={SECTION_ROUTES[section.key]}
          activeOptions={{ includeSearch: false }}
        >
          {labels[section.key]}
        </SectionNavLink>
      ))}
    >
      <Outlet />
    </SectionLayout>
  );
}
