import type { ReactNode } from "react";
import { Button } from "@insightflare/ui/button";
import { RotateCwIcon, XIcon } from "lucide-react";

import { useClearDashboardFilters } from "@/components/dashboard/filters/use-clear-dashboard-filters";
import type { AppMessages } from "@/lib/i18n/messages";

/** Filters hide every row: say so, and offer to clear them. */
export function FilteredEmptyContent({ messages }: { messages: AppMessages }) {
  const clearFilters = useClearDashboardFilters();
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <span>{messages.common.filteredEmpty}</span>
      <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
        <XIcon data-icon="inline-start" />
        {messages.common.clearFilters}
      </Button>
    </div>
  );
}

/**
 * What an empty table says: that the page's filters hide every row when the
 * table follows them and they are set, and otherwise its own reason for
 * having nothing yet.
 */
export function emptyContent(
  messages: AppMessages,
  noData: ReactNode,
  filtered: boolean,
): ReactNode {
  return filtered ? <FilteredEmptyContent messages={messages} /> : noData;
}

/** The rows failed to load: say so, and offer to try again. */
export function LoadFailedContent({
  messages,
  onRetry,
}: {
  messages: AppMessages;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <span>{messages.common.loadFailed}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RotateCwIcon data-icon="inline-start" />
        {messages.common.retry}
      </Button>
    </div>
  );
}
