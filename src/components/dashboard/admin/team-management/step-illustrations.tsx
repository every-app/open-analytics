import type { ReactNode } from "react";
import {
  BellIcon,
  GlobeIcon,
  LinkIcon,
  MailIcon,
  PlusIcon,
  UserIcon,
} from "lucide-react";

import type { GetStartedStepId } from "@/lib/edge/admin/setup/get-started";
import { cn } from "@/lib/utils";

// Get started's step pictures: a corner of the screen each step leads to,
// drawn in placeholders and cropped by the step's card. Decoration only.

/** A window peeking in from the card's bottom-right corner. */
function Corner({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute right-0 bottom-0 block w-[62%] rounded-tl-xl border-t border-l border-border bg-card p-3 shadow-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Bar({ className }: { className?: string }) {
  return (
    <span
      className={cn("block h-2 rounded-full bg-foreground/10", className)}
    />
  );
}

function Dots() {
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="size-1.5 rounded-full bg-foreground/15" />
      ))}
    </span>
  );
}

const SITE_TONES = [
  "bg-chart-1/25 text-chart-1",
  "bg-chart-2/25 text-chart-2",
  "bg-chart-3/25 text-chart-3",
];

function Site() {
  return (
    <Corner className="h-[52%]">
      <Dots />
      <span className="mt-3 block space-y-2.5">
        {SITE_TONES.map((tone, index) => (
          <span key={tone} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md",
                tone,
              )}
            >
              <GlobeIcon className="size-3" />
            </span>
            <Bar className={index === 1 ? "w-16" : "w-20"} />
            {index === 0 ? (
              <PlusIcon className="ml-auto size-3 text-primary" />
            ) : (
              <Bar className="ml-auto w-6 bg-foreground/[0.06]" />
            )}
          </span>
        ))}
      </span>
    </Corner>
  );
}

const CHART = ["h-5", "h-8", "h-6", "h-10", "h-9", "h-12"];

function Tracking() {
  return (
    <Corner className="h-[55%]">
      <span className="flex items-center gap-2">
        <Dots />
        <Bar className="w-14 bg-foreground/[0.07]" />
      </span>
      <span className="mt-3 flex h-12 items-end gap-1.5">
        {CHART.map((height, index) => (
          <span
            key={height}
            className={cn(
              "w-3 rounded-sm",
              height,
              index === CHART.length - 1 ? "bg-primary/40" : "bg-foreground/10",
            )}
          />
        ))}
      </span>
    </Corner>
  );
}

function Team() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute right-5 bottom-6 flex items-center"
    >
      <span className="relative z-20 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-background">
        <UserIcon className="size-6" />
        <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-card text-primary shadow-sm ring-1 ring-border">
          <PlusIcon className="size-3" />
        </span>
      </span>
      <span className="z-10 -ml-3 flex size-12 items-center justify-center rounded-full bg-primary/20 text-primary/60 ring-4 ring-background">
        <UserIcon className="size-5" />
      </span>
      <span className="-ml-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary/40 ring-4 ring-background">
        <UserIcon className="size-4" />
      </span>
    </span>
  );
}

function Notifications() {
  return (
    <Corner className="h-[52%]">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <MailIcon className="size-3.5" />
        <Bar className="w-12" />
      </span>
      <span className="mt-3 flex gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary">
          <BellIcon className="size-3.5" />
        </span>
        <span className="block flex-1 space-y-1.5 pt-0.5">
          <Bar className="w-12 bg-foreground/15" />
          <span className="flex h-5 items-end gap-1">
            {["h-2", "h-3", "h-2.5", "h-4", "h-5"].map((height) => (
              <span
                key={height}
                className={cn("w-2 rounded-sm bg-chart-1/30", height)}
              />
            ))}
          </span>
        </span>
      </span>
    </Corner>
  );
}

function Sharing() {
  return (
    <Corner className="h-[52%]">
      <span className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
        <LinkIcon className="size-3.5 text-primary" />
        <Bar className="w-16" />
      </span>
      <span className="mt-3 flex gap-1.5">
        {[
          "bg-chart-2/25",
          "bg-chart-3/25",
          "bg-chart-4/25",
          "bg-chart-5/25",
        ].map((tone) => (
          <span key={tone} className={cn("size-5 rounded-md", tone)} />
        ))}
      </span>
    </Corner>
  );
}

export const STEP_ILLUSTRATIONS: Record<GetStartedStepId, () => ReactNode> = {
  site: Site,
  tracking: Tracking,
  team: Team,
  notifications: Notifications,
  sharing: Sharing,
};
