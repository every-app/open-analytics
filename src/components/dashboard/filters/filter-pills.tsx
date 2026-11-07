import { useMemo } from "react";
import { Button } from "@insightflare/ui/button";
import { XIcon } from "lucide-react";

import {
  useApplyDashboardFilters,
  useClearDashboardFilters,
} from "@/components/dashboard/filters/use-dashboard-filters";
import { useDashboardQueryControls } from "@/components/dashboard/shell/dashboard-query-provider";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import { cn } from "@/lib/utils";

import { filterPills } from "./filter-pill-model";

/**
 * The page's active filters, one removable pill each, and Clear for all of
 * them. Nothing while the page is unfiltered.
 */
export function FilterPills({
  locale,
  messages,
  className,
}: {
  locale: Locale;
  messages: AppMessages;
  className?: string;
}) {
  const { filters } = useDashboardQueryControls();
  const applyFilters = useApplyDashboardFilters();
  const clearFilters = useClearDashboardFilters();
  const pills = useMemo(
    () => filterPills(filters, messages, locale),
    [filters, locale, messages],
  );
  if (pills.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={messages.filterPills.label}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-primary/40 bg-primary/10 py-0.5 pr-0.5 pl-2.5 text-xs font-medium text-primary"
        >
          <span className="truncate">{pill.label}</span>
          <button
            type="button"
            className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-primary/80 hover:bg-primary/15 hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={formatI18nTemplate(messages.filterPills.remove, {
              filter: pill.label,
            })}
            onClick={() => applyFilters(pill.without)}
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs text-muted-foreground"
        onClick={clearFilters}
      >
        {messages.filters.clear}
      </Button>
    </div>
  );
}
