import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@insightflare/ui/sidebar";
import { ArrowUpRightIcon, SettingsIcon } from "lucide-react";

import { buildSettingsPath } from "@/lib/dashboard/paths";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

import { SIDEBAR_NAV_BUTTON_CLASS, SidebarNavLink } from "./sidebar-nav";

/**
 * The sidebar's foot, as self-hosted OpenSEO's: a way out to the Every App
 * gateway, where people switch apps and sign out, then Settings.
 */
export function SidebarFootLinks({
  locale,
  messages,
  gatewayUrl,
  settingsActive,
  onNavigate,
}: {
  locale: Locale;
  messages: AppMessages;
  gatewayUrl: string;
  settingsActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <SidebarFooter className="gap-0 border-t border-sidebar-border pb-safe">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild className={SIDEBAR_NAV_BUTTON_CLASS}>
            <a href={gatewayUrl}>
              <ArrowUpRightIcon className="size-4" />
              <span>{messages.sidebarFooter.gateway}</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarNavLink
          href={buildSettingsPath(locale)}
          icon={SettingsIcon}
          label={messages.appNav.settings}
          isActive={settingsActive}
          onNavigate={onNavigate}
        />
      </SidebarMenu>
    </SidebarFooter>
  );
}
