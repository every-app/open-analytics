import type { ReactNode } from "react";
import {
  CircleAlertIcon,
  InboxIcon,
  type LucideIcon,
  SearchXIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateKind = "no-data" | "filtered" | "error";

const KIND_ICONS: Record<EmptyStateKind, LucideIcon> = {
  "no-data": InboxIcon,
  filtered: SearchXIcon,
  error: CircleAlertIcon,
};

const VARIANTS = {
  plain: "",
  dashed: "border border-dashed border-border",
  card: "border border-border bg-card text-card-foreground shadow-sm",
};

/**
 * The one empty state: an icon, a title, a body and an action.
 *
 * `kind` picks the default icon. Say why the region is empty: "no-data" when
 * nothing exists yet, "filtered" when filters hide every row, "error" when the
 * data failed to load. A list that has nothing in it yet passes
 * `media="rows"`: a few faded rows of the list, each with its icon, stand in
 * for the ones to come.
 */
export function EmptyState({
  kind = "no-data",
  icon: Icon = KIND_ICONS[kind],
  title,
  description,
  action,
  variant = "dashed",
  media = "icon",
  className,
}: {
  kind?: EmptyStateKind;
  /** Pass `null` for a text-only empty state. */
  icon?: LucideIcon | null;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** `dashed` for sections and lists, `card` for a whole panel, `plain` inside a card or table. */
  variant?: keyof typeof VARIANTS;
  media?: "icon" | "rows";
  className?: string;
}) {
  return (
    <div
      role={kind === "error" ? "alert" : undefined}
      className={cn(
        "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl p-6 text-center text-balance",
        VARIANTS[variant],
        className,
      )}
    >
      <div className="flex max-w-sm flex-col items-center gap-2">
        {Icon && media === "rows" ? (
          <EmptyRows icon={Icon} />
        ) : Icon ? (
          <div
            className={cn(
              "mb-2 flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground [&_svg]:size-5",
              kind === "error" && "bg-destructive/10 text-destructive",
            )}
          >
            <Icon aria-hidden />
          </div>
        ) : null}
        <div className="text-sm font-semibold tracking-tight">{title}</div>
        {description ? (
          <div className="text-sm/relaxed text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm">
          {action}
        </div>
      ) : null}
    </div>
  );
}

const ROWS = [
  { name: "w-28", meta: ["w-10", "w-12"] },
  { name: "w-36", meta: ["w-8", "w-14"] },
  { name: "w-24", meta: ["w-12", "w-10"] },
];

/** Three faded placeholder rows of a list, each led by the list's icon. */
function EmptyRows({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div
      aria-hidden
      className="mb-3 flex w-72 max-w-full flex-col gap-2 [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_65%,transparent)]"
    >
      {ROWS.map((row) => (
        <div
          key={row.name}
          className="flex h-11 items-center gap-3 rounded-lg border border-border/70 bg-card px-3.5 shadow-xs"
        >
          <Icon className="size-4 shrink-0 text-muted-foreground/60" />
          <span className={cn("h-2 rounded-full bg-foreground/10", row.name)} />
          <span className="ml-auto flex gap-2">
            {row.meta.map((width) => (
              <span
                key={width}
                className={cn("h-2 rounded-full bg-foreground/[0.06]", width)}
              />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
