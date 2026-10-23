import { useMemo, useState } from "react";
import { Input } from "@insightflare/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { toast } from "sonner";

import { AppearanceSettings } from "@/components/settings/appearance-settings";
import {
  SettingsCard,
  SettingsPage,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { useReportingTimeZone } from "@/components/time-zone-provider";
import {
  buildTimeZoneOptions,
  formatTimeZoneOptionLabel,
  normalizeTimeZone,
  supportedTimeZones,
} from "@/lib/analytics/time-zone";
import { intlLocale } from "@/lib/dashboard/format";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { AccountUserData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import { useRouter } from "@/lib/router";

// The time zone select's value for "follow the browser".
const BROWSER_TIME_ZONE = "browser";

/** The viewer's own settings. Every control saves as soon as it changes. */
export function AccountSettingsClient({
  locale,
  messages,
  user,
}: {
  locale: Locale;
  messages: AppMessages;
  user: AccountUserData;
}) {
  const copy = messages.accountSettings;
  const router = useRouter();
  const { timeZonePreference, browserTimeZone, setTimeZonePreference } =
    useReportingTimeZone();
  const [savedName, setSavedName] = useState(user.name || "");
  const [name, setName] = useState(savedName);
  const [savingName, setSavingName] = useState(false);
  const [savingTimeZone, setSavingTimeZone] = useState(false);
  const timestampMs = useMemo(() => Date.now(), []);
  const timeZoneOptions = useMemo(
    () =>
      buildTimeZoneOptions({
        locale: intlLocale(locale),
        supported: supportedTimeZones(),
        selected: timeZonePreference,
        timestampMs,
      }),
    [locale, timeZonePreference, timestampMs],
  );
  const browserLabel = browserTimeZone
    ? formatTimeZoneOptionLabel({
        locale: intlLocale(locale),
        timeZone: browserTimeZone,
        timestampMs,
      })
    : copy.browserUnavailable;

  async function saveName() {
    const next = name.trim();
    if (savingName || next === savedName) return;
    setSavingName(true);
    try {
      const data = await requestAdminService<AccountUserData>("profile", {
        method: "POST",
        body: { name: next },
      });
      setSavedName(data.name || "");
      setName(data.name || "");
      toast.success(copy.profileSaved);
      router.refresh();
    } catch (error) {
      setName(savedName);
      toast.error(
        error instanceof Error ? error.message : copy.profileSaveFailed,
      );
    } finally {
      setSavingName(false);
    }
  }

  async function saveTimeZone(value: string) {
    setSavingTimeZone(true);
    try {
      const data = await requestAdminService<AccountUserData>("profile", {
        method: "POST",
        body: { timeZone: value === BROWSER_TIME_ZONE ? "" : value },
      });
      setTimeZonePreference(normalizeTimeZone(data.timeZone) || "");
      toast.success(copy.saved);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setSavingTimeZone(false);
    }
  }

  return (
    <SettingsPage title={messages.settingsNav.account}>
      <SettingsSection title={copy.profileTitle}>
        <SettingsCard>
          <SettingsRow
            label={copy.nicknameLabel}
            htmlFor="account-profile-name"
          >
            <Input
              id="account-profile-name"
              className="sm:w-72"
              value={name}
              maxLength={120}
              autoComplete="name"
              placeholder={copy.nicknamePlaceholder}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              disabled={savingName}
            />
          </SettingsRow>
          <SettingsRow
            label={copy.emailLabel}
            description={copy.emailManagedByGateway}
          >
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>

      <AppearanceSettings locale={locale} messages={messages} />

      <SettingsSection title={copy.timeZoneTitle}>
        <SettingsCard>
          <SettingsRow
            label={copy.timeZoneLabel}
            htmlFor="account-timezone-select"
            stacked
          >
            <Select
              value={timeZonePreference || BROWSER_TIME_ZONE}
              disabled={savingTimeZone}
              onValueChange={(value) => void saveTimeZone(value)}
            >
              <SelectTrigger id="account-timezone-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value={BROWSER_TIME_ZONE}>
                  {formatI18nTemplate(copy.useBrowser, { zone: browserLabel })}
                </SelectItem>
                {timeZoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
        </SettingsCard>
      </SettingsSection>
    </SettingsPage>
  );
}
