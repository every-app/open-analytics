import { memo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@insightflare/ui/dropdown-menu";
import {
  RiLogoutBoxRLine,
  RiNotification3Line,
  RiSettings3Line,
} from "@remixicon/react";

import {
  SIDEBAR_FOOTER_TRIGGER_BASE_CLASS,
  SidebarAppearanceMenus,
} from "@/components/sidebar-appearance-menus";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";
import { cn } from "@/lib/utils";

interface SidebarFooterMenusProps {
  locale: Locale;
  switchToEn: string;
  switchToZh: string;
  switchToZhTw: string;
  switchToJa: string;
  accountHref: string;
  notificationsHref: string;
  unreadAttentionCount?: number;
  /** The Every App gateway, where people sign out and switch apps. */
  gatewayUrl: string;
  user: {
    name: string;
    email: string;
    systemRole: "admin" | "user";
  };
  messages: AppMessages;
}

function userInitial(name: string, email: string): string {
  const raw = String(name || email || "").trim();
  if (!raw) return "?";
  const first = Array.from(raw)[0];
  return first ? first.toUpperCase() : "?";
}

export const SidebarFooterMenus = memo(function SidebarFooterMenus({
  locale,
  switchToEn,
  switchToZh,
  switchToZhTw,
  switchToJa,
  accountHref,
  notificationsHref,
  unreadAttentionCount = 0,
  gatewayUrl,
  user,
  messages,
}: SidebarFooterMenusProps) {
  const initial = userInitial(user.name, user.email);
  const displayName = String(user.name || user.email);
  const roleLabel =
    user.systemRole === "admin" ? messages.common.admin : messages.common.user;

  return (
    <SidebarAppearanceMenus
      locale={locale}
      switchToEn={switchToEn}
      switchToZh={switchToZh}
      switchToZhTw={switchToZhTw}
      switchToJa={switchToJa}
      messages={messages}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            SIDEBAR_FOOTER_TRIGGER_BASE_CLASS,
            "left-2/3 group-data-[collapsible=icon]:left-0 group-data-[collapsible=icon]:top-20",
          )}
          aria-label={messages.common.account}
        >
          <span className="relative inline-flex size-6 items-center justify-center">
            <span className="inline-flex size-6 items-center justify-center rounded-full border border-sidebar-border bg-transparent text-xs">
              {initial}
            </span>
            {unreadAttentionCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive ring-2 ring-sidebar" />
            ) : null}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent sideOffset={8} className="!w-64 !min-w-64">
          <DropdownMenuLabel className="space-y-1">
            <div className="text-sm font-semibold text-foreground">
              {displayName}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="space-y-1 font-normal">
            {user.name ? (
              <div className="text-xs text-muted-foreground">{user.email}</div>
            ) : null}
            <div className="text-xs text-muted-foreground">
              {messages.common.role}: {roleLabel}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={notificationsHref}>
              <RiNotification3Line />
              <span>{messages.notificationCenter.title}</span>
              {unreadAttentionCount > 0 ? (
                <span className="ml-auto pr-2 font-mono text-xs tabular-nums text-destructive">
                  {unreadAttentionCount > 99 ? "99+" : unreadAttentionCount}
                </span>
              ) : null}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={accountHref}>
              <RiSettings3Line />
              <span>{messages.accountSettings.title}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={gatewayUrl}>
              <RiLogoutBoxRLine />
              <span>{messages.sidebarFooter.gateway}</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarAppearanceMenus>
  );
});
