import { describe, expect, it } from "vitest";

import { normalizeLocalePath } from "./navigation";

describe("normalizeLocalePath", () => {
  it("strips the Traditional Chinese locale prefix", () => {
    expect(normalizeLocalePath("/zh-tw/app/sites/site")).toBe(
      "/app/sites/site",
    );
  });

  it("continues to strip existing locale prefixes", () => {
    expect(normalizeLocalePath("/zh/app/sites/site")).toBe("/app/sites/site");
    expect(normalizeLocalePath("/en/app/sites/site")).toBe("/app/sites/site");
    expect(normalizeLocalePath("/ja/app/sites/site")).toBe("/app/sites/site");
  });
});
