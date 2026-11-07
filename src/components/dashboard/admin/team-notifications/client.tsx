import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@insightflare/ui/badge";
import { Button } from "@insightflare/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@insightflare/ui/responsive-dialog";
import { Spinner } from "@insightflare/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@insightflare/ui/table";
import { TableActionButton } from "@insightflare/ui/table-action-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@insightflare/ui/tooltip";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/empty-state";
import { EmailNotSetUp } from "@/components/dashboard/notifications/email-not-set-up";
import {
  SettingsCard,
  SettingsPage,
  SettingsSection,
} from "@/components/settings/settings-section";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type {
  NotificationRuleData,
  SiteData,
} from "@/lib/dashboard-api/client/edge";
import { formatI18nTemplate } from "@/lib/i18n/template";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";

import {
  browserDefaultTimeZone,
  buildRulePayload,
  EMPTY_FORM,
  inferFormFromRule,
  ruleConditionLabel,
  type RuleFormState,
  siteLabel,
  type TeamNotificationsClientProps,
} from "./model";
import { RuleFormFields } from "./rule-form";
export function TeamNotificationsClient({
  locale,
  messages,
  teamId,
  canManage,
  initialData = null,
}: TeamNotificationsClientProps) {
  const copy = messages.teamManagement.notifications;
  // Without a site there is nothing to report on; only managers can add one.
  const noSitesHint = canManage
    ? copy.addSiteFirst
    : messages.getStarted.memberNoSitesDescription;
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [deletingRule, setDeletingRule] = useState<NotificationRuleData | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const rulesQueryKey = [
    "dashboard",
    "team-notification-rules",
    teamId,
  ] as const;
  const rulesQuery = useQuery({
    queryKey: rulesQueryKey,
    queryFn: async ({ signal }) => {
      const [rules, sites, emailConfig] = await Promise.all([
        requestAdminService<NotificationRuleData[]>("notification-rules", {
          params: { teamId },
          signal,
        }),
        requestAdminService<SiteData[]>("sites", {
          params: { teamId },
          signal,
        }),
        requestAdminService<PublicNotificationEmailConfig>(
          "notification-email",
          { signal },
        ).catch(() => null),
      ]);
      return {
        rules,
        sites,
        emailConfigured: emailConfig?.enabled ?? null,
      };
    },
    initialData: initialData
      ? {
          rules: initialData.rules,
          sites: initialData.sites,
          emailConfigured: initialData.emailConfigured,
        }
      : undefined,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const rules = rulesQuery.data?.rules ?? [];
  const sites = rulesQuery.data?.sites ?? [];
  const emailConfigured = rulesQuery.data?.emailConfigured ?? null;
  const loading = rulesQuery.isPending;

  const siteById = useMemo(
    () => new Map(sites.map((site) => [site.id, site])),
    [sites],
  );
  const enabledCount = useMemo(
    () => rules.filter((rule) => rule.enabled).length,
    [rules],
  );
  const canCreateRule = sites.length > 0;

  useEffect(() => {
    if (rulesQuery.isError) toast.error(copy.loadRulesFailed);
  }, [copy.loadRulesFailed, rulesQuery.errorUpdatedAt, rulesQuery.isError]);

  function openCreate() {
    if (!canCreateRule) return;
    setForm({
      ...EMPTY_FORM,
      siteId: sites[0]?.id ?? "",
      timezone: browserDefaultTimeZone(),
    });
    setDialogOpen(true);
  }

  function openEdit(rule: NotificationRuleData) {
    setForm(inferFormFromRule(rule));
    setDialogOpen(true);
  }

  async function saveRule() {
    if (saving) return;
    if (!form.siteId) {
      toast.error(copy.pleaseChooseSite);
      return;
    }
    setSaving(true);
    try {
      const payload = buildRulePayload(copy, form, sites);
      await requestAdminService<NotificationRuleData>("notification-rules", {
        method: form.id ? "PATCH" : "POST",
        body: form.id
          ? { ruleId: form.id, teamId, ...payload }
          : { teamId, ...payload },
      });
      await queryClient.invalidateQueries({ queryKey: rulesQueryKey });
      setDialogOpen(false);
      toast.success(form.id ? copy.ruleUpdated : copy.ruleCreated);
    } catch {
      toast.error(form.id ? copy.updateRuleFailed : copy.createRuleFailed);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: NotificationRuleData) {
    try {
      await requestAdminService<NotificationRuleData>("notification-rules", {
        method: "PATCH",
        body: {
          ruleId: rule.id,
          enabled: !rule.enabled,
        },
      });
      await queryClient.invalidateQueries({ queryKey: rulesQueryKey });
    } catch {
      toast.error(copy.updateRuleFailed);
    }
  }

  async function removeRule(rule: NotificationRuleData) {
    setDeleting(true);
    try {
      await requestAdminService<{ id: string; removed: boolean }>(
        "notification-rules",
        {
          method: "DELETE",
          params: { id: rule.id },
        },
      );
      await queryClient.invalidateQueries({ queryKey: rulesQueryKey });
      setDeletingRule(null);
      toast.success(copy.ruleDeleted);
    } catch {
      toast.error(copy.deleteRuleFailed);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsPage
      title={messages.settingsNav.notifications}
      width="wide"
      actions={
        canCreateRule || loading ? (
          <Button type="button" onClick={openCreate} disabled={!canCreateRule}>
            <PlusIcon data-icon="inline-start" />
            <span>{copy.createRule}</span>
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              {/* A disabled button can't be hovered, so the span carries the tooltip. */}
              <span tabIndex={0}>
                <Button type="button" disabled>
                  <PlusIcon data-icon="inline-start" />
                  <span>{copy.createRule}</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{noSitesHint}</TooltipContent>
          </Tooltip>
        )
      }
    >
      <SettingsSection
        description={formatI18nTemplate(copy.enabledCount, {
          count: enabledCount,
          total: rules.length,
        })}
      >
        {/* Email is optional on the gateway: reports and alerts still arrive
            in the inbox, and this says what an admin sets. Null is unknown
            (the status couldn't be read) and says nothing. */}
        {!loading && emailConfigured === false ? (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-xs"
          >
            <SendIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              <EmailNotSetUp messages={messages} />
            </span>
          </p>
        ) : null}
        <SettingsCard className="divide-y-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              <Spinner className="mr-2 size-4" />
              {copy.loadingRules}
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              variant="plain"
              media="rows"
              icon={BellIcon}
              title={copy.empty}
              description={canCreateRule ? undefined : noSitesHint}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.columns.name}</TableHead>
                  <TableHead>{copy.columns.type}</TableHead>
                  <TableHead>{copy.columns.condition}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead>{copy.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {siteLabel(siteById, rule.siteId)}
                      </div>
                    </TableCell>
                    <TableCell>{copy.ruleTypes[rule.type]}</TableCell>
                    <TableCell>{ruleConditionLabel(copy, rule)}</TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled
                          ? copy.status.enabled
                          : copy.status.disabled}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TableActionButton
                          label={`${copy.edit}: ${rule.name}`}
                          onClick={() => openEdit(rule)}
                        >
                          <PencilIcon className="size-4" />
                        </TableActionButton>
                        <TableActionButton
                          label={`${
                            rule.enabled ? copy.disable : copy.enable
                          }: ${rule.name}`}
                          onClick={() => void toggleRule(rule)}
                          transitionKey={rule.enabled ? "enabled" : "disabled"}
                        >
                          {rule.enabled ? (
                            <CirclePauseIcon className="size-4" />
                          ) : (
                            <CirclePlayIcon className="size-4" />
                          )}
                        </TableActionButton>
                        <TableActionButton
                          label={`${copy.delete}: ${rule.name}`}
                          tone="destructive"
                          onClick={() => setDeletingRule(rule)}
                        >
                          <Trash2Icon className="size-4" />
                        </TableActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SettingsCard>
      </SettingsSection>

      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent
          className="flex flex-col overflow-hidden p-0"
          desktopClassName="max-h-[min(860px,calc(100vh-1rem))] max-w-2xl"
          drawerClassName="h-[80dvh] max-h-[80dvh]"
        >
          <div className="shrink-0 border-b p-4 sm:p-6">
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle icon={BellIcon}>
                {form.id ? copy.editRule : copy.createRule}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {copy.dialogDescription}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
          </div>
          <ResponsiveDialogBody className="flex-1 p-4 sm:p-6">
            <RuleFormFields
              copy={copy}
              locale={locale}
              form={form}
              sites={sites}
              onChange={(patch) =>
                setForm((current) => ({
                  ...current,
                  ...patch,
                }))
              }
            />
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter className="border-t p-4 sm:p-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              <XIcon data-icon="inline-start" />
              <span>{messages.teamSelect.cancel}</span>
            </Button>
            <Button
              type="button"
              onClick={() => void saveRule()}
              disabled={saving}
            >
              {saving ? <Spinner /> : <SaveIcon />}
              <span>{form.id ? copy.saveRule : copy.createRule}</span>
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      <AlertDialog
        open={deletingRule !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeletingRule(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle icon={Trash2Icon}>
              {formatI18nTemplate(copy.deleteConfirm, {
                name: deletingRule?.name ?? "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {messages.teamSelect.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                if (deletingRule) void removeRule(deletingRule);
              }}
            >
              {deleting ? <Spinner className="size-4" /> : null}
              {copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPage>
  );
}
