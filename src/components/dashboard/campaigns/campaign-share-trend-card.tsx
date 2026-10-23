import { memo } from "react";

import { withCampaignTag } from "@/components/dashboard/campaigns/campaign-utils";
import {
  ShareTrendCard,
  type ShareTrendFetcher,
} from "@/components/dashboard/sharing/share-trend-card";
import { fetchUtmTrend } from "@/lib/dashboard/client/data/index";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

const fetchSourceTrend: ShareTrendFetcher = (
  siteId,
  window,
  filters,
  options,
) =>
  fetchUtmTrend(
    siteId,
    window,
    "source",
    withCampaignTag(filters, "source"),
    options,
  );

/** Each UTM source's share of the tagged visits over time. */
export const CampaignShareTrendCard = memo(function CampaignShareTrendCard({
  locale,
  messages,
  siteId,
  window,
  filters,
}: {
  locale: Locale;
  messages: AppMessages;
  siteId: string;
  window: TimeWindow;
  filters: FilterDocument;
}) {
  return (
    <ShareTrendCard
      locale={locale}
      messages={messages}
      siteId={siteId}
      window={window}
      filters={filters}
      queryKey={["campaign", "source"]}
      title={messages.campaigns.tabSource}
      fetchTrend={fetchSourceTrend}
      otherLabel={messages.browsers.otherLabel}
    />
  );
});
