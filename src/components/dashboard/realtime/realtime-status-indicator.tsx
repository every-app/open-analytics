import { AutoTransition } from "@insightflare/ui/auto-transition";

import type { AppMessages } from "@/lib/i18n/messages";
import type { RealtimeConnectionState } from "@/lib/realtime/types";

export function realtimeStatusText(
  messages: AppMessages,
  status: RealtimeConnectionState,
): string {
  if (status === "connected") return messages.realtime.connected;
  if (status === "connecting") return messages.realtime.connecting;
  if (status === "disconnected") return messages.realtime.reconnecting;
  return messages.realtime.failed;
}

export function RealtimeStatusDot({
  status,
}: {
  status: RealtimeConnectionState;
}) {
  return (
    <AutoTransition
      type="scale"
      duration={0.14}
      initial={false}
      className="relative inline-flex size-4 items-center justify-center"
    >
      {status === "connected" ? (
        <span
          key="connected"
          className="relative inline-flex size-4 items-center justify-center"
        >
          <span className="absolute inline-flex size-3 rounded-full bg-success/70 animate-ping" />
          <span className="inline-flex size-2 rounded-full bg-success" />
        </span>
      ) : status === "connecting" ? (
        <span
          key="connecting"
          className="relative inline-flex size-4 items-center justify-center"
        >
          <span className="inline-flex size-2 rounded-full bg-muted-foreground animate-pulse" />
        </span>
      ) : status === "disconnected" ? (
        <span
          key="disconnected"
          className="relative inline-flex size-4 items-center justify-center"
        >
          <span className="absolute inline-flex size-3 rounded-full bg-warning/70 animate-ping" />
          <span className="inline-flex size-2 rounded-full bg-warning" />
        </span>
      ) : (
        <span
          key="failed"
          className="relative inline-flex size-4 items-center justify-center"
        >
          <span className="absolute inline-flex size-3 rounded-full bg-destructive/70 animate-ping" />
          <span className="inline-flex size-2 rounded-full bg-destructive" />
        </span>
      )}
    </AutoTransition>
  );
}
