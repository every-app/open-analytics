import { useEffect } from "react";
import { Spinner } from "@insightflare/ui/spinner";
import { useRouterState } from "@tanstack/react-router";

import { resolveLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

interface PageTransitionProps {
  children: React.ReactNode;
}

function scrollPageToTop() {
  const pageScrollContainer = document.querySelector<HTMLElement>(
    "[data-page-scroll-container], [data-dashboard-scroll-container]",
  );
  const scrollTarget =
    pageScrollContainer?.querySelector<HTMLElement>(
      "[data-scrollbar-axis='vertical']",
    ) ??
    pageScrollContainer ??
    window;

  scrollTarget.scrollTo({ top: 0, behavior: "instant" });
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = useRouterState({
    select: (state) => (state.resolvedLocation ?? state.location).pathname,
  });
  const isNavigating = useRouterState({
    select: (state) =>
      state.isLoading &&
      Boolean(state.resolvedLocation) &&
      state.location.pathname !== state.resolvedLocation?.pathname,
  });
  const messages = getMessages(resolveLocale(pathname.split("/")[1]));

  useEffect(() => {
    scrollPageToTop();
  }, [pathname]);

  return (
    <div
      data-page-transition
      aria-busy={isNavigating}
      className={
        isNavigating
          ? "flex min-h-0 flex-1 items-center justify-center"
          : undefined
      }
    >
      {isNavigating ? (
        <Spinner
          aria-label={messages.common.loading}
          className="size-6 text-muted-foreground"
        />
      ) : (
        children
      )}
    </div>
  );
}
