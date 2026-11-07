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
  return (
    <span
      className={`inline-flex items-end gap-0.5 font-mono text-xs leading-none ${changeRateClass(value, lowerIsBetter)}`}
    >
      <Icon className="size-3.5" />
      {formatChangeRate(value)}
    </span>
  );
});
