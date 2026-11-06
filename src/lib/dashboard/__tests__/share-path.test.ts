import { describe, expect, it } from "vitest";

import { sharePath } from "@/lib/dashboard/share-path";

describe("sharePath", () => {
  it("encodes the slug in the public share URL", () => {
    expect(sharePath("public site")).toBe("/share/public%20site");
  });

  it("preserves the requested public dashboard section", () => {
    expect(sharePath("public-site", "pages")).toBe("/share/public-site/pages");
  });
});
