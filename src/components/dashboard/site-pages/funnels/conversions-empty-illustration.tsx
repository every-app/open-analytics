import { CheckIcon, TargetIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// The empty Goals & funnels page's picture: a goal reached, beside a funnel
// narrowing over its steps. Drawn in placeholders; decoration only.

function Line({ className }: { className?: string }) {
  return (
    <span
      className={cn("block h-1.5 rounded-full bg-foreground/10", className)}
    />
  );
}

const FUNNEL_STEPS = [
  { width: "w-full", tone: "bg-primary" },
  { width: "w-[64%]", tone: "bg-primary/60" },
  { width: "w-[34%]", tone: "bg-primary/30" },
];

export function ConversionsEmptyIllustration() {
  return (
    <div
      aria-hidden
      className="pointer-events-none flex items-stretch justify-center gap-3 select-none"
    >
      <div className="flex w-32 flex-col items-center justify-center gap-2.5 rounded-xl border border-border bg-card p-4 shadow-sm">
        <span className="relative flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TargetIcon className="size-6" />
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-success text-white ring-2 ring-card">
            <CheckIcon className="size-3" strokeWidth={3} />
          </span>
        </span>
        <Line className="w-16" />
        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success tabular-nums">
          +12%
        </span>
      </div>
      <div className="w-52 space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        {FUNNEL_STEPS.map((step, index) => (
          <div key={step.width} className="flex items-center gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-medium text-muted-foreground">
              {index + 1}
            </span>
            <span className="flex-1">
              <span
                className={cn(
                  "mx-auto block h-4 rounded-md",
                  step.width,
                  step.tone,
                )}
              />
            </span>
          </div>
        ))}
        <Line className="mx-auto w-20" />
      </div>
    </div>
  );
}
