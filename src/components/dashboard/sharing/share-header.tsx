import { useState } from "react";
import { Button } from "@insightflare/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerScrollArea,
  DrawerTitle,
  DrawerTrigger,
} from "@insightflare/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@insightflare/ui/dropdown-menu";
import {
  ChevronDownIcon,
  GlobeIcon,
  LanguagesIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";

import { DashboardHeaderControls } from "@/components/dashboard/shell/dashboard-header-controls";
import { useTheme } from "@/components/theme-provider";
import {
  isValidLocale,
  type Locale,
  SUPPORTED_LOCALES,
} from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Image from "@/lib/image";
import { usePathname, useRouter } from "@/lib/router";
interface ShareHeaderProps {
  locale: Locale;
  messages: AppMessages;
  publicSiteId: string;
  siteName: string;
}
function localeSwitchPath(pathname: string, locale: Locale): string {
  const withoutLocale =
    pathname.replace(/^\/(?:en|zh-tw|zh|ja)(?=\/|$)/, "") || "/";
  return `/${locale}${withoutLocale}`;
}
function localeLabel(messages: AppMessages, locale: Locale): string {
  if (locale === "zh-tw") return messages.actions.switchToTraditionalChinese;
  if (locale === "zh") return messages.actions.switchToChinese;
  if (locale === "ja") return messages.actions.switchToJapanese;
  return messages.actions.switchToEnglish;
}
function pickThemeIcon(theme: string) {
  if (theme === "dark") return MoonIcon;
  if (theme === "light") return SunIcon;
  return MonitorIcon;
}
export function ShareHeader({
  locale,
  messages,
  publicSiteId,
  siteName,
}: ShareHeaderProps) {
  const pathname = usePathname() || `/${locale}`;
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const themeValue =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";
  const currentTheme = resolvedTheme === "dark" ? "dark" : "light";
  const ThemeIcon = pickThemeIcon(
    themeValue === "system" ? currentTheme : themeValue,
  );
  const [themeDrawerOpen, setThemeDrawerOpen] = useState(false);
  const [languageDrawerOpen, setLanguageDrawerOpen] = useState(false);
  const switchLocale = (nextLocale: Locale) => {
    if (nextLocale !== locale) {
      router.push(localeSwitchPath(pathname, nextLocale));
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <span className="flex shrink-0 items-center gap-2 font-semibold text-foreground">
          <Image
            src="/favicon.svg"
            alt="OpenAnalytics"
            width={192}
            height={192}
            className="size-5 shrink-0"
            priority
          />
          <span className="hidden md:inline">{messages.appName}</span>
        </span>
        <span className="text-muted-foreground" aria-hidden>
          /
        </span>
        <span className="min-w-0 truncate font-medium">{siteName}</span>
      </div>

      <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2">
        <Drawer open={themeDrawerOpen} onOpenChange={setThemeDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="inline-flex bg-background xl:hidden"
              aria-label={messages.common.theme}
            >
              <ThemeIcon className="text-muted-foreground" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{messages.common.theme}</DrawerTitle>
            </DrawerHeader>
            <DrawerScrollArea contentClassName="grid gap-2 px-4 pb-4">
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant={themeValue === "light" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setTheme("light")}
                >
                  <SunIcon data-icon="inline-start" />
                  {messages.actions.switchToLight}
                </Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant={themeValue === "dark" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setTheme("dark")}
                >
                  <MoonIcon data-icon="inline-start" />
                  {messages.actions.switchToDark}
                </Button>
              </DrawerClose>
              <DrawerClose asChild>
                <Button
                  type="button"
                  variant={themeValue === "system" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setTheme("system")}
                >
                  <MonitorIcon data-icon="inline-start" />
                  {messages.common.system}
                </Button>
              </DrawerClose>
            </DrawerScrollArea>
          </DrawerContent>
        </Drawer>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="hidden bg-background xl:inline-flex"
              aria-label={messages.common.theme}
            >
              <ThemeIcon
                data-icon="inline-start"
                className="text-muted-foreground"
              />
              <span>{messages.common.theme}</span>
              <ChevronDownIcon
                className="text-muted-foreground"
                data-icon="inline-end"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>{messages.common.theme}</DropdownMenuLabel>
            <DropdownMenuSeparator />
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
                <SunIcon className="size-4 text-muted-foreground" />
                {messages.actions.switchToLight}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <MoonIcon className="size-4 text-muted-foreground" />
                {messages.actions.switchToDark}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <MonitorIcon className="size-4 text-muted-foreground" />
                {messages.common.system}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Drawer open={languageDrawerOpen} onOpenChange={setLanguageDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="inline-flex bg-background xl:hidden"
              aria-label={messages.common.language}
            >
              <GlobeIcon className="text-muted-foreground" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{messages.common.language}</DrawerTitle>
            </DrawerHeader>
            <DrawerScrollArea contentClassName="grid gap-2 px-4 pb-4">
              {SUPPORTED_LOCALES.map((item) => (
                <DrawerClose key={item} asChild>
                  <Button
                    type="button"
                    variant={locale === item ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => switchLocale(item)}
                  >
                    <LanguagesIcon data-icon="inline-start" />
                    <span>{localeLabel(messages, item)}</span>
                  </Button>
                </DrawerClose>
              ))}
            </DrawerScrollArea>
          </DrawerContent>
        </Drawer>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="hidden bg-background xl:inline-flex"
              aria-label={messages.common.language}
            >
              <GlobeIcon
                data-icon="inline-start"
                className="text-muted-foreground"
              />
              <span>{messages.common.language}</span>
              <ChevronDownIcon
                className="text-muted-foreground"
                data-icon="inline-end"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel>{messages.common.language}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(value) => {
                if (isValidLocale(value)) switchLocale(value);
              }}
            >
              {SUPPORTED_LOCALES.map((item) => (
                <DropdownMenuRadioItem key={item} value={item}>
                  {localeLabel(messages, item)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="shrink-0 [&>div]:flex-nowrap [&_button]:shrink-0">
          <DashboardHeaderControls
            locale={locale}
            messages={messages}
            siteId={publicSiteId}
            showControls
            showFilterSheet
            filterAudience="public-share"
            showRealtimeBadge={false}
          />
        </div>
      </div>
    </div>
  );
}
