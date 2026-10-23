import { useEffect, useMemo, useRef, useState } from "react";
import { type DateRange } from "react-day-picker";
import { Button } from "@insightflare/ui/button";
import { Calendar } from "@insightflare/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@insightflare/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@insightflare/ui/dropdown-menu";
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { useDashboardQueryControls } from "@/components/dashboard/shell/dashboard-query-provider";
import { intlLocale } from "@/lib/dashboard/format";
import {
  type CustomTimeRange,
  type DashboardInterval,
  normalizeCustomDateRange,
  type RangePreset,
} from "@/lib/dashboard/query-state";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";

import {
  formatDateSpan,
  INTERVAL_ORDER,
  intervalLabel,
  RANGE_PRESET_OPTIONS,
  rangeLabel,
  ROLLING_RANGE_PRESETS,
  shiftTimeWindow,
  toDateRange,
} from "./range";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The one date control: a button naming the range, opening the presets,
 * Custom range and a step to the previous or next period. The interval
 * follows the range; a secondary menu inside picks another.
 */
export function DateControl({
  locale,
  messages,
  siteId,
}: {
  locale: Locale;
  messages: AppMessages;
  siteId?: string;
}) {
  const {
    range,
    window,
    customRange,
    setRange,
    setCustomRange,
    setInterval,
    allowedIntervals,
    timeZone,
    maxRangeDays,
  } = useDashboardQueryControls();
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  // Custom range opens its dialog once the menu has closed and let go of focus.
  const openCustomAfterCloseRef = useRef(false);
  const [periodForwardStack, setPeriodForwardStack] = useState<
    CustomTimeRange[]
  >([]);
  const selectedDateRange = useMemo(
    () => toDateRange(customRange?.from, customRange?.to, timeZone),
    [customRange?.from, customRange?.to, timeZone],
  );
  const [pendingCustomRange, setPendingCustomRange] = useState<
    DateRange | undefined
  >(selectedDateRange);
  const presets = RANGE_PRESET_OPTIONS.filter(
    (preset) => !(maxRangeDays && maxRangeDays <= 90 && preset === "12m"),
  );
  const intervals = INTERVAL_ORDER.filter((value) =>
    allowedIntervals.includes(value),
  );
  const previousPeriodRange = shiftTimeWindow(
    window.from,
    window.to,
    "previous",
  );
  const canShiftToNextPeriod = !ROLLING_RANGE_PRESETS.has(range);
  const nextPeriodRange = canShiftToNextPeriod
    ? (periodForwardStack[0] ?? shiftTimeWindow(window.from, window.to, "next"))
    : null;
  const pendingNormalized = normalizeCustomDateRange(
    pendingCustomRange,
    timeZone,
  );
  const customSelectionText = useMemo(() => {
    if (pendingCustomRange?.from && !pendingCustomRange.to) {
      return messages.dashboardHeader.customPendingEnd;
    }
    if (!pendingNormalized) return messages.dashboardHeader.customHint;
    const formatter = new Intl.DateTimeFormat(intlLocale(locale), {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    });
    return formatI18nTemplate(messages.dashboardHeader.customSelectionSummary, {
      from: formatter.format(new Date(pendingNormalized.from)),
      to: formatter.format(new Date(pendingNormalized.to)),
      days: Math.max(
        1,
        Math.round((pendingNormalized.to - pendingNormalized.from) / DAY_MS),
      ),
    });
  }, [
    locale,
    messages.dashboardHeader.customHint,
    messages.dashboardHeader.customPendingEnd,
    messages.dashboardHeader.customSelectionSummary,
    pendingCustomRange?.from,
    pendingCustomRange?.to,
    pendingNormalized,
    timeZone,
  ]);

  useEffect(() => {
    setPeriodForwardStack([]);
  }, [siteId]);

  const selectPreset = (value: RangePreset) => {
    setPeriodForwardStack([]);
    setRange(value);
  };
  const shiftToPreviousPeriod = () => {
    if (!previousPeriodRange) return;
    setPeriodForwardStack((current) => [
      { from: window.from, to: window.to },
      ...current,
    ]);
    setCustomRange(previousPeriodRange);
  };
  const shiftToNextPeriod = () => {
    if (!nextPeriodRange) return;
    setPeriodForwardStack((current) => current.slice(1));
    setCustomRange(nextPeriodRange);
  };
  const rangeTitle =
    range === "custom"
      ? formatDateSpan(locale, timeZone, window.from, window.to)
      : rangeLabel(messages, range);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="max-w-full justify-between">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CalendarIcon
                data-icon="inline-start"
                className="text-muted-foreground"
              />
              <span className="truncate">{rangeTitle}</span>
            </span>
            <ChevronDownIcon
              data-icon="inline-end"
              className="text-muted-foreground"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64"
          onCloseAutoFocus={(event) => {
            if (!openCustomAfterCloseRef.current) return;
            openCustomAfterCloseRef.current = false;
            event.preventDefault();
            setPendingCustomRange(selectedDateRange);
            setCustomDialogOpen(true);
          }}
        >
          <div className="flex items-center gap-1 p-1">
            <DropdownMenuItem
              className="shrink-0"
              disabled={!previousPeriodRange}
              aria-label={messages.dashboardHeader.previousPeriod}
              title={messages.dashboardHeader.previousPeriod}
              onSelect={(event) => {
                event.preventDefault();
                shiftToPreviousPeriod();
              }}
            >
              <ChevronLeftIcon />
            </DropdownMenuItem>
            <span className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground tabular-nums">
              {formatDateSpan(locale, timeZone, window.from, window.to)}
            </span>
            <DropdownMenuItem
              className="shrink-0"
              disabled={!nextPeriodRange}
              aria-label={messages.dashboardHeader.nextPeriod}
              title={messages.dashboardHeader.nextPeriod}
              onSelect={(event) => {
                event.preventDefault();
                shiftToNextPeriod();
              }}
            >
              <ChevronRightIcon />
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={range}
            onValueChange={(value) => selectPreset(value as RangePreset)}
          >
            {presets.map((preset) => (
              <DropdownMenuRadioItem key={preset} value={preset}>
                {rangeLabel(messages, preset)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuRadioGroup value={range}>
            <DropdownMenuRadioItem
              value="custom"
              onSelect={() => {
                openCustomAfterCloseRef.current = true;
              }}
            >
              {messages.ranges.custom}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span className="flex-1">
                {messages.dashboardHeader.interval}
              </span>
              <span className="text-muted-foreground">
                {intervalLabel(messages, window.interval)}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-40">
              <DropdownMenuLabel>
                {messages.dashboardHeader.interval}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={window.interval}
                onValueChange={(value) =>
                  setInterval(value as DashboardInterval)
                }
              >
                {intervals.map((interval) => (
                  <DropdownMenuRadioItem key={interval} value={interval}>
                    {intervalLabel(messages, interval)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="w-fit">
          <DialogHeader>
            <DialogTitle icon={CalendarIcon}>
              {messages.ranges.custom}
            </DialogTitle>
            <DialogDescription>{customSelectionText}</DialogDescription>
          </DialogHeader>
          <Calendar
            mode="range"
            captionLayout="dropdown"
            numberOfMonths={2}
            selected={pendingCustomRange}
            onSelect={setPendingCustomRange}
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!pendingNormalized) return;
                setPeriodForwardStack([]);
                setCustomRange(pendingNormalized);
                setCustomDialogOpen(false);
              }}
              disabled={!pendingNormalized}
            >
              <CheckIcon data-icon="inline-start" />
              <span>{messages.dashboardHeader.customApply}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
