import { PageHeading } from "@insightflare/ui/page-heading";

import { TechnologyCrossTabCard } from "@/components/dashboard/devices/technology-cross-tab-card";
import { TechnologyShareCard } from "@/components/dashboard/devices/technology-share-card";
import { useDashboardQuery } from "@/components/dashboard/site-pages/common/use-dashboard-query";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

interface DevicesClientPageProps {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
}

/** The visitors' devices, systems, browsers and screens. */
export function DevicesClientPage({
  locale,
  messages,
  siteId,
}: DevicesClientPageProps) {
  const { filters, window } = useDashboardQuery() as {
    filters: FilterDocument;
    window: TimeWindow;
  };

  return (
    <div className="space-y-6">
      <PageHeading title={messages.navigation.devices} />
      <TechnologyShareCard
        locale={locale}
        messages={messages}
        siteId={siteId}
        window={window}
        filters={filters}
      />
      <TechnologyCrossTabCard
        locale={locale}
        messages={messages}
        siteId={siteId}
        window={window}
        filters={filters}
      />
    </div>
  );
}
