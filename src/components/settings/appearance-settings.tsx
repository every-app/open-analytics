import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { toast } from "sonner";

import { normalizeLocalePath } from "@/components/dashboard/shell/dashboard-shell/navigation";
import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { useTheme } from "@/components/theme-provider";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import {
  isValidLocale,
  type Locale,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { usePathname, useRouter } from "@/lib/router";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "system", icon: MonitorIcon },
  { value: "light", icon: SunIcon },
  { value: "dark", icon: MoonIcon },
] as const;

function themeLabel(messages: AppMessages, theme: string): string {
  if (theme === "light") return messages.actions.switchToLight;
  if (theme === "dark") return messages.actions.switchToDark;
  return messages.common.system;
}

function localeLabel(messages: AppMessages, locale: Locale): string {
  if (locale === "zh-tw") return messages.actions.switchToTraditionalChinese;
  if (locale === "zh") return messages.actions.switchToChinese;
  if (locale === "ja") return messages.actions.switchToJapanese;
  return messages.actions.switchToEnglish;
}

/**
 * This browser's theme and the viewer's language, as OpenSEO's Appearance.
 * The language is saved to the profile too, so notification email follows it.
 */
export function AppearanceSettings({
  locale,
  messages,
}: {
  locale: Locale;
  messages: AppMessages;
}) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname() || "";

  async function changeLanguage(value: Locale) {
    try {
      await requestAdminService("profile", {
        method: "POST",
        body: { preferredLocale: value },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : messages.accountSettings.languageSaveFailed,
      );
    }
    await router.push(`/${value}${normalizeLocalePath(pathname)}`);
  }

  return (
    <SettingsSection title={messages.appNav.appearance}>
      <SettingsCard>
        <SettingsRow label={messages.common.theme}>
          <div
            role="radiogroup"
            aria-label={messages.common.theme}
            className="flex gap-0.5 rounded-lg border border-border bg-muted p-0.5"
          >
            {THEMES.map(({ value, icon: Icon }) => {
              const active = (theme || "system") === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  title={themeLabel(messages, value)}
                  aria-label={themeLabel(messages, value)}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "inline-flex h-[22px] items-center rounded-md px-2 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5",
                    active && "bg-primary/15 text-primary hover:text-primary",
                  )}
                >
                  <Icon aria-hidden />
                </button>
              );
            })}
          </div>
        </SettingsRow>
        <SettingsRow
          label={messages.common.language}
          htmlFor="appearance-language"
        >
          <Select
            value={locale}
            onValueChange={(value) => {
              if (!isValidLocale(value) || value === locale) return;
              void changeLanguage(value);
            }}
          >
            <SelectTrigger id="appearance-language" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LOCALES.map((item) => (
                <SelectItem key={item} value={item}>
                  {localeLabel(messages, item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
