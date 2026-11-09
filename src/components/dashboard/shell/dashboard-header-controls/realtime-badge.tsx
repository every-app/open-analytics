import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@insightflare/ui/tooltip";

import {
  RealtimeStatusDot,
  realtimeStatusText,
} from "@/components/dashboard/realtime/realtime-status-indicator";
import { useRealtimeChannelSelector } from "@/hooks/use-realtime-channel";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import type { RealtimeChannelState } from "@/lib/realtime/types";
import Link from "@/lib/router";

const selectRealtimeHeaderState = (state: RealtimeChannelState) => ({
  activeNow: state.activeNow,
  status: state.status,
  hasConnected: state.hasConnected,
});
type RealtimeHeaderState = ReturnType<typeof selectRealtimeHeaderState>;
const areRealtimeHeaderStatesEqual = (
  left: RealtimeHeaderState,
  right: RealtimeHeaderState,
) =>
  left.activeNow === right.activeNow &&
  left.status === right.status &&
  left.hasConnected === right.hasConnected;

/** A site's live count in the header, and the way to its Real-time page. */
export function RealtimeActiveBadge({
  siteId,
  href,
  messages,
}: {
  siteId: string;
  href: string;
  messages: AppMessages;
}) {
  const { activeNow, status, hasConnected } = useRealtimeChannelSelector(
    siteId,
    selectRealtimeHeaderState,
    areRealtimeHeaderStatesEqual,
  );
  const statusText = realtimeStatusText(messages, status);
  const valueText = hasConnected ? String(activeNow) : "--";
  const count = hasConnected ? activeNow : "–";
  const liveCount = formatI18nTemplate(messages.realtime.liveCount, { count });

  // Where the header is narrow, the badge shows the count alone.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={liveCount}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-sm font-medium whitespace-nowrap text-foreground tabular-nums shadow-xs transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 lg:gap-2 lg:px-3"
        >
          <RealtimeStatusDot status={status} />
          <span className="lg:hidden">{count}</span>
          <span className="hidden lg:inline">{liveCount}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{`${messages.realtime.activeNow}: ${valueText} · ${statusText}`}</TooltipContent>
    </Tooltip>
  );
}
