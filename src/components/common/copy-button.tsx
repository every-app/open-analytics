import { type ComponentProps, useEffect, useState } from "react";
import { Button } from "@insightflare/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

type ButtonProps = ComponentProps<typeof Button>;

/**
 * A Button that copies `value`. An `icon*` size shows only the icon and uses
 * `label` as the accessible name.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  variant = "outline",
  size = "sm",
  className,
}: {
  value: string;
  label: string;
  /** Shown on the button and in a toast once the value is copied. */
  copiedLabel: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const iconOnly = size?.startsWith("icon") ?? false;
  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      aria-label={iconOnly ? label : undefined}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          toast.success(copiedLabel);
        });
      }}
    >
      <Icon
        data-icon={iconOnly ? undefined : "inline-start"}
        className={copied ? "text-success" : undefined}
        aria-hidden
      />
      {iconOnly ? null : copied ? copiedLabel : label}
    </Button>
  );
}
