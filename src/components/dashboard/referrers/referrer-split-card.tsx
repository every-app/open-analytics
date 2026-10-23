import { memo, useMemo } from "react";
import { ShareBreakdownView } from "@insightflare/product-ui/sharing";

import type { ReferrerSummaryData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

function splitItems(
  summary: ReferrerSummaryData["data"],
  messages: AppMessages,
) {
  return [
    {
      key: "direct",
      label: messages.overview.direct,
      value: summary.directViews,
      color: "var(--color-chart-1)",
    },
    {
      key: "external",
      label: messages.referrers.externalLabel,
      value: summary.externalViews,
      color: "var(--color-chart-3)",
    },
  ];
}

/** Direct visits against visits that came from another site. */
export const ReferrerSplitCard = memo(function ReferrerSplitCard({
  locale,
  messages,
  summary,
  comparisonSummary,
  comparisonLabel,
  loading,
}: {
  locale: Locale;
  messages: AppMessages;
  summary: ReferrerSummaryData["data"] | null;
  comparisonSummary: ReferrerSummaryData["data"] | null;
  comparisonLabel?: string;
  loading: boolean;
}) {
  const items = useMemo(
    () => (summary ? splitItems(summary, messages) : []),
    [messages, summary],
  );
  const comparisonItems = useMemo(
    () =>
      comparisonSummary ? splitItems(comparisonSummary, messages) : undefined,
    [comparisonSummary, messages],
  );

  return (
    <ShareBreakdownView
      title={messages.referrers.splitTitle}
      items={items}
      comparisonItems={comparisonItems}
      comparisonLabel={comparisonLabel}
      maxItems={2}
      locale={locale}
      loading={loading && !summary}
      valueLabel={messages.common.views}
      emptyLabel={messages.common.noData}
    />
  );
});
