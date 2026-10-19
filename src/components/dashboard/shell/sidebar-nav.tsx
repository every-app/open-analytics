import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@insightflare/ui/sidebar";
import type { LucideIcon } from "lucide-react";

import Link from "@/lib/router";

/** OpenSEO's nav row: muted until hovered, a primary bar beside the page you're on. */
export const SIDEBAR_NAV_BUTTON_CLASS =
  "relative text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:before:absolute data-active:before:inset-y-1 data-active:before:left-0 data-active:before:w-[3px] data-active:before:rounded-r-full data-active:before:bg-primary";

/** One link in the sidebar. */
export function SidebarNavLink({
  href,
  icon: Icon,
  label,
  isActive,
  badge,
  onNavigate,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  /** A count beside the label, such as unread messages. */
  badge?: number;
  onNavigate: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={SIDEBAR_NAV_BUTTON_CLASS}
      >
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          onClick={onNavigate}
        >
          <Icon className="size-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
      {badge ? (
        <SidebarMenuBadge className="text-destructive">
          {badge > 99 ? "99+" : badge}
        </SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}
