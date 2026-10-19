import { type TeamDashboardSnapshot } from "@/lib/dashboard/team-dashboard-query";
import type { TeamData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

export type SiteMetricChangeRates = {
  views: number | null;
  visitors: number | null;
  sessions: number | null;
  bounceRate: number | null;
  avgDurationMs: number | null;
  pagesPerSession: number | null;
};

export interface TeamManagementClientProps {
  locale: Locale;
  messages: AppMessages;
  activeTeam: TeamData;
  systemRole: "admin" | "user";
  teamDashboardSnapshot?: TeamDashboardSnapshot | null;
}
