import { useEffect, useMemo, useRef, useState } from "react";
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
import { Input } from "@insightflare/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { Skeleton } from "@insightflare/ui/skeleton";
import { Slider } from "@insightflare/ui/slider";
import { Spinner } from "@insightflare/ui/spinner";
import { Switch } from "@insightflare/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CodeBlock } from "@/components/common/code-block";
import { CopyButton } from "@/components/common/copy-button";
import { DangerRow, DangerZone } from "@/components/settings/danger-zone";
import { SaveButton } from "@/components/settings/save-button";
import {
  SettingsCard,
  SettingsCardFooter,
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import {
  BLOCKING_FIELD_IDS,
  type BlockingFieldId,
  type BlockingRuleSyntaxError,
  validateBlockingRules,
} from "@/lib/blocking";
import { buildSitePath } from "@/lib/dashboard/paths";
import { dashboardShellQueryOptions } from "@/lib/dashboard/route-query";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import { useRouter } from "@/lib/router";
import {
  DEFAULT_SITE_SCRIPT_SETTINGS,
  normalizeSiteScriptSettings,
  type SiteSettingsConfig,
  type TrackingStrength,
} from "@/lib/site-settings";

import { BlockingRuleEditor } from "./blocking-rule-controls";
import {
  blockingEditorLines,
  type BlockingEditorValues,
  blockingEditorValues,
  blockingRuleErrorMessage,
  formatSampleRateValue,
  postJson,
  randomPublicSlug,
  resolveSiteSlug,
  type SiteSettingsClientPageProps,
} from "./settings-model";

/** A site's settings: titled sections of rows, as Settings lays them out. */
export function SettingsClientPage({
  locale,
  messages,
  siteSlug,
  site,
  initialData = null,
}: SiteSettingsClientPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const copy = messages.siteSettings;
  const initialTrackerSettings = normalizeSiteScriptSettings(
    initialData?.config,
  );
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain);
  const [publicEnabled, setPublicEnabled] = useState(
    Boolean(site.publicEnabled),
  );
  const [publicSlug, setPublicSlug] = useState(site.publicSlug || "");
  const [persistedName, setPersistedName] = useState(site.name);
  const [persistedDomain, setPersistedDomain] = useState(site.domain);
  const [persistedPublicEnabled, setPersistedPublicEnabled] = useState(
    Boolean(site.publicEnabled),
  );
  const [persistedPublicSlug, setPersistedPublicSlug] = useState(
    site.publicSlug || "",
  );
  const [saving, setSaving] = useState(false);
  const [savingPublicSharing, setSavingPublicSharing] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [savingProtection, setSavingProtection] = useState(false);
  const [savingBlockingField, setSavingBlockingField] =
    useState<BlockingFieldId | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentSiteSlug, setCurrentSiteSlug] = useState(siteSlug);
  const [trackingStrength, setTrackingStrength] = useState<TrackingStrength>(
    initialTrackerSettings.trackingStrength,
  );
  const [botProtectionEnabled, setBotProtectionEnabled] = useState(
    initialTrackerSettings.botProtectionEnabled,
  );
  const [hostingProxyBlockingEnabled, setHostingProxyBlockingEnabled] =
    useState(initialTrackerSettings.hostingProxyBlockingEnabled);
  const [trackQueryParams, setTrackQueryParams] = useState(
    initialTrackerSettings.trackQueryParams,
  );
  const [trackHash, setTrackHash] = useState(initialTrackerSettings.trackHash);
  const [ignoreDoNotTrack, setIgnoreDoNotTrack] = useState(
    initialTrackerSettings.ignoreDoNotTrack,
  );
  const [autoTrackOutboundLinks, setAutoTrackOutboundLinks] = useState(
    initialTrackerSettings.autoTrackOutboundLinks,
  );
  const [performanceSampleRate, setPerformanceSampleRate] = useState(
    initialTrackerSettings.performanceSampleRate,
  );
  const [blockingInputs, setBlockingInputs] = useState<BlockingEditorValues>(
    () => blockingEditorValues(initialData?.config),
  );
  const [persistedBlockingInputs, setPersistedBlockingInputs] =
    useState<BlockingEditorValues>(() =>
      blockingEditorValues(initialData?.config),
    );
  const [persistedSettings, setPersistedSettings] = useState(
    initialTrackerSettings,
  );
  const [origin, setOrigin] = useState(initialData?.origin ?? "");
  const appliedConfigSiteIdRef = useRef<string | null>(null);
  const appliedSnippetSiteIdRef = useRef<string | null>(null);

  const trackerSaving =
    savingTracking || savingProtection || savingBlockingField !== null;

  const hasSiteInfoChanges =
    name.trim() !== persistedName.trim() ||
    domain.trim() !== persistedDomain.trim();

  const hasPublicSharingChanges =
    publicEnabled !== persistedPublicEnabled ||
    publicSlug.trim() !== persistedPublicSlug.trim();

  const normalizedPerformanceSampleRate = normalizeSiteScriptSettings({
    performanceSampleRate,
  }).performanceSampleRate;

  const hasTrackingChanges =
    trackingStrength !== persistedSettings.trackingStrength ||
    trackQueryParams !== persistedSettings.trackQueryParams ||
    trackHash !== persistedSettings.trackHash ||
    ignoreDoNotTrack !== persistedSettings.ignoreDoNotTrack ||
    autoTrackOutboundLinks !== persistedSettings.autoTrackOutboundLinks ||
    normalizedPerformanceSampleRate !== persistedSettings.performanceSampleRate;

  const hasProtectionChanges =
    botProtectionEnabled !== persistedSettings.botProtectionEnabled ||
    hostingProxyBlockingEnabled !==
      persistedSettings.hostingProxyBlockingEnabled;

  const blockingValidation = useMemo(
    () =>
      Object.fromEntries(
        BLOCKING_FIELD_IDS.map((field) => {
          const errors = validateBlockingRules({
            blockingRules: [
              {
                version: 2,
                data: { [field]: blockingEditorLines(blockingInputs[field]) },
              },
            ],
          }).filter((error) => error.field === field);
          return [field, errors];
        }),
      ) as unknown as Record<
        BlockingFieldId,
        readonly BlockingRuleSyntaxError[]
      >,
    [blockingInputs],
  );

  function applyTrackerSettings(raw: unknown) {
    const normalized = normalizeSiteScriptSettings(raw);
    setPersistedSettings(normalized);
    setTrackingStrength(normalized.trackingStrength);
    setBotProtectionEnabled(normalized.botProtectionEnabled);
    setHostingProxyBlockingEnabled(normalized.hostingProxyBlockingEnabled);
    setTrackQueryParams(normalized.trackQueryParams);
    setTrackHash(normalized.trackHash);
    setIgnoreDoNotTrack(normalized.ignoreDoNotTrack);
    setAutoTrackOutboundLinks(normalized.autoTrackOutboundLinks);
    setPerformanceSampleRate(normalized.performanceSampleRate);
    const nextBlockingInputs = blockingEditorValues(raw);
    setBlockingInputs(nextBlockingInputs);
    setPersistedBlockingInputs(nextBlockingInputs);
  }

  const siteConfigQuery = useQuery({
    queryKey: ["dashboard", "site-config", site.id],
    queryFn: ({ signal }) =>
      requestAdminService<SiteSettingsConfig>("site-config", {
        params: { siteId: site.id },
        signal,
      }),
    initialData: initialData?.config,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const scriptSnippetQuery = useQuery({
    queryKey: ["dashboard", "site-script-snippet", site.id],
    queryFn: async ({ signal }) => {
      const data = await requestAdminService<{
        siteId: string;
        src: string;
        snippet: string;
      }>("script-snippet", {
        params: { siteId: site.id },
        signal,
      });
      return data.snippet;
    },
    initialData: initialData?.scriptSnippet,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const loadingSettings = siteConfigQuery.isPending;
  const loadingScript = scriptSnippetQuery.isPending;
  const scriptSnippet = scriptSnippetQuery.data ?? "";
  const trackerDisabled =
    saving || trackerSaving || deleting || loadingSettings;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (
      siteConfigQuery.isPending ||
      appliedConfigSiteIdRef.current === site.id
    ) {
      return;
    }
    applyTrackerSettings(siteConfigQuery.data ?? DEFAULT_SITE_SCRIPT_SETTINGS);
    appliedConfigSiteIdRef.current = site.id;
    if (siteConfigQuery.isError) toast.error(copy.toasts.settingsLoadFailed);
  }, [
    copy.toasts.settingsLoadFailed,
    site.id,
    siteConfigQuery.data,
    siteConfigQuery.isError,
    siteConfigQuery.isPending,
  ]);

  useEffect(() => {
    if (
      scriptSnippetQuery.isPending ||
      appliedSnippetSiteIdRef.current === site.id
    ) {
      return;
    }
    appliedSnippetSiteIdRef.current = site.id;
    if (scriptSnippetQuery.isError) toast.error(copy.toasts.scriptLoadFailed);
  }, [
    copy.toasts.scriptLoadFailed,
    scriptSnippetQuery.isError,
    scriptSnippetQuery.isPending,
    site.id,
  ]);

  /** After a rename the site's slug may change: follow it. */
  async function followSiteSlug(updated: SiteData) {
    const nextSlug = resolveSiteSlug(updated);
    queryClient.removeQueries({
      queryKey: dashboardShellQueryOptions.queryKey,
    });
    if (nextSlug !== currentSiteSlug) {
      setCurrentSiteSlug(nextSlug);
      await router.replace(buildSitePath(locale, nextSlug, "settings"));
    } else {
      await router.refresh();
    }
  }

  function saveFailed(error: unknown) {
    const message =
      error instanceof Error ? error.message : copy.toasts.saveFailed;
    toast.error(message || copy.toasts.saveFailed);
  }

  async function handleSave() {
    if (name.trim().length < 2 || domain.trim().length < 3) {
      toast.error(copy.toasts.invalidInput);
      return;
    }
    if (!hasSiteInfoChanges) return;

    setSaving(true);
    try {
      const updated = await postJson<SiteData>(
        "sites",
        {
          intent: "update",
          siteId: site.id,
          name: name.trim(),
          domain: domain.trim(),
        },
        "PATCH",
      );
      setName(updated.name);
      setDomain(updated.domain);
      setPersistedName(updated.name);
      setPersistedDomain(updated.domain);
      toast.success(copy.toasts.saved);
      await followSiteSlug(updated);
    } catch (error) {
      saveFailed(error);
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePublicSharing() {
    if (!hasPublicSharingChanges) return;

    setSavingPublicSharing(true);
    try {
      const nextPublicSlug = publicEnabled
        ? publicSlug.trim() || randomPublicSlug()
        : publicSlug.trim();
      const updated = await postJson<SiteData>(
        "sites",
        {
          intent: "update",
          siteId: site.id,
          publicEnabled,
          publicSlug: nextPublicSlug || undefined,
        },
        "PATCH",
      );
      const updatedPublicEnabled = Boolean(updated.publicEnabled);
      const updatedPublicSlug = updated.publicSlug || "";
      setPublicEnabled(updatedPublicEnabled);
      setPublicSlug(updatedPublicSlug);
      setPersistedPublicEnabled(updatedPublicEnabled);
      setPersistedPublicSlug(updatedPublicSlug);
      toast.success(copy.toasts.saved);
      await followSiteSlug(updated);
    } catch (error) {
      saveFailed(error);
    } finally {
      setSavingPublicSharing(false);
    }
  }

  async function persistTrackingSettings(input: Record<string, unknown>) {
    const savedSettings = await postJson<SiteSettingsConfig>("site-config", {
      siteId: site.id,
      config: input,
    });
    applyTrackerSettings(savedSettings);
    toast.success(
      `${copy.toasts.saved} ${copy.toasts.settingsPropagationHint}`,
    );
  }

  async function handleSaveTracking() {
    if (!hasTrackingChanges) return;
    // Saving applies the server's settings to every field, so the
    // protection switches' unsaved changes are put back afterwards.
    const pendingBotProtection = botProtectionEnabled;
    const pendingHostingProxyBlocking = hostingProxyBlockingEnabled;
    setSavingTracking(true);
    try {
      await persistTrackingSettings({
        trackingStrength,
        trackQueryParams,
        trackHash,
        ignoreDoNotTrack,
        autoTrackOutboundLinks,
        performanceSampleRate: normalizedPerformanceSampleRate,
      });
      setBotProtectionEnabled(pendingBotProtection);
      setHostingProxyBlockingEnabled(pendingHostingProxyBlocking);
    } catch (error) {
      saveFailed(error);
    } finally {
      setSavingTracking(false);
    }
  }

  async function handleSaveProtection() {
    if (!hasProtectionChanges) return;
    setSavingProtection(true);
    try {
      await persistTrackingSettings({
        botProtectionEnabled,
        hostingProxyBlockingEnabled,
      });
    } catch (error) {
      saveFailed(error);
    } finally {
      setSavingProtection(false);
    }
  }

  async function handleSaveBlockingField(field: BlockingFieldId) {
    if (blockingInputs[field] === persistedBlockingInputs[field]) return;
    const errors = blockingValidation[field];
    if (errors.length > 0) {
      toast.error(
        blockingRuleErrorMessage(
          errors[0],
          copy.blockingRulesFields[field],
          copy.blockingRulesDialogs,
        ),
      );
      return;
    }
    setSavingBlockingField(field);
    try {
      const savedSettings = await postJson<SiteSettingsConfig>("site-config", {
        siteId: site.id,
        config: {},
        blockingPatch: {
          [field]: blockingEditorLines(blockingInputs[field]),
        },
      });
      applyTrackerSettings(savedSettings);
      toast.success(
        `${copy.toasts.saved} ${copy.toasts.settingsPropagationHint}`,
      );
    } catch (error) {
      saveFailed(error);
    } finally {
      setSavingBlockingField(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await postJson<{ siteId: string; teamId: string; removed: boolean }>(
        "sites",
        {
          intent: "remove",
          siteId: site.id,
        },
        "PATCH",
      );
      toast.success(copy.toasts.deleted);
      setDeleteDialogOpen(false);
      queryClient.removeQueries({
        queryKey: dashboardShellQueryOptions.queryKey,
      });
      await router.push(`/${locale}/app`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : copy.toasts.deleteFailed;
      toast.error(message || copy.toasts.deleteFailed);
    } finally {
      setDeleting(false);
    }
  }

  const publicLink =
    publicEnabled && publicSlug.trim() && origin
      ? `${origin}/share/${encodeURIComponent(publicSlug.trim())}`
      : "";

  const strengthOptions = [
    {
      value: "strong" as const,
      label: copy.trackingStrengthStrong,
      description: copy.trackingStrengthStrongDescription,
    },
    {
      value: "smart" as const,
      label: copy.trackingStrengthSmart,
      description: copy.trackingStrengthSmartDescription,
    },
    {
      value: "weak" as const,
      label: copy.trackingStrengthWeak,
      description: copy.trackingStrengthWeakDescription,
    },
  ];

  const trackingSwitches = [
    {
      id: "site-settings-track-query",
      label: copy.trackQueryParamsLabel,
      checked: trackQueryParams,
      onChange: setTrackQueryParams,
    },
    {
      id: "site-settings-track-hash",
      label: copy.trackHashLabel,
      checked: trackHash,
      onChange: setTrackHash,
    },
    {
      id: "site-settings-ignore-dnt",
      label: copy.ignoreDoNotTrackLabel,
      checked: ignoreDoNotTrack,
      onChange: setIgnoreDoNotTrack,
    },
    {
      id: "site-settings-auto-track-outbound",
      label: copy.autoTrackOutboundLinksLabel,
      description: copy.autoTrackOutboundLinksHint,
      checked: autoTrackOutboundLinks,
      onChange: setAutoTrackOutboundLinks,
    },
  ];

  const protectionSwitches = [
    {
      id: "site-settings-bot-protection",
      label: copy.botProtectionEnabledLabel,
      description: copy.botProtectionEnabledHint,
      checked: botProtectionEnabled,
      onChange: setBotProtectionEnabled,
    },
    {
      id: "site-settings-hosting-proxy-blocking",
      label: copy.hostingProxyBlockingEnabledLabel,
      description: copy.hostingProxyBlockingEnabledHint,
      checked: hostingProxyBlockingEnabled,
      onChange: setHostingProxyBlockingEnabled,
    },
  ];

  return (
    <SettingsPage title={copy.title}>
      <SettingsSection title={copy.sections.basic.title}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <SettingsCard>
            <SettingsRow label={copy.nameLabel} htmlFor="site-settings-name">
              <Input
                id="site-settings-name"
                className="sm:w-72"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                disabled={saving || deleting}
                required
              />
            </SettingsRow>
            <SettingsRow
              label={copy.domainLabel}
              htmlFor="site-settings-domain"
            >
              <Input
                id="site-settings-domain"
                className="sm:w-72"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                minLength={3}
                disabled={saving || deleting}
                required
              />
            </SettingsRow>
            <SettingsCardFooter>
              <SaveButton
                label={copy.save}
                savingLabel={copy.saving}
                saving={saving}
                disabled={deleting || !hasSiteInfoChanges}
              />
            </SettingsCardFooter>
          </SettingsCard>
        </form>
      </SettingsSection>

      <SettingsSection title={copy.scriptTitle}>
        <SettingsCard>
          <div className="space-y-3 px-5 py-4">
            {loadingScript ? (
              <Skeleton className="h-16 w-full" />
            ) : scriptSnippet ? (
              <CodeBlock
                value={scriptSnippet}
                copyLabel={copy.copyScript}
                copiedLabel={copy.copiedScript}
                wrap={false}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {copy.scriptUnavailable}
              </p>
            )}
            <p className="text-sm text-muted-foreground">{copy.scriptHint}</p>
          </div>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={copy.publicSharingTitle}>
        <SettingsCard>
          <SettingsRow
            label={copy.publicEnabledLabel}
            htmlFor="site-settings-public-enabled"
          >
            <Switch
              id="site-settings-public-enabled"
              checked={publicEnabled}
              disabled={savingPublicSharing || deleting}
              onCheckedChange={(enabled) => {
                setPublicEnabled(enabled);
                if (enabled && !publicSlug.trim()) {
                  setPublicSlug(randomPublicSlug());
                }
              }}
            />
          </SettingsRow>
          <SettingsRow
            label={copy.publicSlugLabel}
            description={copy.publicSlugHint}
            htmlFor="site-settings-public-slug"
          >
            <Input
              id="site-settings-public-slug"
              className="sm:w-56"
              value={publicSlug}
              placeholder={copy.publicSlugPlaceholder}
              onChange={(event) => setPublicSlug(event.target.value)}
              disabled={savingPublicSharing || deleting}
            />
          </SettingsRow>
          {publicLink ? (
            <SettingsRow
              label={copy.publicLinkLabel}
              description={
                <a
                  href={publicLink}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all hover:text-foreground hover:underline"
                >
                  {publicLink}
                </a>
              }
            >
              <CopyButton
                value={publicLink}
                label={messages.teamManagement.publicLinks.copyLink}
                copiedLabel={copy.copiedLink}
              />
            </SettingsRow>
          ) : null}
          <SettingsCardFooter>
            <SaveButton
              type="button"
              label={copy.save}
              savingLabel={copy.saving}
              saving={savingPublicSharing}
              disabled={deleting || !hasPublicSharingChanges}
              onClick={() => {
                void handleSavePublicSharing();
              }}
            />
          </SettingsCardFooter>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={copy.sections.tracking.title}>
        <SettingsCard>
          <SettingsRow
            label={copy.trackingStrengthGroupTitle}
            description={
              strengthOptions.find(
                (option) => option.value === trackingStrength,
              )?.description
            }
            htmlFor="site-settings-tracking-strength"
          >
            <Select
              value={trackingStrength}
              disabled={trackerDisabled}
              onValueChange={(value) =>
                setTrackingStrength(value as TrackingStrength)
              }
            >
              <SelectTrigger
                id="site-settings-tracking-strength"
                className="w-full sm:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {strengthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          {trackingSwitches.map((row) => (
            <SettingsRow
              key={row.id}
              label={row.label}
              description={row.description}
              htmlFor={row.id}
            >
              <Switch
                id={row.id}
                checked={row.checked}
                disabled={trackerDisabled}
                onCheckedChange={(checked) => row.onChange(checked)}
              />
            </SettingsRow>
          ))}
          <SettingsRow
            label={copy.performanceSampleRateLabel}
            description={copy.performanceSampleRateHint}
            htmlFor="site-settings-performance-sample-rate"
          >
            <Slider
              id="site-settings-performance-sample-rate"
              className="w-40"
              min={0}
              max={100}
              step={1}
              value={[normalizedPerformanceSampleRate]}
              onValueChange={(value) => {
                setPerformanceSampleRate(value[0] ?? 0);
              }}
              aria-label={copy.performanceSampleRateLabel}
              disabled={trackerDisabled}
            />
            <span className="w-10 text-right text-sm text-muted-foreground tabular-nums">
              {formatSampleRateValue(normalizedPerformanceSampleRate)}
            </span>
          </SettingsRow>
          <SettingsCardFooter>
            <SaveButton
              type="button"
              label={copy.saveTracking}
              savingLabel={copy.savingTracking}
              saving={savingTracking}
              disabled={trackerDisabled || !hasTrackingChanges}
              onClick={() => {
                void handleSaveTracking();
              }}
            />
          </SettingsCardFooter>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={copy.sections.protection.title}>
        <SettingsCard>
          {protectionSwitches.map((row) => (
            <SettingsRow
              key={row.id}
              label={row.label}
              description={row.description}
              htmlFor={row.id}
            >
              <Switch
                id={row.id}
                checked={row.checked}
                disabled={trackerDisabled}
                onCheckedChange={(checked) => row.onChange(checked)}
              />
            </SettingsRow>
          ))}
          <SettingsCardFooter>
            <SaveButton
              type="button"
              label={copy.saveTracking}
              savingLabel={copy.savingTracking}
              saving={savingProtection}
              disabled={trackerDisabled || !hasProtectionChanges}
              onClick={() => {
                void handleSaveProtection();
              }}
            />
          </SettingsCardFooter>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={copy.sections.blocking.title}>
        <SettingsCard>
          {BLOCKING_FIELD_IDS.map((field) => (
            <BlockingRuleEditor
              key={field}
              field={field}
              locale={locale}
              copy={copy.blockingRulesFields[field]}
              dialogCopy={copy.blockingRulesDialogs}
              value={blockingInputs[field]}
              errors={blockingValidation[field]}
              disabled={trackerDisabled}
              saving={savingBlockingField === field}
              changed={blockingInputs[field] !== persistedBlockingInputs[field]}
              onChange={(value) => {
                setBlockingInputs((current) => ({
                  ...current,
                  [field]: value,
                }));
              }}
              onSave={() => {
                void handleSaveBlockingField(field);
              }}
              saveLabel={copy.blockingRulesSave}
              savingLabel={copy.blockingRulesSaving}
            />
          ))}
        </SettingsCard>
      </SettingsSection>

      <DangerZone title={copy.sections.danger.title}>
        <DangerRow
          label={copy.deleteTitle}
          description={copy.deleteSubtitle}
          action={copy.delete}
          disabled={saving || trackerSaving || deleting}
          onClick={() => setDeleteDialogOpen(true)}
        />
      </DangerZone>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {messages.settingsNav.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? <Spinner className="size-4" /> : null}
              {deleting ? copy.deleting : copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPage>
  );
}
