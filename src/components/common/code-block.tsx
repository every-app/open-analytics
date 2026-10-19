import { CopyButton } from "@/components/common/copy-button";
import { cn } from "@/lib/utils";

/** Text to paste somewhere else (a tag, a command), with its Copy button. */
export function CodeBlock({
  value,
  copyLabel,
  copiedLabel,
  wrap = true,
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
  /** Wrap long lines; off for multi-line snippets that scroll instead. */
  wrap?: boolean;
}) {
  return (
    <div className="flex w-full min-w-0 items-start gap-2">
      <pre
        className={cn(
          "min-w-0 flex-1 rounded-lg border border-border bg-muted/60 px-3 py-2 font-mono text-xs leading-5",
          wrap ? "wrap-anywhere whitespace-pre-wrap" : "overflow-x-auto",
        )}
      >
        {value}
      </pre>
      <CopyButton
        value={value}
        label={copyLabel}
        copiedLabel={copiedLabel}
        className="mt-1"
      />
    </div>
  );
}
