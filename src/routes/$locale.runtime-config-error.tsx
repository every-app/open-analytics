import { OverlayScrollbar } from "@insightflare/ui/overlay-scrollbar";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRightIcon, ExternalLinkIcon } from "lucide-react";

import { dashboardPageTitle } from "@/lib/page-title";
export const Route = createFileRoute("/$locale/runtime-config-error")({
  head: ({ match }) => ({
    meta: [
      {
        title: dashboardPageTitle(
          match.context.messages.runtimeConfigError.title,
          match.context,
        ),
      },
    ],
  }),
  component: Page,
});
/**
 * Every page lands here while MAIN_SECRET is unset, before anyone is known
 * (middleware.ts), so everyone gets the one line and the deployer's fix
 * waits folded underneath.
 */
function Page() {
  const { messages } = Route.useRouteContext();
  const copy = messages.runtimeConfigError;
  return (
    <main className="grid min-h-svh place-items-center bg-background p-4 text-foreground">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-lg font-semibold text-balance">{copy.heading}</h1>
        <details className="group text-sm">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            <ChevronRightIcon className="size-4 transition-transform group-open:rotate-90" />
            {copy.setupSummary}
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-muted-foreground">{copy.setupCommand}</p>
            <OverlayScrollbar
              axis="horizontal"
              className="rounded-md border bg-muted"
              contentClassName="w-max min-w-full px-3 py-2"
            >
              <code className="block text-xs whitespace-pre">
                pnpm exec everyapp secret set MAIN_SECRET
              </code>
            </OverlayScrollbar>
            <a
              href="https://github.com/every-app/open-analytics#deploy"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium hover:underline"
            >
              {copy.docsLabel}
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </div>
        </details>
      </div>
    </main>
  );
}
