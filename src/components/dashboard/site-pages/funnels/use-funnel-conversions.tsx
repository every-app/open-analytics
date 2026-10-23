import { type ReactNode, useCallback, useMemo, useState } from "react";
import { DetailDrawer } from "@insightflare/product-ui/detail-drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@insightflare/ui/alert-dialog";
import { Spinner } from "@insightflare/ui/spinner";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { dashboardComparisonLabel } from "@/components/dashboard/comparison/use-dashboard-comparison-query";
import { DETAIL_QUERY_PARAM } from "@/components/dashboard/site-pages/common/detail-query-param";
import {
  createFunnel,
  deleteFunnel,
  fetchFunnelDetail,
  fetchFunnels,
  updateFunnel,
} from "@/lib/dashboard/client/data/index";
import {
  pushUrlWithoutNavigation,
  replaceUrlWithoutNavigation,
  useLiveSearchParams,
} from "@/lib/dashboard/client/history";
import type { DashboardComparisonQuery } from "@/lib/dashboard/comparison-query";
import { filterQueryKey } from "@/lib/dashboard/filter-query-key";
import { serializeDashboardSearchParams } from "@/lib/dashboard/filter-state";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type {
  FunnelDefinition,
  FunnelStep,
} from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import type { ConversionList } from "./conversion-list";
import {
  FunnelCard,
  FunnelCardSkeleton,
  funnelDetailQueryKey,
} from "./funnel-card";
import { FunnelDetail } from "./funnel-detail";
import { FunnelEditor } from "./funnel-editor";
function detailTarget(
  pathname: string,
  searchParams: URLSearchParams,
  funnelId: string,
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set(DETAIL_QUERY_PARAM, funnelId);
  return `${pathname}?${serializeDashboardSearchParams(params)}`;
}
function FunnelDetailDrawer({
  locale,
  labels,
  descriptionMessages,
  siteId,
  pathname,
  funnel,
  funnelId,
  window,
  filters,
  filterKey,
  comparisonQuery,
  comparisonLabel,
  canManage,
  onEdit,
  onDelete,
}: {
  readonly locale: Locale;
  readonly labels: AppMessages["funnels"];
  readonly descriptionMessages: AppMessages;
  readonly siteId: string;
  readonly pathname: string;
  readonly funnel?: FunnelDefinition;
  readonly funnelId: string;
  readonly window: TimeWindow;
  readonly filters: FilterDocument;
  readonly filterKey: string;
  readonly comparisonQuery?: DashboardComparisonQuery | null;
  readonly comparisonLabel?: string;
  readonly canManage: boolean;
  readonly onEdit: (funnel: FunnelDefinition) => void;
  readonly onDelete: (funnel: FunnelDefinition) => void;
}) {
  const comparisonFilterKey = comparisonQuery
    ? filterQueryKey(comparisonQuery.filters)
    : "none";
  const detail = useQuery({
    queryKey: funnel
      ? funnelDetailQueryKey(siteId, funnel, window, filterKey)
      : [
          "dashboard",
          "funnel-detail",
          siteId,
          funnelId,
          window.from,
          window.to,
          window.timeZone,
          filterKey,
        ],
    queryFn: ({ signal }) =>
      fetchFunnelDetail(siteId, funnelId, window, filters, { signal }),
    enabled: Boolean(funnelId),
  });
  const comparisonDetail = useQuery({
    queryKey:
      funnel && comparisonQuery
        ? funnelDetailQueryKey(
            siteId,
            funnel,
            comparisonQuery.window,
            comparisonFilterKey,
          )
        : [
            "dashboard",
            "funnel-detail-comparison-disabled",
            siteId,
            funnelId,
            comparisonQuery?.window.from ?? "none",
            comparisonQuery?.window.to ?? "none",
            comparisonQuery?.window.timeZone ?? "none",
            comparisonFilterKey,
          ],
    queryFn: ({ signal }) => {
      if (!comparisonQuery) {
        throw new Error("Comparison query is not enabled");
      }
      return fetchFunnelDetail(
        siteId,
        funnelId,
        comparisonQuery.window,
        comparisonQuery.filters,
        { signal },
      );
    },
    enabled: Boolean(funnelId && comparisonQuery),
  });
  return (
    <FunnelDetail
      locale={locale}
      labels={labels}
      descriptionMessages={descriptionMessages}
      payload={detail.data}
      comparisonAnalysis={comparisonDetail.data?.data.analysis}
      funnel={funnel}
      loading={!detail.data}
      comparisonLoading={Boolean(comparisonQuery) && !comparisonDetail.data}
      comparisonLabel={comparisonLabel}
      error={detail.isError}
      canManage={canManage}
      onEdit={onEdit}
      onDelete={onDelete}
      siteId={siteId}
      pathname={pathname}
      window={window}
      filters={filters}
    />
  );
}
/**
 * The site's funnels for the Conversions page: their cards, and the editor,
 * detail drawer and delete confirmation that act on them.
 */
export function useFunnelConversions({
  locale,
  messages,
  siteId,
  pathname,
  window: timeWindow,
  filters,
  filterKey,
  comparisonQuery,
  canManage,
}: {
  readonly locale: Locale;
  readonly messages: AppMessages;
  readonly siteId: string;
  readonly pathname: string;
  readonly window: TimeWindow;
  readonly filters: FilterDocument;
  readonly filterKey: string;
  readonly comparisonQuery: DashboardComparisonQuery | null;
  readonly canManage: boolean;
}): ConversionList {
  const labels = messages.funnels;
  const searchParams = useLiveSearchParams();
  const detailId = searchParams.get(DETAIL_QUERY_PARAM)?.trim() ?? "";
  const queryClient = useQueryClient();
  const comparisonLabel = dashboardComparisonLabel(messages, comparisonQuery);
  const listKey = useMemo(
    () => ["dashboard", "funnels", siteId] as const,
    [siteId],
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FunnelDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FunnelDefinition | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const list = useInfiniteQuery({
    queryKey: listKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchFunnels(siteId, { limit: 50, cursor: pageParam, signal }),
    enabled: typeof window !== "undefined",
    getNextPageParam: (lastPage) =>
      lastPage.data.pagination.hasMore
        ? (lastPage.data.pagination.nextCursor ?? undefined)
        : undefined,
  });
  const funnels = list.data?.pages.flatMap((page) => page.data.items) ?? [];
  const selected = funnels.find((funnel) => funnel.id === detailId);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = list;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const openDetail = useCallback(
    (id: string) => {
      pushUrlWithoutNavigation(detailTarget(pathname, searchParams, id));
    },
    [pathname, searchParams],
  );
  const closeDetail = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete(DETAIL_QUERY_PARAM);
    const query = serializeDashboardSearchParams(params);
    replaceUrlWithoutNavigation(query ? `${pathname}?${query}` : pathname);
  }, [pathname]);
  const openCreate = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);
  const openEdit = useCallback(
    (funnel: FunnelDefinition) => {
      closeDetail();
      setEditing(funnel);
      setEditorOpen(true);
    },
    [closeDetail],
  );

  const save = useCallback(
    async (input: {
      name: string;
      progressionScope: "session" | "visitor";
      conversionWindowMs: number | null;
      steps: FunnelStep[];
    }) => {
      setSaving(true);
      try {
        const payload = editing
          ? await updateFunnel(siteId, editing.id, input)
          : await createFunnel(siteId, input);
        await queryClient.invalidateQueries({ queryKey: listKey });
        if (editing) {
          await queryClient.invalidateQueries({
            queryKey: ["dashboard", "funnel-detail", siteId, editing.id],
          });
        }
        setEditorOpen(false);
        setEditing(null);
        toast.success(editing ? labels.updatedSuccess : labels.created);
        if (!editing) openDetail(payload.data.funnel.id);
      } catch (error) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : labels.saveFailed,
        );
      } finally {
        setSaving(false);
      }
    },
    [
      editing,
      labels.created,
      labels.saveFailed,
      labels.updatedSuccess,
      listKey,
      openDetail,
      queryClient,
      siteId,
    ],
  );

  const remove = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFunnel(siteId, deleteTarget.id);
      await queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.removeQueries({
        queryKey: ["dashboard", "funnel-detail", siteId, deleteTarget.id],
      });
      if (detailId === deleteTarget.id) closeDetail();
      setDeleteTarget(null);
      toast.success(labels.deleted);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : labels.deleteFailed,
      );
    } finally {
      setDeleting(false);
    }
  }, [
    closeDetail,
    deleteTarget,
    detailId,
    labels.deleteFailed,
    labels.deleted,
    listKey,
    queryClient,
    siteId,
  ]);

  const cards: ReactNode[] = funnels.map((funnel) => (
    <FunnelCard
      key={`funnel:${funnel.id}`}
      locale={locale}
      labels={labels}
      descriptionMessages={messages}
      siteId={siteId}
      funnel={funnel}
      window={timeWindow}
      filters={filters}
      filterKey={filterKey}
      comparisonQuery={comparisonQuery}
      canManage={canManage}
      onOpen={() => openDetail(funnel.id)}
      onEdit={() => openEdit(funnel)}
      onDelete={() => setDeleteTarget(funnel)}
    />
  ));

  const overlays = (
    <>
      <FunnelEditor
        open={editorOpen}
        funnel={editing}
        labels={labels}
        messages={messages}
        siteId={siteId}
        window={timeWindow}
        submitting={saving}
        onOpenChange={(open) => {
          if (!saving) setEditorOpen(open);
        }}
        onSubmit={save}
      />

      {detailId ? (
        <DetailDrawer
          ariaLabel={messages.funnels.title}
          drawerKey={`funnel:${detailId}`}
          open
          onOpenChange={(open) => {
            if (!open) closeDetail();
          }}
        >
          <FunnelDetailDrawer
            locale={locale}
            labels={labels}
            descriptionMessages={messages}
            siteId={siteId}
            pathname={pathname}
            funnel={selected}
            funnelId={detailId}
            window={timeWindow}
            filters={filters}
            filterKey={filterKey}
            comparisonQuery={comparisonQuery}
            comparisonLabel={comparisonLabel}
            canManage={canManage}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        </DetailDrawer>
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle icon={Trash2Icon}>
              {labels.deleteTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {labels.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              <XIcon /> {labels.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {deleting ? <Spinner /> : <Trash2Icon />} {labels.deleteConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return {
    cards,
    skeleton: (index) => (
      <FunnelCardSkeleton
        key={`funnel-skeleton:${index}`}
        locale={locale}
        labels={labels}
        descriptionMessages={messages}
        canManage={canManage}
      />
    ),
    isPending: list.isPending,
    isError: list.isError,
    retry: () => void list.refetch(),
    hasNextPage: Boolean(hasNextPage),
    loadMore,
    openCreate,
    overlays,
  };
}
