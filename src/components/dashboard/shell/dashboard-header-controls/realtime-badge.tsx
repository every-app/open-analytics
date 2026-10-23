import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@insightflare/ui/tooltip";

import {
  RealtimeStatusDot,
  realtimeStatusText,
} from "@/components/dashboard/realtime/realtime-status-indicator";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import type {
  RealtimeChannelState,
  RealtimeConnectionState,
} from "@/lib/realtime/types";
import Link from "@/lib/router";
export const selectRealtimeHeaderState = (state: RealtimeChannelState) => ({
  activeNow: state.activeNow,
  status: state.status,
  hasConnected: state.hasConnected,
});
export type RealtimeHeaderState = ReturnType<typeof selectRealtimeHeaderState>;
export const areRealtimeHeaderStatesEqual = (
  left: RealtimeHeaderState,
  right: RealtimeHeaderState,
) =>
  left.activeNow === right.activeNow &&
  left.status === right.status &&
  left.hasConnected === right.hasConnected;
/** The live count in the header, and the way to Real-time. */
export function RealtimeActiveBadge({
  activeNow,
  status,
  showValue,
  label,
  href,
  messages,
}: {
  activeNow: number;
  status: RealtimeConnectionState;
  showValue: boolean;
  label: string;
  href: string;
  messages: AppMessages;
}) {
  const statusText = realtimeStatusText(messages, status);
  const valueText = showValue ? String(activeNow) : "--";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-xs transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <RealtimeStatusDot status={status} />
          <span className="tabular-nums">
            {formatI18nTemplate(messages.realtime.liveCount, {
              count: showValue ? activeNow : "–",
            })}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{`${label}: ${valueText} · ${statusText}`}</TooltipContent>
    </Tooltip>
  );
}
