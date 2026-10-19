import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

export type TeamTab =
  "sites" | "site-management" | "notifications" | "public-links";

export type ManagementSectionKey =
  | "scheduled-tasks"
  | "request-observation"
  | "system-performance"
  | "system-settings";

export interface DashboardSectionItem {
  key: string;
  label: string;
  href: string;
}

const TEAM_TABS_ALWAYS: readonly TeamTab[] = ["sites"] as const;
const TEAM_TABS_MANAGE: readonly TeamTab[] = [
  "notifications",
  "public-links",
  "site-management",
] as const;

function teamTabLabel(messages: AppMessages, tab: TeamTab): string {
  if (tab === "sites") return messages.teamManagement.sites.title;
  if (tab === "site-management") return messages.managementNav.sites;
  if (tab === "notifications")
    return messages.teamManagement.notifications.title;
  return messages.teamManagement.publicLinks.title;
}

function managementLabel(
  messages: AppMessages,
  key: ManagementSectionKey,
): string {
  if (key === "scheduled-tasks") return messages.managementNav.scheduledTasks;
  if (key === "request-observation")
    return messages.managementNav.requestObservation;
  if (key === "system-settings") return messages.managementNav.systemSettings;
  return messages.managementNav.systemPerformance;
}

/** The organization's own pages: all sites, and what owners and admins manage. */
export function buildTeamTabPath(locale: Locale, tab: TeamTab): string {
  const base = `/${locale}/app`;
  if (tab === "sites") return base;
  if (tab === "site-management") return `${base}/sites`;
  return `${base}/${tab}`;
}

function buildManagementPath(
  locale: Locale,
  key: ManagementSectionKey,
): string {
  return `/${locale}/app/manage/${key}`;
}

export function buildTeamSections(
  locale: Locale,
  messages: AppMessages,
  canManage: boolean,
): DashboardSectionItem[] {
  const tabs = canManage
    ? [...TEAM_TABS_ALWAYS, ...TEAM_TABS_MANAGE]
    : [...TEAM_TABS_ALWAYS];
  return tabs.map((tab) => ({
    key: tab,
    label: teamTabLabel(messages, tab),
    href: buildTeamTabPath(locale, tab),
  }));
}

export function buildManagementSections(
  locale: Locale,
  messages: AppMessages,
): DashboardSectionItem[] {
  const keys: readonly ManagementSectionKey[] = [
    "scheduled-tasks",
    "request-observation",
    "system-performance",
    "system-settings",
  ] as const;
  return keys.map((key) => ({
    key,
    label: managementLabel(messages, key),
    href: buildManagementPath(locale, key),
  }));
}
