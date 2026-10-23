import { useCallback, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@insightflare/ui/tabs";

import { ShareTrendCard } from "@/components/dashboard/sharing/share-trend-card";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { BrowserTrendSeries } from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import {
  isTechnologyDimension,
  TECHNOLOGY_DIMENSIONS,
  TECHNOLOGY_TREND_FETCHERS,
  TechnologyDimension,
  technologyDimensionLabel,
  technologyValueIcon,
  technologyValueLabel,
} from "./technology-dimensions";

/** Each device, OS, browser, engine or screen size's share of visitors over time. */
export function TechnologyShareCard({
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
  const [dimension, setDimension] = useState(TechnologyDimension.Device);
  const formatSeriesLabel = useCallback(
    (series: BrowserTrendSeries) =>
      technologyValueLabel(dimension, series.label, messages),
    [dimension, messages],
  );
  const resolveSeriesIcon = useCallback(
    (series: BrowserTrendSeries) =>
      technologyValueIcon(dimension, series.label, messages),
    [dimension, messages],
  );

  return (
    <ShareTrendCard
      locale={locale}
      messages={messages}
      siteId={siteId}
      window={window}
      filters={filters}
      queryKey={["technology", dimension]}
      title={messages.devices.shareTitle}
      fetchTrend={TECHNOLOGY_TREND_FETCHERS[dimension]}
      otherLabel={messages.devices.otherLabel}
      formatSeriesLabel={formatSeriesLabel}
      resolveSeriesIcon={resolveSeriesIcon}
      headerBelow={
        <Tabs
          value={dimension}
          onValueChange={(next) => {
            if (isTechnologyDimension(next)) setDimension(next);
          }}
        >
          <TabsList className="max-w-full overflow-x-auto">
            {TECHNOLOGY_DIMENSIONS.map((item) => (
              <TabsTrigger key={item} value={item}>
                {technologyDimensionLabel(item, messages)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
    />
  );
}
