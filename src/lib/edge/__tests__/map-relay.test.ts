import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { handleMapRelayRequest } from "@/lib/edge/resources/map-relay";
import type { Env } from "@/lib/edge/types";

const env = {} as Env;
const STYLE = {
  layers: [
    { id: "road", layout: { "text-field": ["to-string", ["get", "ref"]] } },
    { id: "place", layout: { "text-field": ["get", "name:latin"] } },
  ],
};

function request(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://app.test${path}`, {
    headers: { "sec-fetch-site": "same-origin", ...headers },
  });
}

describe("map style handler", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(structuredClone(STYLE))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves the open style with place names in the dashboard's language", async () => {
    const response = await handleMapRelayRequest(
      request(
        "/api/public/resources/map/v1/styles/dark/style.json?locale=zh-tw",
      ),
      env,
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://tiles.openfreemap.org/styles/dark",
    );
    expect(((await response.json()) as typeof STYLE).layers).toEqual([
      STYLE.layers[0],
      {
        id: "place",
        layout: {
          "text-field": [
            "coalesce",
            ["get", "name:zh-Hant"],
            ["get", "name:zh"],
            ["get", "name:latin"],
          ],
        },
      },
    ]);
  });

  it("serves only the two styles", async () => {
    const response = await handleMapRelayRequest(
      request("/api/public/resources/map/v1/tiles/1/2/3.mvt"),
      env,
    );

    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("answers 502 when the style host is down", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));

    const response = await handleMapRelayRequest(
      request("/api/public/resources/map/v1/styles/light/style.json"),
      env,
    );

    expect(response.status).toBe(502);
  });
});
