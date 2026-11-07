import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import { useTheme } from "@/components/theme-provider";
import type { AppMessages } from "@/lib/i18n/messages";
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

/** This browser's theme, as OpenSEO's Appearance. */
export function AppearanceSettings({ messages }: { messages: AppMessages }) {
  const { theme, setTheme } = useTheme();

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
      </SettingsCard>
    </SettingsSection>
  );
}
