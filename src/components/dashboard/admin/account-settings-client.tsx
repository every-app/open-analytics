import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@insightflare/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { Skeleton } from "@insightflare/ui/skeleton";
import { Switch } from "@insightflare/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { SaveButton } from "@/components/settings/save-button";
import {
  SettingsCard,
  SettingsCardFooter,
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { useReportingTimeZone } from "@/components/time-zone-provider";
import {
  buildTimeZoneOptions,
  FALLBACK_TIME_ZONE,
  formatTimeZoneOptionLabel,
  normalizeTimeZone,
  supportedTimeZones,
} from "@/lib/analytics/time-zone";
import { intlLocale } from "@/lib/dashboard/format";
import type { AccountNotificationPreferencesInitialData } from "@/lib/dashboard/management-data";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import {
  type AccountUserData,
  normalizeNotificationPreferencesData,
  type NotificationPreferencesData,
} from "@/lib/dashboard-api/client/edge";
import { isValidLocale, type Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { useRouter } from "@/lib/router";
interface AccountSettingsClientProps {
  locale: Locale;
  messages: AppMessages;
  user: AccountUserData;
  initialData?: AccountNotificationPreferencesInitialData | null;
}
type TimeZoneMode = "browser" | "custom";
type PreferredLocale = "" | Locale;
function sameNotificationPreferences(
  left: NotificationPreferencesData | null,
  right: NotificationPreferencesData | null,
): boolean {
  if (!left || !right) return false;
  const normalizedLeft = normalizeNotificationPreferencesData(left);
  const normalizedRight = normalizeNotificationPreferencesData(right);
  return (
    normalizedLeft.inApp === normalizedRight.inApp &&
    normalizedLeft.email === normalizedRight.email &&
    normalizedLeft.webPush === normalizedRight.webPush &&
    normalizedLeft.attention.reportsCreateUnread ===
      normalizedRight.attention.reportsCreateUnread &&
    normalizedLeft.attention.milestonesCreateUnread ===
      normalizedRight.attention.milestonesCreateUnread &&
    normalizedLeft.attention.alertsCreateUnread ===
      normalizedRight.attention.alertsCreateUnread
  );
}
export function AccountSettingsClient({
  locale,
  messages,
  user,
  initialData = null,
}: AccountSettingsClientProps) {
  const copy = messages.accountSettings;
  const notificationCopy = messages.notificationCenter;
  const router = useRouter();
  const {
    timeZone,
    timeZonePreference,
    browserTimeZone,
    setTimeZonePreference,
  } = useReportingTimeZone();
  const [profileUser, setProfileUser] = useState(user);
  const [profileName, setProfileName] = useState(user.name || "");
  const [preferredLocale, setPreferredLocale] = useState<PreferredLocale>(
    user.preferredLocale || "",
  );
  const [preferredLocaleSaving, setPreferredLocaleSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferencesData | null>(
      initialData?.preferences ?? null,
    );
  const [draftNotificationPreferences, setDraftNotificationPreferences] =
    useState<NotificationPreferencesData | null>(
      initialData?.preferences ?? null,
    );
  const [notificationPreferencesSaving, setNotificationPreferencesSaving] =
    useState(false);
  const appliedNotificationPreferencesUserIdRef = useRef<string | null>(null);
  const notificationPreferencesQuery = useQuery({
    queryKey: ["dashboard", "notification-preferences", user.id],
    queryFn: ({ signal }) =>
      requestAdminService<NotificationPreferencesData>(
        "notifications/preferences",
        { signal },
      ).then(normalizeNotificationPreferencesData),
    initialData: initialData?.preferences,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const notificationPreferencesLoading = notificationPreferencesQuery.isPending;
  const timeZones = useMemo(() => supportedTimeZones(), []);
  const [mode, setMode] = useState<TimeZoneMode>(
    timeZonePreference ? "custom" : "browser",
  );
  const [customTimeZone, setCustomTimeZone] = useState(
    timeZonePreference || timeZone,
  );
  const [saving, setSaving] = useState(false);
  const timeZoneOptionTimestamp = useMemo(() => Date.now(), []);
  const normalizedProfileName = profileName.trim();
  const profileChanged = normalizedProfileName !== (profileUser.name || "");
  const canSaveProfile = !profileSaving && profileChanged;
  const canSaveNotificationPreferences =
    !notificationPreferencesLoading &&
    !notificationPreferencesSaving &&
    Boolean(draftNotificationPreferences) &&
    !sameNotificationPreferences(
      notificationPreferences,
      draftNotificationPreferences,
    );
  const selectedCustomTimeZone =
    normalizeTimeZone(customTimeZone) ||
    normalizeTimeZone(timeZone) ||
    normalizeTimeZone(browserTimeZone) ||
    FALLBACK_TIME_ZONE;
  const timeZoneOptions = useMemo(
    () =>
      buildTimeZoneOptions({
        locale: intlLocale(locale),
        supported: timeZones,
        selected: selectedCustomTimeZone,
        active: timeZone,
        browser: browserTimeZone,
        timestampMs: timeZoneOptionTimestamp,
      }),
    [
      browserTimeZone,
      locale,
      selectedCustomTimeZone,
      timeZone,
      timeZoneOptionTimestamp,
      timeZones,
    ],
  );

  useEffect(() => {
    setProfileUser(user);
    setProfileName(user.name || "");
    setPreferredLocale(user.preferredLocale || "");
  }, [user]);

  useEffect(() => {
    setMode(timeZonePreference ? "custom" : "browser");
    if (timeZonePreference) {
      setCustomTimeZone(timeZonePreference);
    } else {
      setCustomTimeZone(timeZone);
    }
  }, [timeZone, timeZonePreference]);

  useEffect(() => {
    if (
      notificationPreferencesQuery.isPending ||
      appliedNotificationPreferencesUserIdRef.current === user.id
    ) {
      return;
    }
    if (notificationPreferencesQuery.isError) {
      toast.error(notificationCopy.preferencesSaveFailed);
      appliedNotificationPreferencesUserIdRef.current = user.id;
      return;
    }
    const normalized = normalizeNotificationPreferencesData(
      notificationPreferencesQuery.data,
    );
    setNotificationPreferences(normalized);
    setDraftNotificationPreferences(normalized);
    appliedNotificationPreferencesUserIdRef.current = user.id;
  }, [
    notificationCopy.preferencesSaveFailed,
    notificationPreferencesQuery.data,
    notificationPreferencesQuery.isError,
    notificationPreferencesQuery.isPending,
    user.id,
  ]);

  const nextPreference = mode === "browser" ? "" : selectedCustomTimeZone;
  const canSavePreferredLocale =
    !preferredLocaleSaving &&
    preferredLocale !== (profileUser.preferredLocale || "");
  const canSave =
    !saving &&
    (mode === "browser" || Boolean(nextPreference)) &&
    nextPreference !== timeZonePreference;
  const activeTimeZoneLabel = formatTimeZoneOptionLabel({
    locale: intlLocale(locale),
    timeZone,
    timestampMs: timeZoneOptionTimestamp,
  });
  const browserTimeZoneLabel = browserTimeZone
    ? formatTimeZoneOptionLabel({
        locale: intlLocale(locale),
        timeZone: browserTimeZone,
        timestampMs: timeZoneOptionTimestamp,
      })
    : copy.browserUnavailable;

  function applySavedUser(savedUser: AccountUserData) {
    setProfileUser(savedUser);
    setProfileName(savedUser.name || "");
    setPreferredLocale(savedUser.preferredLocale || "");
  }

  function updateDraftNotificationPreferences(
    patch: Omit<Partial<NotificationPreferencesData>, "attention"> & {
      attention?: Partial<NotificationPreferencesData["attention"]>;
    },
  ) {
    setDraftNotificationPreferences((current) => {
      if (!current) return current;
      const normalized = normalizeNotificationPreferencesData(current);
      return {
        ...normalized,
        ...patch,
        attention: {
          ...normalized.attention,
          ...(patch.attention ?? {}),
        },
      };
    });
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileSaving) return;

    setProfileSaving(true);
    try {
      const data = await requestAdminService<AccountUserData>("profile", {
        method: "POST",
        body: { name: normalizedProfileName },
      });
      applySavedUser(data);
      toast.success(copy.profileSaved);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : copy.profileSaveFailed,
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleNotificationPreferencesSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!draftNotificationPreferences || notificationPreferencesSaving) return;

    setNotificationPreferencesSaving(true);
    try {
      const saved = await requestAdminService<NotificationPreferencesData>(
        "notifications/preferences",
        {
          method: "PATCH",
          body: draftNotificationPreferences,
        },
      );
      const normalized = normalizeNotificationPreferencesData(saved);
      setNotificationPreferences(normalized);
      setDraftNotificationPreferences(normalized);
      toast.success(notificationCopy.preferencesSaved);
      router.refresh();
    } catch {
      toast.error(notificationCopy.preferencesSaveFailed);
    } finally {
      setNotificationPreferencesSaving(false);
    }
  }

  async function handlePreferredLocaleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (preferredLocaleSaving) return;
    if (preferredLocale !== "" && !isValidLocale(preferredLocale)) {
      toast.error(copy.preferredLanguageSaveFailed);
      return;
    }

    setPreferredLocaleSaving(true);
    try {
      const data = await requestAdminService<AccountUserData>("profile", {
        method: "POST",
        body: { preferredLocale },
      });
      applySavedUser(data);
      toast.success(copy.preferredLanguageSaved);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : copy.preferredLanguageSaveFailed,
      );
    } finally {
      setPreferredLocaleSaving(false);
    }
  }

  async function handleTimeZoneSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (mode === "custom" && !nextPreference) {
      toast.error(copy.invalidTimeZone);
      return;
    }

    setSaving(true);
    try {
      const data = await requestAdminService<AccountUserData>("profile", {
        method: "POST",
        body: { timeZone: nextPreference },
      });
      const savedTimeZone = normalizeTimeZone(data.timeZone) || "";
      setTimeZonePreference(savedTimeZone);
      setMode(savedTimeZone ? "custom" : "browser");
      if (savedTimeZone) {
        setCustomTimeZone(savedTimeZone);
      }
      toast.success(copy.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const notificationRows: Array<{
    key: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  }> = draftNotificationPreferences
    ? [
        {
          key: "email",
          label: notificationCopy.emailNotificationsLabel,
          description: notificationCopy.emailNotificationsDescription,
          checked: draftNotificationPreferences.email,
          onChange: (checked) =>
            updateDraftNotificationPreferences({ email: checked }),
        },
        {
          key: "reports",
          label: notificationCopy.reportsUnreadLabel,
          description: notificationCopy.reportsUnreadDescription,
          checked: draftNotificationPreferences.attention.reportsCreateUnread,
          onChange: (checked) =>
            updateDraftNotificationPreferences({
              attention: { reportsCreateUnread: checked },
            }),
        },
        {
          key: "milestones",
          label: notificationCopy.milestonesUnreadLabel,
          description: notificationCopy.milestonesUnreadDescription,
          checked:
            draftNotificationPreferences.attention.milestonesCreateUnread,
          onChange: (checked) =>
            updateDraftNotificationPreferences({
              attention: { milestonesCreateUnread: checked },
            }),
        },
        {
          key: "alerts",
          label: notificationCopy.alertsUnreadLabel,
          description: notificationCopy.alertsUnreadDescription,
          checked: draftNotificationPreferences.attention.alertsCreateUnread,
          onChange: (checked) =>
            updateDraftNotificationPreferences({
              attention: { alertsCreateUnread: checked },
            }),
        },
      ]
    : [];

  return (
    <SettingsPage title={messages.settingsNav.account}>
      <SettingsSection title={copy.profileTitle}>
        <form onSubmit={handleProfileSubmit}>
          <SettingsCard>
            <SettingsRow
              label={copy.nicknameLabel}
              htmlFor="account-profile-name"
            >
              <Input
                id="account-profile-name"
                className="sm:w-72"
                value={profileName}
                maxLength={120}
                autoComplete="name"
                placeholder={copy.nicknamePlaceholder}
                onChange={(event) => setProfileName(event.target.value)}
                disabled={profileSaving}
              />
            </SettingsRow>
            <SettingsRow
              label={copy.emailLabel}
              description={copy.emailManagedByGateway}
            >
              <span className="text-sm text-muted-foreground">
                {profileUser.email}
              </span>
            </SettingsRow>
            <SettingsCardFooter>
              <SaveButton
                label={copy.profileSave}
                savingLabel={copy.profileSaving}
                saving={profileSaving}
                disabled={!canSaveProfile}
              />
            </SettingsCardFooter>
          </SettingsCard>
        </form>
      </SettingsSection>

      <AppearanceSettings locale={locale} messages={messages} />

      <SettingsSection title={notificationCopy.preferencesTitle}>
        {notificationPreferencesLoading || !draftNotificationPreferences ? (
          <SettingsCard>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="px-5 py-4">
                <Skeleton className="h-5 w-48" />
              </div>
            ))}
          </SettingsCard>
        ) : (
          <form onSubmit={handleNotificationPreferencesSubmit}>
            <SettingsCard>
              {notificationRows.map((row) => (
                <SettingsRow
                  key={row.key}
                  label={row.label}
                  description={row.description}
                  htmlFor={`account-notification-${row.key}`}
                >
                  <Switch
                    id={`account-notification-${row.key}`}
                    checked={row.checked}
                    disabled={notificationPreferencesSaving}
                    onCheckedChange={(checked) => row.onChange(checked)}
                  />
                </SettingsRow>
              ))}
              <SettingsCardFooter>
                <SaveButton
                  label={copy.save}
                  savingLabel={copy.saving}
                  saving={notificationPreferencesSaving}
                  disabled={!canSaveNotificationPreferences}
                />
              </SettingsCardFooter>
            </SettingsCard>
          </form>
        )}
      </SettingsSection>

      <SettingsSection title={copy.preferredLanguageTitle}>
        <form onSubmit={handlePreferredLocaleSubmit}>
          <SettingsCard>
            <SettingsRow
              label={copy.preferredLanguageLabel}
              htmlFor="account-preferred-language"
            >
              <Select
                value={preferredLocale || "default"}
                disabled={preferredLocaleSaving}
                onValueChange={(value) => {
                  if (value === "default") setPreferredLocale("");
                  if (isValidLocale(value)) {
                    setPreferredLocale(value);
                  }
                }}
              >
                <SelectTrigger
                  id="account-preferred-language"
                  className="w-full sm:w-56"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    {copy.preferredLanguageDefault}
                  </SelectItem>
                  <SelectItem value="en">
                    {copy.preferredLanguageEnglish}
                  </SelectItem>
                  <SelectItem value="zh">
                    {copy.preferredLanguageChinese}
                  </SelectItem>
                  <SelectItem value="zh-tw">
                    {copy.preferredLanguageTraditionalChinese}
                  </SelectItem>
                  <SelectItem value="ja">
                    {copy.preferredLanguageJapanese}
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>
            <SettingsCardFooter>
              <SaveButton
                label={copy.save}
                savingLabel={copy.saving}
                saving={preferredLocaleSaving}
                disabled={!canSavePreferredLocale}
              />
            </SettingsCardFooter>
          </SettingsCard>
        </form>
      </SettingsSection>

      <SettingsSection title={copy.timeZoneTitle}>
        <form onSubmit={handleTimeZoneSubmit}>
          <SettingsCard>
            <SettingsRow label={copy.activeTimeZone}>
              <span className="text-sm text-muted-foreground">
                {activeTimeZoneLabel}
              </span>
            </SettingsRow>
            <SettingsRow label={copy.browserTimeZone}>
              <span className="text-sm text-muted-foreground">
                {browserTimeZoneLabel}
              </span>
            </SettingsRow>
            <SettingsRow
              label={copy.preferenceLabel}
              htmlFor="account-timezone-mode"
            >
              <Select
                value={mode}
                onValueChange={(value) => {
                  if (value === "browser" || value === "custom") {
                    setMode(value);
                  }
                }}
              >
                <SelectTrigger
                  id="account-timezone-mode"
                  className="w-full sm:w-56"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">{copy.useBrowser}</SelectItem>
                  <SelectItem value="custom">{copy.useCustom}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>
            {mode === "custom" ? (
              <SettingsRow
                label={copy.customTimeZoneLabel}
                htmlFor="account-timezone-select"
                stacked
              >
                <Select
                  value={selectedCustomTimeZone}
                  onValueChange={(value) => setCustomTimeZone(value)}
                >
                  <SelectTrigger
                    id="account-timezone-select"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {timeZoneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>
            ) : null}
            <SettingsCardFooter>
              <SaveButton
                label={copy.save}
                savingLabel={copy.saving}
                saving={saving}
                disabled={!canSave}
              />
            </SettingsCardFooter>
          </SettingsCard>
        </form>
      </SettingsSection>
    </SettingsPage>
  );
}
