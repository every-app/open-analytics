import type { Map as MaplibreMap } from "maplibre-gl";
import { describe, expect, it, vi } from "vitest";

import {
  applyVectorBasemapColorOverrides,
  getVectorBasemapStyleUrl,
} from "@/lib/dashboard/map-basemap";

function mapStub(
  overrides: Partial<{
    getLayer: (layerId: string) => unknown;
    getPaintProperty: (layerId: string, property: string) => unknown;
    isStyleLoaded: () => boolean;
  }> = {},
): MaplibreMap {
  return {
    getLayer: vi.fn(overrides.getLayer ?? (() => ({}))),
    getPaintProperty: vi.fn(overrides.getPaintProperty ?? (() => undefined)),
    isStyleLoaded: vi.fn(overrides.isStyleLoaded ?? (() => true)),
    setPaintProperty: vi.fn(),
  } as unknown as MaplibreMap;
}

describe("vector basemap helpers", () => {
  it("returns the theme's style path", () => {
    expect(getVectorBasemapStyleUrl("light")).toBe(
      "/api/public/resources/map/v1/styles/light/style.json?v=2",
    );
    expect(getVectorBasemapStyleUrl("dark")).toBe(
      "/api/public/resources/map/v1/styles/dark/style.json?v=2",
    );
  });

  it("applies every dark color override when the style is ready", () => {
    const map = mapStub();

    applyVectorBasemapColorOverrides(map, "dark");

    expect(map.setPaintProperty).toHaveBeenCalledTimes(14);
    expect(map.setPaintProperty).toHaveBeenCalledWith(
      "background",
      "background-color",
      "#090909",
    );
    expect(map.setPaintProperty).toHaveBeenCalledWith(
      "water",
      "fill-color",
      "#262626",
    );
  });

  it("skips overrides when the style is not dark, not loaded, or already matches", () => {
    const lightMap = mapStub();
    applyVectorBasemapColorOverrides(lightMap, "light");
    expect(lightMap.setPaintProperty).not.toHaveBeenCalled();

    const unloadedMap = mapStub({ isStyleLoaded: () => false });
    applyVectorBasemapColorOverrides(unloadedMap, "dark");
    expect(unloadedMap.setPaintProperty).not.toHaveBeenCalled();

    const matchingMap = mapStub({
      getLayer: (layerId) => (layerId === "water" ? {} : null),
      getPaintProperty: () => "#262626",
    });
    applyVectorBasemapColorOverrides(matchingMap, "dark");
    expect(matchingMap.setPaintProperty).not.toHaveBeenCalled();
  });
});
