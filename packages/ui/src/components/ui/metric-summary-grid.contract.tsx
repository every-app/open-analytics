import {
  ActivityIcon,
  CalendarIcon,
  PercentIcon,
  UsersIcon,
} from "lucide-react";

import {
  type ComponentFixture,
  defineComponentContract,
} from "../../contracts/component-contract";
import {
  MetricSummaryGrid,
  type MetricSummaryGridProps,
} from "./metric-summary-grid";

const metricSummaryGridFixtures = [
  {
    id: "metric-summary-grid.state.default",
    title: "Summary metrics",
    presentation: { kind: "scenario", scenario: "default values" },
    props: {
      ariaLabel: "Traffic summary",
      items: [
        {
          id: "events",
          label: "Events",
          value: "12,840",
          icon: <ActivityIcon />,
          detail: "+8.2% from previous period",
        },
        {
          id: "visitors",
          label: "Visitors",
          value: "4,216",
          icon: <UsersIcon />,
          detail: "Across 3,108 sessions",
          change: { value: "+5.4%", direction: "up", tone: "positive" },
        },
        {
          id: "conversion",
          label: "Conversion rate",
          value: "12.5%",
          icon: <PercentIcon />,
          detail: "527 converted visitors",
        },
        {
          id: "cohorts",
          label: "Cohorts",
          value: "30",
          icon: <CalendarIcon />,
          detail: "Periods analyzed",
        },
      ],
    } satisfies MetricSummaryGridProps,
  },
] as const satisfies readonly ComponentFixture<MetricSummaryGridProps>[];

export const metricSummaryGridContract =
  defineComponentContract<MetricSummaryGridProps>({
    id: "metric-summary-grid",
    title: "Metric summary grid",
    category: "Data display",
    categoryId: "data-display",
    description:
      "A consistent responsive summary of labeled metrics and supporting details.",
    fixtures: metricSummaryGridFixtures,
    render: (props) => <MetricSummaryGrid {...props} />,
  });
