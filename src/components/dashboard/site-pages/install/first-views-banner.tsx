import { Button } from "@insightflare/ui/button";
import { CircleCheckIcon, MailIcon, UserPlusIcon, XIcon } from "lucide-react";

import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";

/**
 * Shown on Overview when the first page views arrive while someone watches:
 * it worked, and the next thing worth setting up.
 */
export function FirstViewsBanner({
  messages,
  reportsHref,
  inviteHref,
  onDismiss,
}: {
  messages: AppMessages;
  /** Notifications, for those who can set up reports. */
  reportsHref?: string;
  /** The gateway's members page, for those who can invite. */
  inviteHref?: string;
  onDismiss: () => void;
}) {
  const copy = messages.install;
  return (
    <section
      role="status"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-600/30 bg-emerald-600/5 px-4 py-3"
    >
      <CircleCheckIcon className="size-5 shrink-0 text-emerald-600" />
      <p className="flex-1 font-medium">{copy.firstViewsTitle}</p>
      {reportsHref ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={reportsHref}>
            <MailIcon data-icon="inline-start" />
            {copy.nextReports}
          </Link>
        </Button>
      ) : null}
      {inviteHref ? (
        <Button variant="outline" size="sm" asChild>
          <a href={inviteHref} target="_blank" rel="noreferrer">
            <UserPlusIcon data-icon="inline-start" />
            {copy.nextInvite}
          </a>
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDismiss}
        aria-label={copy.dismiss}
      >
        <XIcon />
      </Button>
    </section>
  );
}
