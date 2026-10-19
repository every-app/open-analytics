import { createFileRoute, Outlet } from "@tanstack/react-router";

import {
  SectionLayout,
  SectionNavGroup,
  SectionNavLink,
} from "@/components/settings/section-layout";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/lib/dashboard/paths";
import { canManageTeam } from "@/lib/dashboard/permissions";
import type { AppMessages } from "@/lib/i18n/messages";
import { dashboardPageTitle } from "@/lib/page-title";

export const Route = createFileRoute("/$locale/app/settings")({
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
  account: "/$locale/app/settings/account",
  sites: "/$locale/app/settings/sites",
  notifications: "/$locale/app/settings/notifications",
  "public-links": "/$locale/app/settings/public-links",
  general: "/$locale/app/settings/general",
  "scheduled-tasks": "/$locale/app/settings/scheduled-tasks",
  "request-observation": "/$locale/app/settings/request-observation",
  performance: "/$locale/app/settings/performance",
} as const satisfies Record<SettingsSection, string>;

const GROUPS = ["personal", "organization", "system"] as const;

function sectionLabel(
  copy: AppMessages["settingsNav"],
  section: SettingsSection,
): string {
  if (section === "public-links") return copy.publicLinks;
  if (section === "scheduled-tasks") return copy.scheduledTasks;
  if (section === "request-observation") return copy.requestObservation;
  return copy[section];
}

function SettingsLayout() {
  const { locale, messages, teamContext } = Route.useRouteContext();
  const copy = messages.settingsNav;
  const canManage = canManageTeam(
    teamContext.activeTeam.membershipRole,
    teamContext.user.systemRole,
  );
  const visible = SETTINGS_SECTIONS.filter(
    (section) => section.access === "member" || canManage,
  );

  return (
    <SectionLayout
      label={copy.label}
      nav={GROUPS.map((group) => {
        const sections = visible.filter((section) => section.group === group);
        if (sections.length === 0) return null;
        return (
          <SectionNavGroup key={group} label={copy[group]}>
            {sections.map((section) => (
              <SectionNavLink
                key={section.key}
                to={SECTION_ROUTES[section.key]}
                params={{ locale }}
                activeOptions={{ includeSearch: false }}
              >
                {sectionLabel(copy, section.key)}
              </SectionNavLink>
            ))}
          </SectionNavGroup>
        );
      })}
    >
      <Outlet />
    </SectionLayout>
  );
}
