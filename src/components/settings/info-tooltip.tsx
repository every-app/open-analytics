import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@insightflare/ui/tooltip";
import { InfoIcon } from "lucide-react";

/**
 * An (i) beside a setting's name that explains it on hover or focus.
 * `label` names what it explains, for screen readers.
 */
export function InfoTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm align-middle text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <InfoIcon aria-hidden className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/** A setting's name with its explanation in an (i) tooltip. */
export function LabelWithInfo({
  label,
  info,
}: {
  label: string;
  info: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <InfoTooltip label={label}>{info}</InfoTooltip>
    </span>
  );
}
