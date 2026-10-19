import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@insightflare/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@insightflare/ui/sidebar";
import {
  ArrowUpRightIcon,
  GlobeIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserIcon,
} from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { buildSettingsPath } from "@/lib/dashboard/paths";
import {
  isValidLocale,
  type Locale,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";
import { useRouter } from "@/lib/router";

import { normalizeLocalePath } from "./dashboard-shell/navigation";
import { SIDEBAR_NAV_BUTTON_CLASS } from "./sidebar-nav";

function localeLabel(messages: AppMessages, locale: Locale): string {
  if (locale === "zh-tw") return messages.actions.switchToTraditionalChinese;
  if (locale === "zh") return messages.actions.switchToChinese;
  if (locale === "ja") return messages.actions.switchToJapanese;
  return messages.actions.switchToEnglish;
}

/**
 * The sidebar's foot: the organization's own pages, then the signed-in
 * member's menu with their account, language, theme and the gateway.
 */
export function AccountFooter({
  links,
  locale,
  messages,
  pathname,
  user,
  gatewayUrl,
  onNavigate,
}: {
  /** Links that stay in view whatever the page: all sites, inbox, settings. */
  links: ReactNode;
  locale: Locale;
  messages: AppMessages;
  pathname: string;
  user: { name: string; email: string };
  /** The Every App gateway, where people sign out and switch apps. */
  gatewayUrl: string;
  onNavigate: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const themeValue =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  return (
    <SidebarFooter className="gap-0 border-t border-sidebar-border pt-2">
      <SidebarMenu>
        {links}
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                className={SIDEBAR_NAV_BUTTON_CLASS}
                aria-label={messages.appNav.accountMenu}
              >
                <UserIcon className="size-4" />
                <span className="truncate">{user.email}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              {user.name ? (
                <>
                  <DropdownMenuLabel className="space-y-0.5 font-normal">
                    <div className="truncate text-sm font-medium text-foreground">
                      {user.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem asChild>
                <Link
                  href={buildSettingsPath(locale, "account")}
                  onClick={onNavigate}
                >
                  <SettingsIcon />
                  <span>{messages.appNav.accountSettings}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <GlobeIcon />
                  <span>{messages.common.language}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={locale}
                    onValueChange={(value) => {
                      if (!isValidLocale(value) || value === locale) return;
                      router.push(`/${value}${normalizeLocalePath(pathname)}`);
                    }}
                  >
                    {SUPPORTED_LOCALES.map((item) => (
                      <DropdownMenuRadioItem key={item} value={item}>
                        {localeLabel(messages, item)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{messages.common.theme}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={themeValue}
                  onValueChange={(value) => {
                    if (
                      value === "light" ||
                      value === "dark" ||
                      value === "system"
                    ) {
                      setTheme(value);
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="light">
                    <SunIcon />
                    <span>{messages.actions.switchToLight}</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <MoonIcon />
                    <span>{messages.actions.switchToDark}</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">
                    <MonitorIcon />
                    <span>{messages.common.system}</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={gatewayUrl}>
                  <ArrowUpRightIcon />
                  <span>{messages.sidebarFooter.gateway}</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
