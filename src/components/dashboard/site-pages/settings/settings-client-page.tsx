import { useEffect, useRef, useState } from "react";
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
import { Button } from "@insightflare/ui/button";
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
import { ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";

import { CodeBlock } from "@/components/common/code-block";
import { CopyButton } from "@/components/common/copy-button";
import { DangerRow, DangerZone } from "@/components/settings/danger-zone";
import { LabelWithInfo } from "@/components/settings/info-tooltip";
import { SaveButton } from "@/components/settings/save-button";
import {
  SettingsCard,
  SettingsCardFooter,
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { buildSitePath, buildSystemHealthPath } from "@/lib/dashboard/paths";
import { dashboardShellQueryOptions } from "@/lib/dashboard/route-query";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import Link, { useRouter } from "@/lib/router";
import {
  normalizeSiteScriptSettings,
  type SiteScriptSettings,
  type SiteSettingsConfig,
  type TrackingStrength,
} from "@/lib/site-settings";

import { BlockingRulesList } from "./blocking-rules-list";
import {
  formatSampleRateValue,
  postJson,
  randomPublicSlug,
  resolveSiteSlug,
  type SiteSettingsClientPageProps,
} from "./settings-model";

const TRACKING_STRENGTHS: readonly TrackingStrength[] = [
  "strong",
  "smart",
  "weak",
];

// The tracker settings each switch on the page controls.
type SwitchSetting =
  | "trackQueryParams"
  | "trackHash"
  | "ignoreDoNotTrack"
  | "autoTrackOutboundLinks"
  | "botProtectionEnabled"
  | "hostingProxyBlockingEnabled";

/**
 * A site's settings, in the order a new site needs them: install, the
 * basics, sharing, tracking, protection, then the advanced and the
 * destructive. Switches and selects save as they change; text saves on
 * blur or with its form's Save.
 */
export function SettingsClientPage({
  locale,
  messages,
  siteSlug,
  site,
  canViewSystemHealth,
  initialData = null,
}: SiteSettingsClientPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const copy = messages.siteSettings;
  const [persistedName, setPersistedName] = useState(site.name);
  const [persistedDomain, setPersistedDomain] = useState(site.domain);
  const [name, setName] = useState(site.name);
  const [domain, setDomain] = useState(site.domain);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [publicEnabled, setPublicEnabled] = useState(
    Boolean(site.publicEnabled),
  );
  const [persistedPublicSlug, setPersistedPublicSlug] = useState(
    site.publicSlug || "",
  );
  const [publicSlug, setPublicSlug] = useState(site.publicSlug || "");
  const [savingSharing, setSavingSharing] = useState(false);
  const [settings, setSettings] = useState<SiteScriptSettings>(() =>
    normalizeSiteScriptSettings(initialData?.config),
  );
  const [sampleRate, setSampleRate] = useState(settings.performanceSampleRate);
  const [savingTracker, setSavingTracker] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentSiteSlug, setCurrentSiteSlug] = useState(siteSlug);
  const [origin, setOrigin] = useState(initialData?.origin ?? "");
  const appliedConfigSiteIdRef = useRef<string | null>(null);
  const appliedSnippetSiteIdRef = useRef<string | null>(null);

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
  const scriptSnippet = scriptSnippetQuery.data ?? "";
  const trackerDisabled = savingTracker || deleting || loadingSettings;
  const generalChanged =
    name.trim() !== persistedName.trim() ||
    domain.trim() !== persistedDomain.trim();

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
    const loaded = normalizeSiteScriptSettings(siteConfigQuery.data);
    setSettings(loaded);
    setSampleRate(loaded.performanceSampleRate);
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

  function trackerSaved() {
    toast.success(
      `${copy.toasts.saved} ${copy.toasts.settingsPropagationHint}`,
    );
  }

  async function saveGeneral() {
    if (name.trim().length < 2 || domain.trim().length < 3) {
      toast.error(copy.toasts.invalidInput);
      return;
    }
    if (!generalChanged) return;
    setSavingGeneral(true);
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
      setSavingGeneral(false);
    }
  }

  async function saveSharing(enabled: boolean, slug: string) {
    const previousEnabled = publicEnabled;
    setPublicEnabled(enabled);
    setSavingSharing(true);
    try {
      const updated = await postJson<SiteData>(
        "sites",
        {
          intent: "update",
          siteId: site.id,
          publicEnabled: enabled,
          publicSlug: slug || undefined,
        },
        "PATCH",
      );
      setPublicEnabled(Boolean(updated.publicEnabled));
      setPublicSlug(updated.publicSlug || "");
      setPersistedPublicSlug(updated.publicSlug || "");
      toast.success(copy.toasts.saved);
      await followSiteSlug(updated);
    } catch (error) {
      setPublicEnabled(previousEnabled);
      setPublicSlug(persistedPublicSlug);
      saveFailed(error);
    } finally {
      setSavingSharing(false);
    }
  }

  /** Saves one tracker setting, showing it at once and undoing it on failure. */
  async function saveTracker(patch: Partial<SiteScriptSettings>) {
    const previous = settings;
    setSettings({ ...settings, ...patch });
    setSavingTracker(true);
    try {
      const saved = await postJson<SiteSettingsConfig>("site-config", {
        siteId: site.id,
        config: patch,
      });
      const normalized = normalizeSiteScriptSettings(saved);
      setSettings(normalized);
      setSampleRate(normalized.performanceSampleRate);
      trackerSaved();
    } catch (error) {
      setSettings(previous);
      setSampleRate(previous.performanceSampleRate);
      saveFailed(error);
    } finally {
      setSavingTracker(false);
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
    publicEnabled && persistedPublicSlug && origin
      ? `${origin}/share/${encodeURIComponent(persistedPublicSlug)}`
      : "";

  const strengthLabels: Record<TrackingStrength, string> = {
    strong: copy.trackingStrengthStrong,
    smart: copy.trackingStrengthSmart,
    weak: copy.trackingStrengthWeak,
  };
  const strengthDescriptions: Record<TrackingStrength, string> = {
    strong: copy.trackingStrengthStrongDescription,
    smart: copy.trackingStrengthSmartDescription,
    weak: copy.trackingStrengthWeakDescription,
  };

  const trackingSwitches: Array<{
    key: SwitchSetting;
    label: string;
    description?: string;
  }> = [
    { key: "trackQueryParams", label: copy.trackQueryParamsLabel },
    { key: "trackHash", label: copy.trackHashLabel },
    { key: "ignoreDoNotTrack", label: copy.ignoreDoNotTrackLabel },
    {
      key: "autoTrackOutboundLinks",
      label: copy.autoTrackOutboundLinksLabel,
      description: copy.autoTrackOutboundLinksHint,
    },
  ];
  const protectionSwitches: Array<{
    key: SwitchSetting;
    label: string;
    description: string;
  }> = [
    {
      key: "botProtectionEnabled",
      label: copy.botProtectionEnabledLabel,
      description: copy.botProtectionEnabledHint,
    },
    {
      key: "hostingProxyBlockingEnabled",
      label: copy.hostingProxyBlockingEnabledLabel,
      description: copy.hostingProxyBlockingEnabledHint,
    },
  ];

  function switchRow(row: {
    key: SwitchSetting;
    label: string;
    description?: string;
  }) {
    const id = `site-settings-${row.key}`;
    return (
      <SettingsRow
        key={row.key}
        label={row.label}
        description={row.description}
        htmlFor={id}
      >
        <Switch
          id={id}
          checked={settings[row.key]}
          disabled={trackerDisabled}
          onCheckedChange={(checked) =>
            void saveTracker({ [row.key]: checked })
          }
        />
      </SettingsRow>
    );
  }

  return (
    <SettingsPage title={persistedName} subtitle={copy.title}>
      <SettingsSection title={copy.sections.install.title}>
        <SettingsCard>
          <div className="space-y-3 px-5 py-4">
            {scriptSnippetQuery.isPending ? (
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

      <SettingsSection title={copy.sections.basic.title}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveGeneral();
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
                disabled={savingGeneral || deleting}
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
                disabled={savingGeneral || deleting}
                required
              />
            </SettingsRow>
            <SettingsCardFooter>
              <SaveButton
                label={copy.save}
                savingLabel={copy.saving}
                saving={savingGeneral}
                disabled={deleting || !generalChanged}
              />
            </SettingsCardFooter>
          </SettingsCard>
        </form>
      </SettingsSection>

      <SettingsSection title={copy.publicSharingTitle}>
        <SettingsCard>
          <SettingsRow
            label={copy.publicEnabledLabel}
            description={copy.publicEnabledHint}
            htmlFor="site-settings-public-enabled"
          >
            <Switch
              id="site-settings-public-enabled"
              checked={publicEnabled}
              disabled={savingSharing || deleting}
              onCheckedChange={(enabled) =>
                void saveSharing(
                  enabled,
                  enabled
                    ? persistedPublicSlug || randomPublicSlug()
                    : persistedPublicSlug,
                )
              }
            />
          </SettingsRow>
          {publicEnabled ? (
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
                onBlur={() => {
                  const slug = publicSlug.trim();
                  if (slug && slug !== persistedPublicSlug) {
                    void saveSharing(true, slug);
                  } else {
                    setPublicSlug(persistedPublicSlug);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                disabled={savingSharing || deleting}
              />
            </SettingsRow>
          ) : null}
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
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title={copy.sections.tracking.title}>
        <SettingsCard>
          <SettingsRow
            label={
              <LabelWithInfo
                label={copy.trackingStrengthGroupTitle}
                info={
                  <span className="block space-y-1">
                    {TRACKING_STRENGTHS.map((strength) => (
                      <span key={strength} className="block">
                        <strong>{strengthLabels[strength]}:</strong>{" "}
                        {strengthDescriptions[strength]}
                      </span>
                    ))}
                  </span>
                }
              />
            }
            htmlFor="site-settings-tracking-strength"
          >
            <Select
              value={settings.trackingStrength}
              disabled={trackerDisabled}
              onValueChange={(value) =>
                void saveTracker({
                  trackingStrength: value as TrackingStrength,
                })
              }
            >
              <SelectTrigger
                id="site-settings-tracking-strength"
                className="w-full sm:w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRACKING_STRENGTHS.map((strength) => (
                  <SelectItem key={strength} value={strength}>
                    {strengthLabels[strength]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
          {trackingSwitches.map(switchRow)}
          <SettingsRow
            label={
              <LabelWithInfo
                label={copy.performanceSampleRateLabel}
                info={copy.performanceSampleRateHint}
              />
            }
            htmlFor="site-settings-performance-sample-rate"
          >
            <Slider
              id="site-settings-performance-sample-rate"
              className="w-40"
              min={0}
              max={100}
              step={1}
              value={[sampleRate]}
              onValueChange={(value) => setSampleRate(value[0] ?? 0)}
              onValueCommit={(value) => {
                const next = value[0] ?? 0;
                if (next !== settings.performanceSampleRate) {
                  void saveTracker({ performanceSampleRate: next });
                }
              }}
              aria-label={copy.performanceSampleRateLabel}
              disabled={trackerDisabled}
            />
            <span className="w-10 text-right text-sm text-muted-foreground tabular-nums">
              {formatSampleRateValue(sampleRate)}
            </span>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title={copy.sections.protection.title}
        action={
          canViewSystemHealth ? (
            <Button asChild variant="link" size="sm">
              <Link href={buildSystemHealthPath(locale, "blocked")}>
                {copy.viewBlockedRequests}
              </Link>
            </Button>
          ) : null
        }
      >
        <SettingsCard>{protectionSwitches.map(switchRow)}</SettingsCard>
      </SettingsSection>

      <details className="group space-y-3">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
          <ChevronRightIcon
            aria-hidden
            className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
          />
          {copy.sections.advanced.title}
        </summary>
        <SettingsSection
          title={
            <LabelWithInfo
              label={copy.sections.blocking.title}
              info={copy.blockingRulesHelp}
            />
          }
        >
          {loadingSettings ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : (
            <BlockingRulesList
              locale={locale}
              messages={messages}
              siteId={site.id}
              config={siteConfigQuery.data}
              disabled={deleting}
              onSaved={trackerSaved}
            />
          )}
        </SettingsSection>
      </details>

      <DangerZone title={copy.sections.danger.title}>
        <DangerRow
          label={copy.deleteTitle}
          description={copy.deleteSubtitle}
          action={copy.delete}
          disabled={savingGeneral || savingTracker || deleting}
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
