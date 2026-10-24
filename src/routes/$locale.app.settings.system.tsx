import { Tabs, TabsList, TabsTrigger } from "@insightflare/ui/tabs";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { RequestObservationClient } from "@/components/dashboard/admin/request-observation-client";
import { ScheduledTasksClient } from "@/components/dashboard/admin/scheduled-tasks-client";
import { SystemPerformanceClient } from "@/components/dashboard/admin/system-performance-client";
import { DataRetentionSettings } from "@/components/dashboard/system-settings/data-retention-settings";
import { EmailSenderStatus } from "@/components/dashboard/system-settings/email-sender-status";
import { SettingsPage } from "@/components/settings/settings-section";
import {
  isSystemHealthTab,
  SYSTEM_HEALTH_TABS,
  type SystemHealthTab,
} from "@/lib/dashboard/paths";
import {
  loadScheduledTasksInitialData,
  loadSystemPerformanceInitialData,
  loadSystemSettingsInitialData,
} from "@/lib/dashboard/route-data";
import { dashboardPageTitle } from "@/lib/page-title";

// Each tab reads only its own data on the server.
async function loadTab(tab: SystemHealthTab) {
  switch (tab) {
    case "tasks":
      return { tab, tasks: await loadScheduledTasksInitialData() };
    case "blocked":
      return { tab };
    case "ingestion":
      return { tab, ingestion: await loadSystemPerformanceInitialData() };
    case "data":
      return { tab, settings: await loadSystemSettingsInitialData() };
  }
}

export const Route = createFileRoute("/$locale/app/settings/system")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: SystemHealthTab } =>
    isSystemHealthTab(search.tab) ? { tab: search.tab } : {},
  beforeLoad: ({ context }) => {
    if (context.teamContext.user.systemRole !== "admin") throw notFound();
  },
  loaderDeps: ({ search }) => ({ tab: search.tab ?? "tasks" }),
  loader: ({ deps }) => loadTab(deps.tab),
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.settingsNav.system,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { locale, messages, teamContext } = Route.useRouteContext();
  const data = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const copy = messages.systemHealth;

  return (
    <SettingsPage title={messages.settingsNav.system} width="wide">
      <Tabs
        value={data.tab}
        onValueChange={(value) => {
          if (isSystemHealthTab(value))
            void navigate({ search: { tab: value } });
        }}
      >
        {/* Four tabs overflow a phone; the strip wraps and grows instead. */}
        <TabsList
          className="max-w-full flex-wrap group-data-horizontal/tabs:h-auto group-data-horizontal/tabs:min-h-9"
          aria-label={messages.settingsNav.system}
        >
          {SYSTEM_HEALTH_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {copy.tabs[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {data.tab === "tasks" ? (
        <ScheduledTasksClient
          locale={locale}
          messages={messages}
          initialData={data.tasks}
        />
      ) : data.tab === "blocked" ? (
        <RequestObservationClient
          locale={locale}
          messages={messages}
          sites={teamContext.sites}
        />
      ) : data.tab === "ingestion" ? (
        <SystemPerformanceClient
          locale={locale}
          messages={messages}
          initialData={data.ingestion}
        />
      ) : (
        <div className="max-w-3xl space-y-10">
          <DataRetentionSettings
            messages={messages}
            initialData={data.settings}
          />
          <EmailSenderStatus messages={messages} initialData={data.settings} />
        </div>
      )}
    </SettingsPage>
  );
}
