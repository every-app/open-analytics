import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LayerManagerProvider } from "@insightflare/ui/layer-manager";
import { TooltipProvider } from "@insightflare/ui/tooltip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AnalyticsTimeTooltipProvider,
  AnalyticsTooltipTarget,
} from "@/components/dashboard/analytics-time-tooltip";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let container: HTMLDivElement;
let root: Root;

async function render(element: ReactNode) {
  await act(async () => {
    root.render(element);
    await Promise.resolve();
  });
}

describe("AnalyticsTimeTooltipProvider", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.replaceChildren();
  });

  it("mounts its fixed anchor in the page floating host", async () => {
    await render(
      <LayerManagerProvider>
        <TooltipProvider>
          <AnalyticsTimeTooltipProvider>
            <AnalyticsTooltipTarget
              request={{ key: "timestamp", content: "Timestamp" }}
            >
              <span>Timestamp</span>
            </AnalyticsTooltipTarget>
          </AnalyticsTimeTooltipProvider>
        </TooltipProvider>
      </LayerManagerProvider>,
    );

    const trigger = document.querySelector<HTMLElement>(
      '[data-slot="tooltip-trigger"]',
    );
    const host = document.querySelector<HTMLElement>(
      "[data-layer-page-floating-host]",
    );

    expect(trigger).not.toBeNull();
    expect(trigger?.closest("[data-layer-page-floating-host]")).toBe(host);
  });
});
