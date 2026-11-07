import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LayerManagerProvider } from "@insightflare/ui/layer-manager";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as Motion from "motion/react";
import { MotionGlobalConfig } from "motion/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  TabbedDataTableExportConfig,
  TabbedDataTableLoader,
  TabbedDataTableLoaderOptions,
  TabbedDataTablePage,
  TabbedDataTableRowBase,
} from "@/components/dashboard/common/tabbed-data-table-card";
const sentinelState = vi.hoisted(() => ({
  onReachEnd: undefined as (() => void) | undefined,
}));
vi.mock(
  "../../../../packages/product-ui/src/tabbed-table/use-infinite-table-sentinel",
  () => ({
    useInfiniteTableSentinel: ({ onReachEnd }: { onReachEnd: () => void }) => {
      sentinelState.onReachEnd = onReachEnd;
      return () => undefined;
    },
  }),
);
vi.mock(
  "../../../../packages/ui/src/components/ui/tabbed-table/animated-data-table-row",
  () => ({
    AnimatedDataTableRow: ({
      children,
      reduceMotion: _reduceMotion,
      ...props
    }: {
      children: ReactNode;
      reduceMotion?: boolean;
    } & Record<string, unknown>) => <tr {...props}>{children}</tr>,
  }),
);
vi.mock(
  "../../../../packages/ui/src/components/ui/tabbed-table/tabbed-scroll-mask-card",
  () => ({
    TabbedScrollMaskCard: ({
      children,
      headerRight,
    }: {
      children: ReactNode;
      headerRight?: ReactNode;
    }) => (
      <div>
        {headerRight}
        {children}
      </div>
    ),
  }),
);
vi.mock("../../../../packages/ui/src/components/ui/data-table-switch", () => ({
  DataTableSwitch: ({
    loading,
    hasContent,
    header,
    loadingLabel,
    loadingRows,
    rows,
    footer,
  }: {
    loading: boolean;
    hasContent: boolean;
    header: ReactNode;
    loadingLabel: string;
    loadingRows?: ReactNode;
    rows: ReactNode;
    footer?: ReactNode;
  }) =>
    loading ? (
      <table data-testid="loading">
        <thead>{header}</thead>
        <tbody>
          {loadingRows ?? (
            <tr>
              <td>
                <span data-testid="loading-indicator">{loadingLabel}</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    ) : hasContent ? (
      <table>
        <thead>{header}</thead>
        <tbody>
          {rows}
          {footer}
        </tbody>
      </table>
    ) : (
      <div data-testid="empty">Empty</div>
    ),
}));
vi.mock("@insightflare/ui/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@insightflare/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  AnimatePresence: ({ children }: { children: ReactNode }) => children,
  useReducedMotion: () => true,
}));
import {
  TabbedDataTableCard,
  type TabbedDataTableColumn,
} from "@/components/dashboard/common/tabbed-data-table-card";
import { getMessages } from "@/lib/i18n/messages";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
interface TestRow extends TabbedDataTableRowBase {
  value: number;
}
type TestSortKey = "value";
type TestTab = "all";
const tabs = [{ value: "all", label: "All" }] as const;
const columns: readonly TabbedDataTableColumn<TestRow, TestSortKey, TestTab>[] =
  [
    {
      key: "value",
      label: "Value",
      getValue: (row) => row.value,
    },
  ];
function page(
  items: readonly TestRow[],
  nextCursor: string | null = null,
): TabbedDataTablePage<TestRow> {
  return {
    items,
    pagination: {
      limit: 2,
      returned: items.length,
      hasMore: nextCursor !== null,
      nextCursor,
    },
  };
}
function renderTable(
  loader: TabbedDataTableLoader<TestTab, TestRow, TestSortKey>,
  exportConfig:
    false | TabbedDataTableExportConfig<TestRow, TestTab, TestSortKey> = false,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false } },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <QueryClientProvider client={client}>
        <LayerManagerProvider>
          <TabbedDataTableCard<TestTab, TestRow, TestSortKey>
            messages={getMessages("en")}
            tabs={tabs}
            columns={columns}
            loader={loader}
            limit={2}
            sortActionLabel={(label) => `Sort by ${label}`}
            loadingLabel="Loading"
            emptyLabel="Empty"
            search={false}
            export={exportConfig}
          />
        </LayerManagerProvider>
      </QueryClientProvider>,
    );
  });
  return { client, container, root };
}
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}
function renderedLabels(container: HTMLDivElement) {
  return Array.from(container.querySelectorAll("tbody tr"), (row) =>
    row.querySelector("td")?.textContent?.trim(),
  ).filter((label): label is string => Boolean(label));
}
describe("TabbedDataTableCard loader contract", () => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;
  let client: QueryClient | undefined;

  beforeEach(() => {
    sentinelState.onReachEnd = undefined;
    MotionGlobalConfig.skipAnimations = true;
  });

  afterEach(() => {
    MotionGlobalConfig.skipAnimations = false;
    act(() => root?.unmount());
    client?.clear();
    container?.remove();
    root = undefined;
    client = undefined;
    container = undefined;
  });

  it("renders a loading indicator while the requested page is pending", () => {
    const loader = vi.fn(
      (_options: TabbedDataTableLoaderOptions<TestTab, TestSortKey>) =>
        new Promise<TabbedDataTablePage<TestRow>>(() => undefined),
    );
    ({ client, container, root } = renderTable(loader));

    expect(
      container!.querySelector('[data-testid="loading-indicator"]')
        ?.textContent,
    ).toBe("Loading");
  });

  it("renders rows in the order returned by the loader", async () => {
    const loader = vi.fn(
      async (_options: TabbedDataTableLoaderOptions<TestTab, TestSortKey>) =>
        page([
          { key: "low", value: 1 },
          { key: "high", value: 10 },
        ]),
    );
    ({ client, container, root } = renderTable(loader));

    await settle();

    expect(renderedLabels(container!)).toEqual(["low", "high"]);
  });

  it("sorts locally after the complete result has loaded", async () => {
    const loader = vi.fn(
      async (_options: TabbedDataTableLoaderOptions<TestTab, TestSortKey>) =>
        page([
          { key: "high", value: 10 },
          { key: "low", value: 1 },
        ]),
    );
    ({ client, container, root } = renderTable(loader));
    await settle();

    act(() => {
      container!
        .querySelector<HTMLButtonElement>('button[aria-label="Sort by Value"]')
        ?.click();
    });
    await settle();

    expect(loader).toHaveBeenCalledTimes(1);
    expect(renderedLabels(container!)).toEqual(["low", "high"]);
  });

  it("appends pages without changing their loader order", async () => {
    const loader = vi.fn(
      async ({ cursor }: TabbedDataTableLoaderOptions<TestTab, TestSortKey>) =>
        cursor === null
          ? page(
              [
                { key: "page-one-a", value: 1 },
                { key: "page-one-b", value: 2 },
              ],
              "next",
            )
          : page([
              { key: "page-two-a", value: 3 },
              { key: "page-two-b", value: 4 },
            ]),
    );
    ({ client, container, root } = renderTable(loader));
    await settle();

    act(() => sentinelState.onReachEnd?.());
    await settle();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(loader.mock.calls[1]?.[0]).toMatchObject({ cursor: "next" });
    expect(renderedLabels(container!)).toEqual([
      "page-one-a",
      "page-one-b",
      "page-two-a",
      "page-two-b",
    ]);
  });

  it("exports every row of the report to CSV, paging past the rows on screen", async () => {
    const rows = Array.from({ length: 9 }, (_, index) => ({
      key: `/page-${index + 1}`,
      value: 9 - index,
    }));
    const loader = vi.fn(
      async ({
        cursor,
      }: TabbedDataTableLoaderOptions<TestTab, TestSortKey>) => {
        const start = Number(cursor ?? 0);
        const end = start + 2;
        return page(
          rows.slice(start, end),
          end < rows.length ? String(end) : null,
        );
      },
    );
    ({ client, container, root } = renderTable(loader, {
      filename: "Pages-Top pages",
    }));
    await settle();
    // The table has loaded only its first pages.
    const shown = renderedLabels(container!);
    expect(shown.length).toBeLessThan(rows.length);
    expect(shown.slice(0, 2)).toEqual(["/page-1", "/page-2"]);

    const blobs: Blob[] = [];
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockImplementation((blob) => {
        blobs.push(blob as Blob);
        return "blob:export";
      });
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    act(() => {
      container!
        .querySelector<HTMLButtonElement>('[aria-label="Export"]')
        ?.click();
    });
    await settle();
    const download = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button"),
    ).find((button) => button.textContent?.trim() === "Export CSV");
    act(() => download?.click());
    await settle();

    // The export picks up after the loaded pages and reads each page once.
    expect(loader.mock.calls.map(([options]) => options.cursor)).toEqual([
      null,
      "2",
      "4",
      "6",
      "8",
    ]);
    expect(blobs).toHaveLength(1);
    const csv = (await blobs[0]!.text()).replace(/^\uFEFF/, "");
    expect(csv.split("\r\n")).toEqual([
      "All,Value",
      ...rows.map((row) => `${row.key},${row.value}`),
    ]);
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});
