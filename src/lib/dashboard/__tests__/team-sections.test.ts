import { describe, expect, it } from "vitest";

import {
  buildManagementSections,
  buildTeamSections,
} from "@/lib/dashboard/team-sections";
import type { AppMessages } from "@/lib/i18n/messages";

const messages = {
  teamManagement: {
    sites: { title: "Sites" },
    notifications: { title: "Notifications" },
    publicLinks: { title: "Public links" },
  },
  managementNav: {
    sites: "Site management",
    scheduledTasks: "Scheduled tasks",
    requestObservation: "Request observation",
    systemPerformance: "System performance",
    systemSettings: "System settings",
  },
} as AppMessages;

describe("dashboard team section builders", () => {
  it("returns only the sites overview for members without manage access", () => {
    expect(buildTeamSections("en", messages, false)).toEqual([
      { key: "sites", label: "Sites", href: "/en/app" },
    ]);
  });

  it("returns workspace sections in navigation order for managers", () => {
    expect(buildTeamSections("zh", messages, true)).toEqual([
      { key: "sites", label: "Sites", href: "/zh/app" },
      {
        key: "notifications",
        label: "Notifications",
        href: "/zh/app/notifications",
      },
      {
        key: "public-links",
        label: "Public links",
        href: "/zh/app/public-links",
      },
      {
        key: "site-management",
        label: "Site management",
        href: "/zh/app/sites",
      },
    ]);
  });

  it("returns management sections in navigation order", () => {
    expect(buildManagementSections("en", messages)).toEqual([
      {
        key: "scheduled-tasks",
        label: "Scheduled tasks",
        href: "/en/app/manage/scheduled-tasks",
      },
      {
        key: "request-observation",
        label: "Request observation",
        href: "/en/app/manage/request-observation",
      },
      {
        key: "system-performance",
        label: "System performance",
        href: "/en/app/manage/system-performance",
      },
      {
        key: "system-settings",
        label: "System settings",
        href: "/en/app/manage/system-settings",
      },
    ]);
  });
});
