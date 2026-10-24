import { OverlayScrollbar } from "@insightflare/ui/overlay-scrollbar";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRightIcon, ExternalLinkIcon } from "lucide-react";

import { loadRuntimeSetupMode } from "@/lib/dashboard/route-data";
import { splitI18nTemplate } from "@/lib/i18n/template";
import { dashboardPageTitle } from "@/lib/page-title";

/** The root secret (src/lib/secrets.ts); required in everyapp.config.ts. */
const SECRET_NAME = "MAIN_SECRET";
/** The app's id in everyapp.config.ts, so the command runs from anywhere. */
const APP_ID = "analytics";
const SET_COMMAND = `pnpm everyapp secret set ${SECRET_NAME} --app ${APP_ID}`;
const GENERATE_COMMAND = "openssl rand -base64 32";
const DEV_COMMAND = "everyapp dev";
const DEV_VARS_FILE = ".dev.vars";
/** The README's Settings table: what the app needs and how to set it. */
const SETTINGS_DOCS_URL =
  "https://github.com/every-app/private-open-analytics#settings";

export const Route = createFileRoute("/$locale/runtime-config-error")({
  // Under `everyapp dev` the root secret comes from .dev.vars, not the
  // secret command, so the page asks the Worker which it is.
  loader: () => loadRuntimeSetupMode(),
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

/** A translated sentence with its names and commands rendered as code. */
function Sentence({
  template,
  values,
}: {
  template: string;
  values: Record<string, string>;
}) {
  return (
    <>
      {splitI18nTemplate(template).map((part, index) =>
        "text" in part ? (
          part.text
        ) : (
          <code key={index} className="font-mono">
            {values[part.placeholder] ?? ""}
          </code>
        ),
      )}
    </>
  );
}

/**
 * Every page lands here while MAIN_SECRET is unset, before anyone is known
 * (middleware.ts), so everyone gets the one line and the deployer's fix
 * waits folded underneath: the secret command on a deployment, .dev.vars
 * under `everyapp dev`.
 */
function Page() {
  const { messages } = Route.useRouteContext();
  const { dev } = Route.useLoaderData();
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
            {dev ? (
              <p className="text-muted-foreground">
                <Sentence
                  template={copy.devSetup}
                  values={{
                    command: DEV_COMMAND,
                    name: SECRET_NAME,
                    file: DEV_VARS_FILE,
                  }}
                />
              </p>
            ) : (
              <>
                <p className="text-muted-foreground">
                  <Sentence
                    template={copy.setupCommand}
                    values={{ name: SECRET_NAME }}
                  />
                </p>
                <OverlayScrollbar
                  axis="horizontal"
                  className="rounded-md border bg-muted"
                  contentClassName="w-max min-w-full px-3 py-2"
                >
                  <code className="block text-xs whitespace-pre">
                    {SET_COMMAND}
                  </code>
                </OverlayScrollbar>
                <p className="text-muted-foreground">
                  <Sentence
                    template={copy.generateHint}
                    values={{ command: GENERATE_COMMAND }}
                  />
                </p>
              </>
            )}
            <a
              href={SETTINGS_DOCS_URL}
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
