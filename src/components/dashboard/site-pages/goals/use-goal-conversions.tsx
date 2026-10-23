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
import type { ConversionList } from "@/components/dashboard/site-pages/funnels/conversion-list";
import {
  createGoal,
  deleteGoal,
  fetchGoalDefinition,
  fetchGoals,
  updateGoal,
} from "@/lib/dashboard/client/data/index";
import {
  pushUrlWithoutNavigation,
  replaceUrlWithoutNavigation,
  useLiveSearchParams,
} from "@/lib/dashboard/client/history";
import type { DashboardComparisonQuery } from "@/lib/dashboard/comparison-query";
import { serializeDashboardSearchParams } from "@/lib/dashboard/filter-state";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import type { GoalDefinition } from "@/lib/dashboard-api/client/edge";
import type { FilterDocument } from "@/lib/filter-contract/index";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import { GoalCard, GoalCardSkeleton } from "./goal-card";
import { GoalDetail } from "./goal-detail";
import { GoalEditor } from "./goal-editor";

/** Route query key opening a goal on the Conversions page. */
export const GOAL_QUERY_PARAM = "goal";

export function goalDefinitionQueryKey(siteId: string, goalId: string) {
  return ["dashboard", "goal-definition", siteId, goalId] as const;
}

/**
 * The site's goals for the Conversions page: their cards, and the editor,
 * detail drawer and delete confirmation that act on them.
 */
export function useGoalConversions({
  locale,
  messages,
  siteId,
  pathname,
  window,
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
  const labels = messages.goals;
  const searchParams = useLiveSearchParams();
  const detailId = searchParams.get(GOAL_QUERY_PARAM)?.trim() ?? "";
  const comparisonLabel = dashboardComparisonLabel(messages, comparisonQuery);
  const queryClient = useQueryClient();
  const listKey = useMemo(
    () => ["dashboard", "goals", siteId] as const,
    [siteId],
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<GoalDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoalDefinition | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const list = useInfiniteQuery({
    queryKey: listKey,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchGoals(siteId, { limit: 50, cursor: pageParam, signal }),
    enabled: typeof globalThis.window !== "undefined",
    getNextPageParam: (lastPage) =>
      lastPage.data.pagination.hasMore
        ? (lastPage.data.pagination.nextCursor ?? undefined)
        : undefined,
  });
  const goals = list.data?.pages.flatMap((page) => page.data.items) ?? [];
  const selected = goals.find((goal) => goal.id === detailId);
  const detailDefinition = useQuery({
    queryKey: goalDefinitionQueryKey(siteId, detailId),
    queryFn: ({ signal }) => fetchGoalDefinition(siteId, detailId, { signal }),
    enabled: Boolean(detailId && !selected),
  });
  const detailGoal = selected ?? detailDefinition.data?.data.goal;

  const openDetail = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(GOAL_QUERY_PARAM, id);
      pushUrlWithoutNavigation(
        `${pathname}?${serializeDashboardSearchParams(params)}`,
      );
    },
    [pathname, searchParams],
  );
  const closeDetail = useCallback(() => {
    const params = new URLSearchParams(globalThis.location.search);
    params.delete(GOAL_QUERY_PARAM);
    const query = serializeDashboardSearchParams(params);
    replaceUrlWithoutNavigation(query ? `${pathname}?${query}` : pathname);
  }, [pathname]);
  const openCreate = useCallback(() => {
    setEditing(null);
    setEditorOpen(true);
  }, []);
  const openEdit = useCallback(
    (goal: GoalDefinition) => {
      closeDetail();
      setEditing(goal);
      setEditorOpen(true);
    },
    [closeDetail],
  );

  const save = useCallback(
    async (input: { name: string; filterDsl: string }) => {
      setSaving(true);
      try {
        const result = editing
          ? await updateGoal(siteId, editing.id, input)
          : await createGoal(siteId, input);
        await queryClient.invalidateQueries({ queryKey: listKey });
        if (editing) {
          await queryClient.invalidateQueries({
            queryKey: goalDefinitionQueryKey(siteId, editing.id),
          });
          if (
            editing.semanticFingerprint !== result.data.goal.semanticFingerprint
          ) {
            await queryClient.invalidateQueries({
              queryKey: ["dashboard", "goal-summary", siteId, editing.id],
            });
            await queryClient.invalidateQueries({
              queryKey: ["dashboard", "goal-timeseries", siteId, editing.id],
            });
          }
        }
        setEditorOpen(false);
        setEditing(null);
        toast.success(editing ? labels.updatedSuccess : labels.created);
        if (!editing) openDetail(result.data.goal.id);
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
      await deleteGoal(siteId, deleteTarget.id);
      await queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.removeQueries({
        queryKey: ["dashboard", "goal-summary", siteId, deleteTarget.id],
      });
      queryClient.removeQueries({
        queryKey: ["dashboard", "goal-timeseries", siteId, deleteTarget.id],
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

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = list;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const cards: ReactNode[] = goals.map((goal) => (
    <GoalCard
      key={`goal:${goal.id}`}
      goal={goal}
      siteId={siteId}
      locale={locale}
      labels={labels}
      messages={messages}
      window={window}
      filters={filters}
      filterKey={filterKey}
      comparisonQuery={comparisonQuery}
      canManage={canManage}
      onOpen={() => openDetail(goal.id)}
      onEdit={() => openEdit(goal)}
      onDelete={() => setDeleteTarget(goal)}
    />
  ));

  const overlays = (
    <>
      <GoalEditor
        open={editorOpen}
        goal={editing}
        labels={labels}
        messages={messages}
        siteId={siteId}
        window={window}
        submitting={saving}
        onOpenChange={(open) => {
          if (!saving) setEditorOpen(open);
        }}
        onSubmit={save}
      />
      {detailId ? (
        <DetailDrawer
          ariaLabel={labels.title}
          drawerKey={`goal:${detailId}`}
          open
          onOpenChange={(open) => {
            if (!open) closeDetail();
          }}
        >
          <GoalDetail
            goal={detailGoal}
            siteId={siteId}
            pathname={pathname}
            locale={locale}
            labels={labels}
            messages={messages}
            window={window}
            filters={filters}
            filterKey={filterKey}
            comparisonQuery={comparisonQuery}
            comparisonLabel={comparisonLabel}
            canManage={canManage}
            actionPending={saving || deleting}
            onEdit={() => detailGoal && openEdit(detailGoal)}
            onDelete={() => detailGoal && setDeleteTarget(detailGoal)}
            loading={detailDefinition.isPending && !detailGoal}
            loadError={detailDefinition.isError}
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
      <GoalCardSkeleton
        key={`goal-skeleton:${index}`}
        locale={locale}
        labels={labels}
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
