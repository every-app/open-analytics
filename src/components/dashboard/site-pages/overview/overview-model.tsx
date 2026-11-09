import { memo } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

export const METRIC_AREA_COLOR = "var(--color-chart-1)";
export const COMPARISON_AREA_COLOR = "var(--color-chart-secondary-1)";
export function formatChangeRate(value: number | null): string | null {
  if (value === null) return null;
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
export function changeRateClass(
  value: number | null,
  lowerIsBetter = false,
): string {
  if (value === null) return "text-muted-foreground";
  const isImprovement = lowerIsBetter ? value <= 0 : value >= 0;
  return isImprovement ? "text-success" : "text-destructive";
}
export const ChangeRateInline = memo(function ChangeRateInline({
  value,
  lowerIsBetter = false,
}: {
  value: number | null;
  lowerIsBetter?: boolean;
}) {
  if (value === null) return null;
  const Icon = value >= 0 ? ArrowUpIcon : ArrowDownIcon;
  // As Plausible: the arrow says which way and whether that's good, so only
  // it takes the color, and the number is the size of the change.
  return (
    <span className="inline-flex items-end gap-0.5 font-mono text-xs leading-none text-muted-foreground">
      <Icon className={`size-3.5 ${changeRateClass(value, lowerIsBetter)}`} />
      {`${Math.abs(value).toFixed(1)}%`}
    </span>
  );
});
