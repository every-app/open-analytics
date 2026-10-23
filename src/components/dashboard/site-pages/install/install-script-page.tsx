import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@insightflare/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { ActivityIcon, CircleCheckIcon } from "lucide-react";

import { CodeBlock } from "@/components/common/code-block";
import { useRealtimeChannelSelector } from "@/hooks/use-realtime-channel";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { AppMessages } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/** Where people put the script, each with its one-line instruction. */
export enum InstallPlatform {
  Html = "html",
  WordPress = "wordpress",
  Shopify = "shopify",
  NextJs = "nextjs",
  TagManager = "gtm",
}

const PLATFORMS = Object.values(InstallPlatform);

/** The tag each platform's instruction names, set as code. */
const PLATFORM_TAG: Record<InstallPlatform, string> = {
  [InstallPlatform.Html]: "</head>",
  [InstallPlatform.WordPress]: "</head>",
  [InstallPlatform.Shopify]: "</head>",
  [InstallPlatform.NextJs]: "<head>",
  [InstallPlatform.TagManager]: "",
};

function isInstallPlatform(value: string): value is InstallPlatform {
  return (PLATFORMS as string[]).includes(value);
}

/** An instruction with its `{tag}` set as code. */
function WithTag({ template, tag }: { template: string; tag: string }) {
  const [before, after] = template.split("{tag}");
  if (after === undefined) return <>{template}</>;
  return (
    <>
      {before}
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
        {tag}
      </code>
      {after}
    </>
  );
}

/**
 * A site that has never received a page view, on every report page: its
 * tracking script, where to put it, and word the moment it starts working.
 */
export function InstallScriptPage({
  messages,
  siteId,
}: {
  messages: AppMessages;
  siteId: string;
}) {
  const copy = messages.install;
  const [platform, setPlatform] = useState(InstallPlatform.Html);
  const snippet = useQuery({
    queryKey: ["dashboard", "site-script-snippet", siteId],
    queryFn: async ({ signal }) =>
      (
        await requestAdminService<{ snippet: string }>("script-snippet", {
          params: { siteId },
          signal,
        })
      ).snippet,
    enabled: typeof window !== "undefined",
  });
  // The live channel sees a page view at once; the reports, about a minute
  // later, once it's stored.
  const received = useRealtimeChannelSelector(
    siteId,
    (state) => state.viewsLast30m > 0,
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pb-[10vh]">
      <h1 className="text-center text-2xl font-semibold tracking-tight">
        {copy.title}
      </h1>

      <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs">
        <Tabs
          value={platform}
          onValueChange={(value) => {
            if (isInstallPlatform(value)) setPlatform(value);
          }}
        >
          <TabsList variant="line" className="flex-wrap">
            {PLATFORMS.map((item) => (
              <TabsTrigger key={item} value={item}>
                {copy.platforms[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {snippet.data ? (
          <CodeBlock
            value={snippet.data}
            copyLabel={messages.getStarted.copy}
            copiedLabel={messages.getStarted.copied}
          />
        ) : (
          <div className="flex h-9 items-center rounded-lg border border-border bg-muted/60 px-3 text-xs text-muted-foreground">
            <ActivityIcon className="size-3.5 animate-pulse" aria-hidden />
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          <WithTag
            template={copy.steps[platform]}
            tag={PLATFORM_TAG[platform]}
          />
        </p>
      </div>

      <p
        role="status"
        className={cn(
          "inline-flex items-center justify-center gap-2 text-sm",
          received ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {received ? (
          <CircleCheckIcon className="size-4 text-emerald-600" />
        ) : (
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
        )}
        {received ? copy.received : copy.waiting}
      </p>
    </div>
  );
}
