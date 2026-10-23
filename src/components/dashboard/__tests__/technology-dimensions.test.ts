import { beforeEach, describe, expect, it, vi } from "vitest";

const data = vi.hoisted(() => ({
  fetchClientDimensionTrend: vi.fn(),
  fetchBrowserTrend: vi.fn(),
  fetchBrowserEngineTrend: vi.fn(),
}));

vi.mock("@/lib/dashboard/client/data/index", () => data);

import {
  isTechnologyDimension,
  TECHNOLOGY_CROSS_DIMENSIONS,
  TECHNOLOGY_TREND_FETCHERS,
  TechnologyDimension,
  technologyDimensionLabel,
  technologyValueIcon,
  technologyValueLabel,
} from "@/components/dashboard/devices/technology-dimensions";
import type { TimeWindow } from "@/lib/dashboard/query-state";
import { getMessages } from "@/lib/i18n/messages";

const messages = getMessages("en");
const window: TimeWindow = {
  preset: "30d",
  from: 1,
  to: 2,
  interval: "day",
  timeZone: "UTC",
};

describe("technology dimensions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("recognises only its own dimensions", () => {
    expect(isTechnologyDimension("engine")).toBe(true);
    expect(isTechnologyDimension("screenSize")).toBe(true);
    expect(isTechnologyDimension("country")).toBe(false);
  });

  it.each([
    [TechnologyDimension.Device, "deviceType"],
    [TechnologyDimension.Os, "operatingSystem"],
    [TechnologyDimension.ScreenSize, "screenSize"],
  ] as const)(
    "trends %s through the client dimension %s",
    async (dimension, clientDimension) => {
      await TECHNOLOGY_TREND_FETCHERS[dimension](
        "site-1",
        window,
        undefined,
        {},
      );
      expect(data.fetchClientDimensionTrend).toHaveBeenCalledWith(
        "site-1",
        window,
        clientDimension,
        undefined,
        {},
      );
    },
  );

  it("trends browsers and engines through their own fetchers", () => {
    expect(TECHNOLOGY_TREND_FETCHERS[TechnologyDimension.Browser]).toBe(
      data.fetchBrowserTrend,
    );
    expect(TECHNOLOGY_TREND_FETCHERS[TechnologyDimension.Engine]).toBe(
      data.fetchBrowserEngineTrend,
    );
    expect(TECHNOLOGY_CROSS_DIMENSIONS[TechnologyDimension.Engine]).toBe(
      "client.browserEngine",
    );
  });

  it("labels every dimension", () => {
    for (const dimension of Object.values(TechnologyDimension)) {
      expect(technologyDimensionLabel(dimension, messages)).toBeTruthy();
    }
  });

  it("names and draws device types, and leaves other values as reported", () => {
    expect(
      technologyValueLabel(TechnologyDimension.Device, "mobile", messages),
    ).toBe(messages.common.deviceLabels.mobile);
    expect(
      technologyValueIcon(TechnologyDimension.Device, "mobile", messages),
    ).toBeDefined();
    expect(
      technologyValueLabel(TechnologyDimension.Browser, "Firefox", messages),
    ).toBe("Firefox");
    expect(
      technologyValueIcon(TechnologyDimension.Browser, "Firefox", messages),
    ).toBeUndefined();
  });
});
