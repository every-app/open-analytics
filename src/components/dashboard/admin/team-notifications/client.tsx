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
import { AutoResizer } from "@insightflare/ui/auto-resizer";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import { Badge } from "@insightflare/ui/badge";
import { Button } from "@insightflare/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@insightflare/ui/dialog";
import { OverlayScrollbar } from "@insightflare/ui/overlay-scrollbar";
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
  CircleCheckIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  EyeIcon,
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
import {
  type MemberData,
  type NotificationMessageData,
  type NotificationRuleData,
  type NotificationRuleEvaluationData,
  type NotificationRuleRunData,
  type SiteData,
} from "@/lib/dashboard-api/client/edge";
import { formatI18nTemplate } from "@/lib/i18n/template";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";

import {
  browserDefaultTimeZone,
  buildRulePayload,
  conditionLabel,
  defaultRecipientUserIds,
  EMPTY_FORM,
  formatRunAt,
  inferFormFromRule,
  isCoolingDown,
  nextRunLabel,
  previewSummary,
  recipientLabel,
  type RuleFormState,
  type RuleFormType,
  ruleTypeLabel,
  scheduleLabel,
  siteLabel,
  type TeamNotificationsClientProps,
} from "./model";
import { RuleFormFields } from "./rule-form";
export function TeamNotificationsClient({
  locale,
  messages,
  teamId,
  currentUserId,
  initialData = null,
}: TeamNotificationsClientProps) {
  const copy = messages.teamManagement.notifications;
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewingId, setPreviewingId] = useState("");
  const [runningId, setRunningId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewRule, setPreviewRule] = useState<NotificationRuleData | null>(
    null,
  );
  const [previewResult, setPreviewResult] =
    useState<NotificationRuleEvaluationData | null>(null);
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM);
  const [deletingRule, setDeletingRule] = useState<NotificationRuleData | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const rulesQueryKey = [
    "dashboard",
    "team-notification-rules",
    teamId,
  ] as const;
  const rulesQuery = useQuery({
    queryKey: rulesQueryKey,
    queryFn: async ({ signal }) => {
      const [rules, sites, members, emailConfig] = await Promise.all([
        requestAdminService<NotificationRuleData[]>("notification-rules", {
          params: { teamId },
          signal,
        }),
        requestAdminService<SiteData[]>("sites", {
          params: { teamId },
          signal,
        }),
        requestAdminService<MemberData[]>("members", {
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
        members,
        emailConfigured: emailConfig?.enabled ?? null,
      };
    },
    initialData: initialData
      ? {
          rules: initialData.rules,
          sites: initialData.sites,
          members: initialData.members,
          emailConfigured: initialData.emailConfigured,
        }
      : undefined,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const rules = rulesQuery.data?.rules ?? [];
  const sites = rulesQuery.data?.sites ?? [];
  const members = rulesQuery.data?.members ?? [];
  const emailConfigured = rulesQuery.data?.emailConfigured ?? null;
  const loading = rulesQuery.isPending;

  const siteById = useMemo(
    () => new Map(sites.map((site) => [site.id, site])),
    [sites],
  );
  const memberByUserId = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  );
  const enabledCount = useMemo(
    () => rules.filter((rule) => rule.enabled).length,
    [rules],
  );
  const canCreateRule = sites.length > 0;

  useEffect(() => {
    if (rulesQuery.isError) toast.error(copy.loadRulesFailed);
  }, [copy.loadRulesFailed, rulesQuery.errorUpdatedAt, rulesQuery.isError]);

  function openCreate(type: RuleFormType = "report") {
    if (!canCreateRule) return;
    const firstSite = sites[0];
    setForm({
      ...EMPTY_FORM,
      type,
      siteId: firstSite?.id ?? "",
      name: "",
      scheduleKind: type === "report" ? "daily" : "interval",
      timezone: browserDefaultTimeZone(),
      recipientUserIds: defaultRecipientUserIds(members, currentUserId),
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
    if (form.recipientKind === "custom" && form.recipientUserIds.length === 0) {
      toast.error(copy.pleaseChooseRecipients);
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

  async function handleSendTest() {
    if (testing) return;
    setTesting(true);
    try {
      const { message } = await requestAdminService<{
        message: NotificationMessageData | null;
      }>("notification-test", {
        method: "POST",
        body: { teamId, userId: currentUserId },
      });
      // Email is optional on the gateway: the test still lands in the inbox,
      // and this says so instead of leaving the person waiting for an email.
      const email = message?.deliveryResults.email;
      const emailSkipped =
        typeof email === "object" &&
        email !== null &&
        (email as Record<string, unknown>).reason ===
          "system_email_unconfigured";
      toast.success(
        emailSkipped
          ? copy.testNotificationSentNoEmail
          : copy.testNotificationSent,
      );
      setTestDialogOpen(false);
    } catch {
      toast.error(copy.sendTestNotificationFailed);
    } finally {
      setTesting(false);
    }
  }

  async function handlePreview(rule: NotificationRuleData) {
    if (previewingId) return;
    setPreviewRule(rule);
    setPreviewResult(null);
    setPreviewDialogOpen(true);
    setPreviewingId(rule.id);
    try {
      const result = await requestAdminService<NotificationRuleEvaluationData>(
        "notification-rules/preview",
        {
          method: "POST",
          body: { ruleId: rule.id },
        },
      );
      setPreviewResult(result);
    } catch (error) {
      // requestAdminService throws the server's sentence, so a refusal (a
      // members list the gateway wouldn't give, say) reads at the button.
      toast.error(
        error instanceof Error && error.message
          ? formatI18nTemplate(copy.previewFailedWithReason, {
              reason: error.message,
            })
          : copy.previewFailed,
      );
    } finally {
      setPreviewingId("");
    }
  }

  /**
   * What a manual run did, in one or two sentences: the rule didn't trigger,
   * nobody matched its recipients, or N messages reached the inbox and what
   * happened to their email (failed, skipped because the gateway has no
   * sender, sent, or off in the recipients' preferences).
   */
  function describeRunResult(result: NotificationRuleRunData): string {
    if (result.evaluation.status !== "triggered") return copy.runNotTriggered;
    if (result.messageCount === 0) return copy.runNoRecipients;
    const count = (key: string) => Number(result.summary[key] ?? 0);
    const inbox =
      result.messageCount === 1
        ? copy.runSentOne
        : formatI18nTemplate(copy.runSentMany, { count: result.messageCount });
    const failed = count("emailFailed");
    const sent = count("emailSent");
    const email =
      failed > 0
        ? formatI18nTemplate(copy.runEmailFailed, { failed })
        : count("emailSkippedBySystem") > 0
          ? copy.runEmailNotSetUp
          : sent > 0
            ? formatI18nTemplate(copy.runEmailSent, { sent })
            : count("emailSkippedByPreference") > 0
              ? copy.runEmailOff
              : "";
    return email ? `${inbox} ${email}` : inbox;
  }

  async function handleRunNow(rule: NotificationRuleData) {
    if (runningId) return;
    setRunningId(rule.id);
    try {
      const result = await requestAdminService<NotificationRuleRunData>(
        "notification-rules/run",
        {
          method: "POST",
          body: { ruleId: rule.id },
        },
      );
      // A skipped evaluation checked nothing: the rule's site is gone or its
      // condition is broken, which "nothing to send" would hide.
      if (result.evaluation.status === "skipped") toast.error(copy.runSkipped);
      else toast.success(describeRunResult(result));
      await queryClient.invalidateQueries({ queryKey: rulesQueryKey });
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? formatI18nTemplate(copy.runFailedWithReason, {
              reason: error.message,
            })
          : copy.runFailed,
      );
    } finally {
      setRunningId("");
    }
  }

  return (
    <SettingsPage
      title={messages.settingsNav.notifications}
      width="wide"
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => setTestDialogOpen(true)}
          >
            <SendIcon data-icon="inline-start" />
            <span>{copy.sendTestNotification}</span>
          </Button>
          {canCreateRule || loading ? (
            <Button
              type="button"
              onClick={() => openCreate()}
              disabled={!canCreateRule}
            >
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
              <TooltipContent>{copy.addSiteFirst}</TooltipContent>
            </Tooltip>
          )}
        </>
      }
    >
      <SettingsSection
        title={copy.rulesTitle}
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
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.columns.name}</TableHead>
                  <TableHead>{copy.columns.type}</TableHead>
                  <TableHead>{copy.columns.site}</TableHead>
                  <TableHead>{copy.columns.recipient}</TableHead>
                  <TableHead>{copy.columns.schedule}</TableHead>
                  <TableHead>{copy.lastChecked}</TableHead>
                  <TableHead>{copy.columns.nextRun}</TableHead>
                  <TableHead>{copy.columns.status}</TableHead>
                  <TableHead>{copy.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{ruleTypeLabel(copy, rule.type)}</TableCell>
                    <TableCell>{siteLabel(siteById, rule.siteId)}</TableCell>
                    <TableCell>
                      {recipientLabel(copy, rule.recipient, memberByUserId)}
                    </TableCell>
                    <TableCell>{scheduleLabel(copy, rule)}</TableCell>
                    <TableCell>
                      {formatRunAt(locale, rule.lastCheckedAt)}
                    </TableCell>
                    <TableCell>
                      {isCoolingDown(rule, nowSeconds) ? (
                        <span className="text-xs font-medium text-foreground/70">
                          {formatI18nTemplate(copy.coolingDownUntil, {
                            time: formatRunAt(locale, rule.cooldownUntil),
                          })}
                        </span>
                      ) : (
                        <span>
                          {nextRunLabel(copy, locale, rule, nowSeconds)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled
                          ? copy.status.enabled
                          : copy.status.disabled}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <TableActionButton
                          label={`${copy.preview}: ${rule.name}`}
                          disabled={previewingId === rule.id}
                          onClick={() => void handlePreview(rule)}
                          transitionKey={
                            previewingId === rule.id ? "previewing" : "preview"
                          }
                        >
                          {previewingId === rule.id ? (
                            <Spinner className="size-3" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </TableActionButton>
                        <TableActionButton
                          label={`${copy.runNow}: ${rule.name}`}
                          disabled={runningId === rule.id}
                          onClick={() => void handleRunNow(rule)}
                          transitionKey={
                            runningId === rule.id ? "running" : "run"
                          }
                        >
                          {runningId === rule.id ? (
                            <Spinner className="size-3" />
                          ) : (
                            <CirclePlayIcon className="size-4" />
                          )}
                        </TableActionButton>
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

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle icon={SendIcon}>{copy.deliveryTestTitle}</DialogTitle>
            <DialogDescription>
              {copy.deliveryTestDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <CircleCheckIcon className="size-4 text-success" />
              {copy.inAppTestHint}
            </div>
            {emailConfigured !== null ? (
              <div
                className={`flex items-start gap-2${emailConfigured ? " text-foreground" : ""}`}
              >
                <SendIcon
                  className={`mt-0.5 size-4 shrink-0${emailConfigured ? " text-success" : ""}`}
                />
                {/* One span, so the sentence wraps as prose: its text and
                    code fragments would otherwise each be a flex column. */}
                <span>
                  {emailConfigured ? (
                    copy.emailTestConfiguredHint
                  ) : (
                    <EmailNotSetUp messages={messages} />
                  )}
                </span>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTestDialogOpen(false)}
              disabled={testing}
            >
              <XIcon data-icon="inline-start" />
              <span>{messages.teamSelect.cancel}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSendTest}
              disabled={testing}
            >
              {testing ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SendIcon data-icon="inline-start" />
              )}
              <span>{copy.sendTestNotification}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResponsiveDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
      >
        <ResponsiveDialogContent desktopClassName="max-h-[min(860px,calc(100vh-2rem))] max-w-5xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle icon={EyeIcon}>
              {copy.previewDialogTitle}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {copy.previewDialogDescription}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogBody className="space-y-5">
            {previewRule ? (
              <div className="grid gap-3 border bg-muted/20 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.columns.name}
                  </p>
                  <p className="mt-1 font-medium">{previewRule.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.columns.type}
                  </p>
                  <p className="mt-1">
                    {ruleTypeLabel(copy, previewRule.type)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.columns.site}
                  </p>
                  <p className="mt-1">
                    {siteLabel(siteById, previewRule.siteId)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.columns.schedule}
                  </p>
                  <p className="mt-1">{scheduleLabel(copy, previewRule)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.columns.condition}
                  </p>
                  <p className="mt-1">
                    {conditionLabel(
                      copy,
                      messages.conditionDescription,
                      previewRule,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.columns.recipient}
                  </p>
                  <p className="mt-1">
                    {recipientLabel(
                      copy,
                      previewRule.recipient,
                      memberByUserId,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.previewFields.createdAt}
                  </p>
                  <p className="mt-1">
                    {formatRunAt(locale, previewRule.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.previewFields.updatedAt}
                  </p>
                  <p className="mt-1">
                    {formatRunAt(locale, previewRule.updatedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {copy.previewFields.status}
                  </p>
                  <Badge
                    className="mt-1"
                    variant={previewRule.enabled ? "default" : "secondary"}
                  >
                    {previewRule.enabled
                      ? copy.status.enabled
                      : copy.status.disabled}
                  </Badge>
                </div>
              </div>
            ) : null}

            <AutoResizer initial duration={0.2}>
              <AutoTransition
                transitionKey={
                  previewingId
                    ? "loading"
                    : previewResult
                      ? previewResult.status
                      : "empty"
                }
                duration={0.18}
                type="fade"
                initial={false}
                presenceMode="wait"
              >
                {previewingId ? (
                  <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                    <Spinner className="mr-2 size-4" />
                    {copy.previewFields.loadingContent}
                  </div>
                ) : previewResult ? (
                  <div className="space-y-5 text-sm">
                    <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {copy.previewFields.status}
                        </p>
                        <Badge variant="outline">
                          {copy.previewStatuses[previewResult.status]}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {copy.previewFields.summary}
                        </p>
                        <p className="break-words">
                          {previewSummary(previewResult)}
                        </p>
                      </div>
                    </div>

                    {previewResult.status === "triggered" ? (
                      <div className="space-y-5">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {copy.previewFields.title}
                          </p>
                          <p className="font-medium">
                            {previewResult.message.title}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {copy.previewFields.htmlPreview}
                          </p>
                          {previewResult.message.bodyHtml ? (
                            <iframe
                              title={copy.previewFields.htmlPreview}
                              sandbox=""
                              srcDoc={previewResult.message.bodyHtml}
                              className="h-[520px] w-full border bg-white"
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center border bg-muted/20 text-xs text-muted-foreground">
                              {copy.previewFields.noHtmlPreview}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {copy.previewFields.bodyText}
                          </p>
                          <OverlayScrollbar
                            axis="vertical"
                            className="max-h-64 bg-muted"
                          >
                            <pre className="whitespace-pre-wrap p-3 text-xs leading-5">
                              {previewResult.message.bodyText}
                            </pre>
                          </OverlayScrollbar>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="h-1" />
                )}
              </AutoTransition>
            </AutoResizer>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewDialogOpen(false)}
            >
              <XIcon data-icon="inline-start" />
              <span>{messages.teamSelect.cancel}</span>
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ResponsiveDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <ResponsiveDialogContent
          className="flex flex-col overflow-hidden p-0"
          desktopClassName="max-h-[min(860px,calc(100vh-1rem))] max-w-6xl"
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
              terms={messages.conditionDescription}
              locale={locale}
              form={form}
              sites={sites}
              members={members}
              currentUserId={currentUserId}
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
            <AlertDialogTitle>
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
