import "@/lib/iconify";

import { Button } from "@insightflare/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@insightflare/ui/card";
import { LayerManagerProvider } from "@insightflare/ui/layer-manager";
import { SCROLLBAR_POLICY_INIT_SCRIPT } from "@insightflare/ui/overlay-scrollbar";
import { TooltipProvider } from "@insightflare/ui/tooltip";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import { FileWarningIcon, GithubIcon, HouseIcon } from "lucide-react";

import globalStylesheetUrl from "@/app/globals.css?url";
import { AppToaster } from "@/components/app-toaster";
import { LayerSystemFixture } from "@/components/dashboard/site-pages/overview/layer-system-fixture";
import { GlobalScrollbars } from "@/components/global-scrollbars";
import { AppQueryProvider } from "@/components/query-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TimeZoneProvider } from "@/components/time-zone-provider";
import { APP_NAME } from "@/lib/constants";
import { GET_STARTED_COLLAPSED_KEY } from "@/lib/dashboard/get-started";
import { localeToHtmlLang, resolveLocale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";
const THEME_INIT_SCRIPT = `(function(){try{var k='insightflare-theme';var t=localStorage.getItem(k)||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';if(localStorage.getItem('${GET_STARTED_COLLAPSED_KEY}')==='1')document.documentElement.setAttribute('data-get-started-collapsed','')}catch(e){}})()`;
const ESBUILD_NAME_HELPER_SCRIPT = `(function(){if(typeof globalThis.__name!=="function"){globalThis.__name=function(target){return target}}})()`;
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: APP_NAME },
        { name: "description", content: `${APP_NAME} analytics dashboard` },
      ],
      links: [
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "stylesheet", href: globalStylesheetUrl },
      ],
    }),
    notFoundComponent: NotFoundPage,
    errorComponent: ErrorPage,
    component: RootDocument,
  },
);
function RootDocument() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useLocation({ select: (location) => location.pathname });
  const locale = resolveLocale(pathname.split("/")[1]);

  return (
    <html lang={localeToHtmlLang(locale)} suppressHydrationWarning>
      <head>
        <ScriptOnce>{SCROLLBAR_POLICY_INIT_SCRIPT}</ScriptOnce>
        <HeadContent />
        <ScriptOnce>{THEME_INIT_SCRIPT}</ScriptOnce>
      </head>
      <body className="antialiased">
        <GlobalScrollbars>
          <ScriptOnce>{ESBUILD_NAME_HELPER_SCRIPT}</ScriptOnce>
          <LayerManagerProvider>
            <LayerSystemFixture />
            <AppQueryProvider client={queryClient}>
              <TimeZoneProvider>
                <ThemeProvider>
                  <TooltipProvider>
                    <Outlet />
                  </TooltipProvider>
                  <AppToaster />
                </ThemeProvider>
              </TimeZoneProvider>
            </AppQueryProvider>
          </LayerManagerProvider>
        </GlobalScrollbars>
        <Scripts />
      </body>
    </html>
  );
}
/**
 * Who sees an error page, from where it happened: share links are public,
 * and app pages only reach signed-in members (server.ts). A share page's
 * visitor has no home here.
 */
function errorPageAudience(pathname: string) {
  const section = pathname.split("/")[2];
  return { signedIn: section === "app", hasHome: section !== "share" };
}
export function NotFoundPage() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const locale = resolveLocale(pathname.split("/")[1]);
  const copy = getMessages(locale).errorPage;

  return (
    <ErrorPageLayout
      title={copy.notFoundTitle}
      description={copy.notFoundDescription}
      homeHref={
        errorPageAudience(pathname).hasHome ? `/${locale}/app` : undefined
      }
      homeLabel={copy.homeAction}
    />
  );
}
export function ErrorPage({ error }: { error: Error }) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const locale = resolveLocale(pathname.split("/")[1]);
  const copy = getMessages(locale).errorPage;
  const errorName = error instanceof Error ? error.name : "Error";
  const errorMessage =
    error instanceof Error ? error.message : "Unexpected application error";
  const { signedIn, hasHome } = errorPageAudience(pathname);

  return (
    <ErrorPageLayout
      destructive
      title={copy.errorTitle}
      description={copy.errorDescription}
      homeHref={hasHome ? `/${locale}/app` : undefined}
      homeLabel={copy.homeAction}
      errorMessage={errorMessage}
      report={
        signedIn
          ? {
              href: buildErrorReportUrl({ pathname, errorName, errorMessage }),
              label: copy.reportAction,
            }
          : undefined
      }
    />
  );
}
function buildErrorReportUrl({
  pathname,
  errorName,
  errorMessage,
}: {
  pathname: string;
  errorName: string;
  errorMessage: string;
}) {
  const title = `[Bug] ${APP_NAME} 500 on ${pathname || "/"}`;
  const body = [
    "### What happened",
    "",
    "Please describe what you expected and what happened.",
    "",
    "### Diagnostic context",
    "- Status: 500",
    `- Path: ${pathname || "/"}`,
    `- Error type: ${errorName}`,
    `- Error message: ${errorMessage}`,
    "",
    "Generated by the OpenAnalytics error page.",
  ].join("\n");

  return `https://github.com/every-app/open-analytics/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=bug`;
}
function ErrorPageLayout({
  destructive = false,
  title,
  description,
  homeHref,
  homeLabel,
  errorMessage,
  report,
}: {
  destructive?: boolean;
  title: string;
  description: string;
  homeHref?: string;
  homeLabel: string;
  errorMessage?: string;
  report?: { href: string; label: string };
}) {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <Card
        className={`w-full max-w-xl shadow-lg ${destructive ? "border-destructive/30" : "border-border/80"}`}
      >
        <CardHeader className="space-y-3">
          <CardTitle className="inline-flex items-center gap-2 text-lg">
            <FileWarningIcon
              className={destructive ? "size-4 text-destructive" : "size-4"}
            />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {errorMessage || homeHref || report ? (
          <CardContent className="space-y-5">
            {errorMessage ? (
              <p className="rounded-md border border-border/70 px-3 py-2 font-mono text-xs break-words text-muted-foreground">
                {errorMessage}
              </p>
            ) : null}
            {homeHref || report ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {homeHref ? (
                  <Button variant="outline" asChild>
                    <Link href={homeHref}>
                      <HouseIcon data-icon="inline-start" />
                      {homeLabel}
                    </Link>
                  </Button>
                ) : null}
                {report ? (
                  <Button variant="outline" asChild>
                    <Link href={report.href} target="_blank" rel="noreferrer">
                      <GithubIcon data-icon="inline-start" />
                      {report.label}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>
    </main>
  );
}
