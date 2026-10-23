import { memo, useCallback, useMemo } from "react";

import {
  CAMPAIGN_TABS,
  type CampaignBreakdownRow,
  type CampaignSortKey,
  type CampaignTab,
  campaignTabLabel,
} from "@/components/dashboard/campaigns/campaign-utils";
import { InfoTooltip } from "@/components/dashboard/common/info-tooltip";
import {
  TabbedDataTableCard,
  type TabbedDataTableColumn,
  type TabbedDataTableLoader,
  type TabbedDataTableRowAdapter,
  type TabbedDataTableTab,
} from "@/components/dashboard/common/tabbed-data-table-card";
import {
  ComparisonMetricToggle,
  type ComparisonTableMetric,
  createComparisonTableColumns,
} from "@/components/dashboard/comparison/comparison-table";
import type { DashboardComparisonQuery } from "@/lib/dashboard/comparison-query";
import { numberFormat } from "@/lib/dashboard/format";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import { cn } from "@/lib/utils";
interface CampaignBreakdownCardProps {
  locale: Locale;
  messages: AppMessages;
  loader: TabbedDataTableLoader<
    CampaignTab,
    CampaignBreakdownRow,
    CampaignSortKey
  >;
  comparisonQuery: DashboardComparisonQuery | null;
  comparisonLabel: string;
  comparisonMetric: ComparisonTableMetric;
  onComparisonMetricChange: (metric: ComparisonTableMetric) => void;
  requestKey: string;
  /** The page's filters are set. */
  filtered: boolean;
}
/** No visit in the period carried UTM tags; the tooltip shows what a tagged link looks like. */
export function NoTaggedVisits({ messages }: { messages: AppMessages }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {messages.campaigns.noTaggedTraffic}
      <InfoTooltip label={messages.campaigns.taggedLinkHint}>
        {messages.campaigns.taggedLinkHint}{" "}
        <code className="font-mono">?utm_source=newsletter</code>
      </InfoTooltip>
    </span>
  );
}
export const CampaignBreakdownCard = memo(function CampaignBreakdownCard({
  locale,
  messages,
  loader,
  comparisonQuery,
  comparisonLabel,
  comparisonMetric,
  onComparisonMetricChange,
  requestKey,
  filtered,
}: CampaignBreakdownCardProps) {
  const tabs = useMemo(
    () =>
      CAMPAIGN_TABS.map((tab) => ({
        value: tab,
        label: campaignTabLabel(tab, messages),
        columnLabel: campaignTabLabel(tab, messages),
      })) as [
        TabbedDataTableTab<CampaignTab>,
        ...TabbedDataTableTab<CampaignTab>[],
      ],
    [messages],
  );
  const comparisonColumns = useMemo(
    () =>
      createComparisonTableColumns<CampaignBreakdownRow, CampaignTab>({
        metric: comparisonMetric,
        comparisonLabel,
        locale,
        messages,
        getCurrent: (row) => row[comparisonMetric] ?? 0,
        getReference: (row) => row.reference?.[comparisonMetric],
        getChange: (row) => row.change?.[comparisonMetric],
      }) as readonly TabbedDataTableColumn<
        CampaignBreakdownRow,
        CampaignSortKey,
        CampaignTab
      >[],
    [comparisonLabel, comparisonMetric, locale, messages],
  );
  const currentColumns = useMemo<
    readonly TabbedDataTableColumn<
      CampaignBreakdownRow,
      CampaignSortKey,
      CampaignTab
    >[]
  >(
    () => [
      {
        key: "views" as const,
        label: messages.common.views,
        getValue: (row: CampaignBreakdownRow) => row.views,
        format: (value: number) => numberFormat(locale, value),
      },
      {
        key: "sessions" as const,
        label: messages.common.sessions,
        getValue: (row: CampaignBreakdownRow) => row.sessions,
        format: (value: number) => numberFormat(locale, value),
      },
    ],
    [locale, messages.common.sessions, messages.common.views],
  );
  const rowAdapter = useMemo<
    TabbedDataTableRowAdapter<
      CampaignBreakdownRow,
      CampaignTab,
      CampaignSortKey
    >
  >(
    () => ({
      renderLabel: (row) => (
        <span className={cn("break-words", row.mono && "font-mono")}>
          {row.label}
        </span>
      ),
      getSearchText: (row) => row.label,
      getExportLabel: (row) => row.label,
      getClassName: () => "hover:brightness-95",
    }),
    [],
  );
  const labelColumnLabel = useCallback(
    (tab: TabbedDataTableTab<CampaignTab>) => tab.columnLabel ?? tab.label,
    [],
  );
  const search = useMemo(
    () => ({
      actionLabel: messages.common.search,
      placeholder: (tab: TabbedDataTableTab<CampaignTab>) =>
        formatI18nTemplate(messages.overview.searchInTab, {
          tab: tab.label,
        }),
    }),
    [messages.common.search, messages.overview.searchInTab],
  );
  const exportConfig = useMemo(
    () => ({
      labels: messages.common.tableExport,
    }),
    [messages.common.tableExport],
  );
  return (
    <TabbedDataTableCard<CampaignTab, CampaignBreakdownRow, CampaignSortKey>
      messages={messages}
      filtered={filtered}
      tabs={tabs}
      loader={loader}
      requestKey={`${requestKey}:${comparisonMetric}`}
      defaultSort={
        comparisonQuery ? { key: "current", direction: "desc" } : undefined
      }
      columns={comparisonQuery ? comparisonColumns : currentColumns}
      rowAdapter={rowAdapter}
      labelColumnLabel={labelColumnLabel}
      sortActionLabel={(label) =>
        formatI18nTemplate(messages.common.sortBy, { label })
      }
      loadingLabel={messages.common.loading}
      emptyLabel={messages.common.noData}
      className="min-h-[420px]"
      search={search}
      export={exportConfig}
      headerRight={
        comparisonQuery ? (
          <ComparisonMetricToggle
            metric={comparisonMetric}
            metrics={["views", "sessions"]}
            messages={messages}
            onMetricChange={onComparisonMetricChange}
          />
        ) : null
      }
    />
  );
});
