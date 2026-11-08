import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useReportingTimeZone } from "@/components/time-zone-provider";
import { useLiveSearchParams } from "@/lib/dashboard/client/history";
import { EMPTY_DASHBOARD_FILTER_DOCUMENT } from "@/lib/dashboard/filter-state";
import {
  readDashboardQueryPreferences,
  readReportingTimeZoneFromCookie,
  writeDashboardQueryPreferences,
} from "@/lib/dashboard/query-preferences";
import {
  allowedIntervalsForRange,
  clampIntervalForRange,
  type CustomTimeRange,
  type DashboardInterval,
  type DataStart,
  DEFAULT_RANGE_PRESET,
  finestIntervalForRange,
  parseFilterDocumentFromSearchParams,
  type RangePreset,
  resolveRangePreset,
  resolveTimeWindow,
  type TimeWindow,
} from "@/lib/dashboard/query-state";
import {
  analyticsFilterRegistry,
  type FilterDocument,
  normalizeFilterDocument,
} from "@/lib/filter-contract/index";
interface DashboardQueryContextValue {
  range: RangePreset;
  window: TimeWindow;
  filters: FilterDocument;
  uiFilters: FilterDocument;
  customRange: CustomTimeRange | null;
  setRange: (range: RangePreset) => void;
  setCustomRange: (range: CustomTimeRange | null) => void;
  setInterval: (interval: DashboardInterval) => void;
  setUiFilters: (filters: FilterDocument) => void;
  clearUiFilters: () => void;
  allowedIntervals: DashboardInterval[];
  timeZone: string;
}
interface DashboardQueryProviderProps {
  children: ReactNode;
  scopeKey?: string;
  /** Where All time starts: the site's first page view, or the organization's. */
  dataStart?: DataStart;
  initialWindow?: TimeWindow;
  initialFilters?: FilterDocument;
}
const EMPTY_FILTERS = EMPTY_DASHBOARD_FILTER_DOCUMENT;
const DEFAULT_RANGE: RangePreset = DEFAULT_RANGE_PRESET;
const DashboardQueryContext = createContext<DashboardQueryContextValue | null>(
  null,
);
function normalizeFilters(
  filters: FilterDocument | undefined | null,
): FilterDocument {
  if (!filters) return EMPTY_FILTERS;
  try {
    return normalizeFilterDocument(filters, analyticsFilterRegistry);
  } catch {
    return EMPTY_FILTERS;
  }
}
function normalizeCustomRange(
  range: CustomTimeRange | undefined | null,
): CustomTimeRange | null {
  if (!range) return null;
  if (!Number.isFinite(range.from) || !Number.isFinite(range.to)) return null;
  if (range.from >= range.to) return null;
  return {
    from: Math.max(0, Math.floor(range.from)),
    to: Math.max(1, Math.floor(range.to)),
  };
}
function buildInitialState(
  timeZone: string,
  initialWindow?: TimeWindow,
  initialFilters?: FilterDocument,
) {
  const uiFilters = normalizeFilters(initialFilters ?? EMPTY_FILTERS);
  if (initialWindow) {
    return {
      range: initialWindow.preset,
      interval: initialWindow.interval,
      customRange:
        initialWindow.preset === "custom"
          ? { from: initialWindow.from, to: initialWindow.to }
          : null,
      uiFilters,
    };
  }

  if (typeof window === "undefined") {
    const initialWindow = resolveTimeWindow(DEFAULT_RANGE, Date.now(), {
      timeZone,
    });
    return {
      range: DEFAULT_RANGE as RangePreset,
      interval: initialWindow.interval as DashboardInterval,
      customRange: null as CustomTimeRange | null,
      uiFilters,
    };
  }

  const persisted = readDashboardQueryPreferences(document.cookie);
  const persistedRange = resolveRangePreset(persisted.range) as RangePreset;
  const persistedCustomRange = normalizeCustomRange(persisted.customRange);
  const persistedWindow = resolveTimeWindow(persistedRange, Date.now(), {
    customRange: persistedCustomRange ?? undefined,
    interval: persisted.interval,
    timeZone,
  });

  return {
    range: persistedRange,
    interval: persistedWindow.interval,
    customRange: persistedCustomRange,
    uiFilters,
  };
}
export function DashboardQueryProvider({
  children,
  scopeKey = "",
  dataStart,
  initialWindow,
  initialFilters,
}: DashboardQueryProviderProps) {
  const { timeZone: managedTimeZone } = useReportingTimeZone();
  const routeSearchParams = useLiveSearchParams();
  const routeSearchParamsKey = routeSearchParams.toString();
  // During the first client render after SSR, useSyncExternalStore may still
  // use its server snapshot (an empty search string) for hydration. Capture
  // the browser URL separately so the first analytics query cannot run with
  // an empty filter document and leave its unfiltered result in the cache.
  const initialRouteSearchParamsKeyRef = useRef<string | null>(null);
  if (initialRouteSearchParamsKeyRef.current === null) {
    initialRouteSearchParamsKeyRef.current =
      typeof window === "undefined"
        ? routeSearchParamsKey
        : window.location.search;
  }
  const routeQueryDocument = useMemo(
    () =>
      parseFilterDocumentFromSearchParams(
        new URLSearchParams(routeSearchParamsKey),
      ),
    [routeSearchParamsKey],
  );
  const initialRouteQueryDocument = useMemo(
    () =>
      parseFilterDocumentFromSearchParams(
        new URLSearchParams(initialRouteSearchParamsKeyRef.current ?? ""),
      ),
    [],
  );
  const initialCookieTimeZone =
    typeof document === "undefined"
      ? managedTimeZone
      : readReportingTimeZoneFromCookie(document.cookie);
  const initialWindowRef = useRef(initialWindow);
  const [timeZone, setTimeZone] = useState(
    () => initialWindowRef.current?.timeZone ?? initialCookieTimeZone,
  );
  const [initial] = useState(() =>
    buildInitialState(
      timeZone,
      initialWindowRef.current,
      initialFilters ?? initialRouteQueryDocument,
    ),
  );
  const [range, setRangeState] = useState<RangePreset>(initial.range);
  const [interval, setIntervalState] = useState<DashboardInterval>(
    initial.interval,
  );
  const [customRange, setCustomRangeState] = useState<CustomTimeRange | null>(
    initial.customRange,
  );
  const [uiFilters, setUiFiltersState] = useState<FilterDocument>(
    initial.uiFilters,
  );
  const previousScopeKeyRef = useRef(scopeKey);
  const previousRouteSearchParamsKeyRef = useRef(routeSearchParamsKey);

  useEffect(() => {
    setTimeZone(managedTimeZone);
  }, [managedTimeZone]);

  const resolvedWindow = useMemo(
    () =>
      resolveTimeWindow(range, Date.now(), {
        customRange: customRange || undefined,
        interval,
        timeZone,
        dataStart,
      }),
    [range, customRange, interval, timeZone, dataStart],
  );
  const windowState = useMemo(() => {
    const snapshot = initialWindowRef.current;
    const initialCustomRange =
      snapshot?.preset === "custom"
        ? { from: snapshot.from, to: snapshot.to }
        : null;
    // The server starts All time at the organization's first page view, so
    // its window stands only while it starts where this page's does.
    const isInitialSelection =
      snapshot &&
      range === snapshot.preset &&
      interval === snapshot.interval &&
      timeZone === snapshot.timeZone &&
      (range !== "all" || snapshot.from === resolvedWindow.from) &&
      JSON.stringify(customRange) === JSON.stringify(initialCustomRange);
    return isInitialSelection ? snapshot : resolvedWindow;
  }, [customRange, range, interval, resolvedWindow, timeZone]);

  useEffect(() => {
    const clamped = clampIntervalForRange(
      interval,
      windowState.from,
      windowState.to,
    );
    if (clamped !== interval) {
      setIntervalState(clamped);
    }
  }, [interval, windowState.from, windowState.to]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    writeDashboardQueryPreferences({
      range,
      interval: windowState.interval,
      customRange,
    });
  }, [range, windowState.interval, customRange]);

  useEffect(() => {
    if (previousScopeKeyRef.current === scopeKey) return;
    const previousScopeKey = previousScopeKeyRef.current;
    previousScopeKeyRef.current = scopeKey;
    // The shell can render before its site list has resolved. Treat the
    // initial empty-to-site transition as scope initialization so URL filters
    // are not cleared after the first correctly scoped request completes.
    if (!previousScopeKey) return;
    // Site-scoped data filters are easy to carry across sites and cause empty states.
    setUiFiltersState(EMPTY_FILTERS);
  }, [scopeKey]);

  useEffect(() => {
    if (previousRouteSearchParamsKeyRef.current === routeSearchParamsKey) {
      return;
    }
    previousRouteSearchParamsKeyRef.current = routeSearchParamsKey;

    setUiFiltersState(normalizeFilters(routeQueryDocument));
  }, [routeQueryDocument, routeSearchParamsKey]);

  const setRange = useCallback(
    (next: RangePreset) => {
      if (next === "custom" && !customRange) {
        setRangeState(next);
        return;
      }
      const nextWindow = resolveTimeWindow(next, Date.now(), {
        customRange: customRange || undefined,
        interval: null,
        timeZone,
        dataStart,
      });
      setRangeState(next);
      setIntervalState(finestIntervalForRange(nextWindow.from, nextWindow.to));
    },
    [customRange, dataStart, timeZone],
  );

  const setCustomRange = useCallback((next: CustomTimeRange | null) => {
    const normalized = normalizeCustomRange(next);
    setCustomRangeState(normalized);
    if (normalized) {
      setRangeState("custom");
      setIntervalState(finestIntervalForRange(normalized.from, normalized.to));
    }
  }, []);

  const setInterval = useCallback((next: DashboardInterval) => {
    setIntervalState(next);
  }, []);

  const setUiFilters = useCallback((next: FilterDocument) => {
    setUiFiltersState(normalizeFilters(next));
  }, []);

  const clearUiFilters = useCallback(() => {
    setUiFiltersState(EMPTY_FILTERS);
  }, []);

  const allowedIntervals = useMemo(
    () => allowedIntervalsForRange(windowState.from, windowState.to),
    [windowState.from, windowState.to],
  );

  const contextValue = useMemo<DashboardQueryContextValue>(
    () => ({
      range,
      window: windowState,
      filters: normalizeFilters(uiFilters),
      uiFilters,
      customRange,
      setRange,
      setCustomRange,
      setInterval,
      setUiFilters,
      clearUiFilters,
      allowedIntervals,
      timeZone,
    }),
    [
      range,
      windowState,
      uiFilters,
      customRange,
      setRange,
      setCustomRange,
      setInterval,
      setUiFilters,
      clearUiFilters,
      allowedIntervals,
      timeZone,
    ],
  );

  return (
    <DashboardQueryContext.Provider value={contextValue}>
      {children}
    </DashboardQueryContext.Provider>
  );
}
function useDashboardQueryContext(): DashboardQueryContextValue {
  const context = useContext(DashboardQueryContext);
  if (!context) {
    const fallbackWindow = resolveTimeWindow(DEFAULT_RANGE);
    return {
      range: DEFAULT_RANGE,
      window: fallbackWindow,
      filters: EMPTY_FILTERS,
      uiFilters: EMPTY_FILTERS,
      customRange: null,
      setRange: () => {},
      setCustomRange: () => {},
      setInterval: () => {},
      setUiFilters: () => {},
      clearUiFilters: () => {},
      allowedIntervals: ["hour", "day", "week", "month"],
      timeZone: fallbackWindow.timeZone,
    };
  }
  return context;
}
export function useDashboardQuery() {
  const context = useDashboardQueryContext();
  return {
    range: context.range,
    filters: context.filters,
    window: context.window,
  };
}
export function useDashboardQueryControls() {
  return useDashboardQueryContext();
}
