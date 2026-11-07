import { describe, expect, it } from "vitest";

import {
  axisLabelBound,
  type ChartRow,
  isolatedDot,
} from "@/components/dashboard/charts/metric-trend-chart";

const rows: ChartRow[] = [
  { timestampMs: 0, value: null, comparisonValue: 40 },
  { timestampMs: 1, value: 71, comparisonValue: null },
  { timestampMs: 2, value: null, comparisonValue: null },
  { timestampMs: 3, value: 50, comparisonValue: 30 },
  { timestampMs: 4, value: 60, comparisonValue: null },
];

function drawn(key: "value" | "comparisonValue", index: number) {
  return isolatedDot(rows, key)({ cx: 10, cy: 20, index }).type;
}

describe("the trend chart's isolated points", () => {
  it("dots a value with no value on either side, which draws no line", () => {
    expect(drawn("value", 1)).toBe("circle");
    expect(drawn("comparisonValue", 0)).toBe("circle");
    expect(drawn("comparisonValue", 3)).toBe("circle");
  });

  it("leaves points on a line, and empty points, without a dot", () => {
    expect(drawn("value", 2)).toBe("g");
    expect(drawn("value", 3)).toBe("g");
    expect(drawn("value", 4)).toBe("g");
    expect(isolatedDot(rows, "value")({ index: 1 }).type).toBe("g");
    expect(isolatedDot(rows, "value")({ cx: 1, cy: 2 }).type).toBe("g");
  });
});

describe("the trend chart's axis width", () => {
  it("leaves room for the tick above the largest value", () => {
    expect(axisLabelBound(71)).toBe(100);
    expect(axisLabelBound(100)).toBe(100);
    expect(axisLabelBound(0.71)).toBe(1);
    expect(axisLabelBound(3)).toBe(10);
    expect(axisLabelBound(0)).toBe(0);
  });
});
