import type { ReactNode } from "react";
import {
  OverlayScrollbar,
  PERSISTENT_VERTICAL_SCROLLBAR_OPTIONS,
} from "@insightflare/ui/overlay-scrollbar";
import { SidebarInset, SidebarProvider } from "@insightflare/ui/sidebar";

import { PageTransition } from "@/components/page-transition";
import { cn } from "@/lib/utils";

interface AppShellLayoutProps {
  sidebar: ReactNode;
  /** The bar above the page on phones: the sidebar's toggle and the name. */
  mobileTopBar: ReactNode;
  /** A bar that stays at the top of the page as it scrolls, if any. */
  header?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  contentDataAttributes?: Record<string, string>;
}

/**
 * OpenSEO's frame: the sidebar on the grey of the window, and the page in a
 * panel beside it with only its top-left corner rounded.
 */
export function AppShellLayout({
  sidebar,
  mobileTopBar,
  header,
  children,
  contentClassName,
  contentDataAttributes,
}: AppShellLayoutProps) {
  return (
    <SidebarProvider className="h-[100dvh] min-h-0 overflow-hidden">
      {sidebar}
      <SidebarInset className="min-h-0 overflow-hidden md:!m-0 md:!mt-2 md:!rounded-none md:!rounded-tl-lg md:border-t md:border-l md:border-sidebar-border md:!shadow-none">
        {mobileTopBar}
        <OverlayScrollbar
          axis="vertical"
          className="min-h-0 flex-1"
          viewportClassName="h-full min-h-0"
          contentClassName="flex min-h-full flex-col"
          options={PERSISTENT_VERTICAL_SCROLLBAR_OPTIONS}
          data-page-scroll-container=""
        >
          {header ? (
            <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
              {header}
            </header>
          ) : null}
          <div
            {...contentDataAttributes}
            className={cn(
              "flex w-full min-w-0 flex-1 flex-col",
              contentClassName,
            )}
          >
            <PageTransition>{children}</PageTransition>
          </div>
        </OverlayScrollbar>
      </SidebarInset>
    </SidebarProvider>
  );
}
