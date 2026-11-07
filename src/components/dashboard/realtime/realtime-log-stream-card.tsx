import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AutoResizer } from "@insightflare/ui/auto-resizer";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@insightflare/ui/card";
import { Spinner } from "@insightflare/ui/spinner";
import { ActivityIcon } from "lucide-react";
import { AnimatePresence, useReducedMotion } from "motion/react";

import { useDashboardQueryControls } from "@/components/dashboard/shell/dashboard-query-provider";
import type { RealtimeEvent } from "@/lib/realtime/types";

import {
  RealtimeLogEventDetailsDrawer,
  RealtimeLogStreamItem,
} from "./log-stream-items";
import {
  INITIAL_VISIBLE_EVENTS,
  LOAD_MORE_STEP,
  LogStreamScrollbar,
  NESTED_DRAWER_EXIT_DURATION_MS,
  type RealtimeLogStreamCardProps,
  type RealtimeNestedEventDetail,
} from "./model";
export const RealtimeLogStreamCard = memo(function RealtimeLogStreamCard({
  locale,
  messages,
  hasConnected,
  events,
}: RealtimeLogStreamCardProps) {
  const { timeZone } = useDashboardQueryControls();
  const reduceLogItemMotion = useReducedMotion() ?? false;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<RealtimeEvent | null>(
    null,
  );
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [nestedEventDetails, setNestedEventDetails] = useState<
    RealtimeNestedEventDetail[]
  >([]);
  const nestedEventDetailKeyRef = useRef(0);
  const nestedEventDetailCloseTimersRef = useRef(new Map<string, number>());
  const nestedEventDetailsClearTimerRef = useRef<number | null>(null);
  const selectedEventClearTimerRef = useRef<number | null>(null);

  const visibleEvents = useMemo(
    () => events.slice(0, visibleCount),
    [events, visibleCount],
  );
  const hasMoreEvents = visibleCount < events.length;
  const isInitialLoading = !hasConnected && visibleEvents.length === 0;
  const logStateKey = isInitialLoading
    ? "loading"
    : visibleEvents.length === 0
      ? "empty"
      : "events";

  useEffect(() => {
    setVisibleCount((previous) => {
      if (events.length <= 0) return INITIAL_VISIBLE_EVENTS;
      return Math.min(
        events.length,
        Math.max(previous, INITIAL_VISIBLE_EVENTS),
      );
    });
  }, [events.length]);

  const loadMoreEvents = useCallback(() => {
    if (!hasMoreEvents) return;
    setVisibleCount((previous) =>
      Math.min(events.length, previous + LOAD_MORE_STEP),
    );
  }, [events.length, hasMoreEvents]);
  const clearSelectedEventTimer = useCallback(() => {
    if (selectedEventClearTimerRef.current === null) return;
    window.clearTimeout(selectedEventClearTimerRef.current);
    selectedEventClearTimerRef.current = null;
  }, []);
  const handleEventSelect = useCallback(
    (event: RealtimeEvent) => {
      clearSelectedEventTimer();
      setSelectedEvent(event);
      setIsEventDetailsOpen(true);
    },
    [clearSelectedEventTimer],
  );
  const openNestedEventDetail = useCallback((event: RealtimeEvent) => {
    nestedEventDetailKeyRef.current += 1;
    setNestedEventDetails((current) => [
      ...current,
      {
        event,
        open: true,
        stackKey: `event:${event.id}:${nestedEventDetailKeyRef.current}`,
      },
    ]);
  }, []);
  const closeNestedEventDetail = useCallback((stackKey: string) => {
    setNestedEventDetails((current) => {
      const index = current.findIndex((item) => item.stackKey === stackKey);
      if (index < 0) return current;

      return current.map((item, itemIndex) =>
        itemIndex >= index ? { ...item, open: false } : item,
      );
    });

    if (nestedEventDetailCloseTimersRef.current.has(stackKey)) return;
    const timerId = window.setTimeout(() => {
      nestedEventDetailCloseTimersRef.current.delete(stackKey);
      setNestedEventDetails((current) => {
        const index = current.findIndex((item) => item.stackKey === stackKey);
        return index < 0 ? current : current.slice(0, index);
      });
    }, NESTED_DRAWER_EXIT_DURATION_MS);
    nestedEventDetailCloseTimersRef.current.set(stackKey, timerId);
  }, []);
  const handleEventDetailsOpenChange = useCallback(
    (open: boolean) => {
      clearSelectedEventTimer();
      setIsEventDetailsOpen(open);
      if (!open) {
        selectedEventClearTimerRef.current = window.setTimeout(() => {
          selectedEventClearTimerRef.current = null;
          setSelectedEvent(null);
        }, NESTED_DRAWER_EXIT_DURATION_MS);
        setNestedEventDetails((current) =>
          current.map((item) => ({ ...item, open: false })),
        );
        if (nestedEventDetailsClearTimerRef.current !== null) {
          window.clearTimeout(nestedEventDetailsClearTimerRef.current);
        }
        nestedEventDetailsClearTimerRef.current = window.setTimeout(() => {
          nestedEventDetailsClearTimerRef.current = null;
          setNestedEventDetails([]);
        }, NESTED_DRAWER_EXIT_DURATION_MS);
      }
    },
    [clearSelectedEventTimer],
  );

  useEffect(() => {
    return () => {
      clearSelectedEventTimer();
      nestedEventDetailCloseTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      nestedEventDetailCloseTimersRef.current.clear();
      if (nestedEventDetailsClearTimerRef.current !== null) {
        window.clearTimeout(nestedEventDetailsClearTimerRef.current);
      }
    };
  }, [clearSelectedEventTimer]);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ActivityIcon className="size-4" />
            {messages.realtime.recentEvents}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AutoResizer initial duration={0.22}>
            <AutoTransition
              initial={false}
              duration={0.2}
              transitionKey={logStateKey}
            >
              {isInitialLoading ? (
                <div className="flex min-h-56 items-center justify-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-3.5" />
                    {messages.common.loading}
                  </span>
                </div>
              ) : visibleEvents.length === 0 ? (
                <div className="flex min-h-56 items-center justify-center text-muted-foreground">
                  {messages.common.noData}
                </div>
              ) : (
                <LogStreamScrollbar
                  className="max-h-[30rem]"
                  maskClassName="from-card via-card/80 to-transparent"
                  syncKey={`${visibleEvents.length}:${events.length}`}
                  onReachEnd={hasMoreEvents ? loadMoreEvents : null}
                >
                  <div className="p-1">
                    <ul className="m-0 list-none space-y-2 p-0">
                      <AnimatePresence initial={false} mode="popLayout">
                        {visibleEvents.map((event) => (
                          <RealtimeLogStreamItem
                            key={event.id}
                            event={event}
                            locale={locale}
                            messages={messages}
                            timeZone={timeZone}
                            onSelect={handleEventSelect}
                            reduceMotion={reduceLogItemMotion}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </div>
                </LogStreamScrollbar>
              )}
            </AutoTransition>
          </AutoResizer>
        </CardContent>
      </Card>
      <RealtimeLogEventDetailsDrawer
        event={selectedEvent}
        locale={locale}
        messages={messages}
        timeZone={timeZone}
        events={events}
        onSelect={openNestedEventDetail}
        open={isEventDetailsOpen}
        onOpenChange={handleEventDetailsOpenChange}
      />
      {nestedEventDetails.map((nestedDetail) => (
        <RealtimeLogEventDetailsDrawer
          key={nestedDetail.stackKey}
          event={nestedDetail.event}
          locale={locale}
          messages={messages}
          timeZone={timeZone}
          events={events}
          onSelect={openNestedEventDetail}
          open={nestedDetail.open}
          onOpenChange={(open) => {
            if (!open) closeNestedEventDetail(nestedDetail.stackKey);
          }}
        />
      ))}
    </>
  );
});
