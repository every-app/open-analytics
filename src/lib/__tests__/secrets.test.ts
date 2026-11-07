import { describe, expect, it } from "vitest";

import { rootSecret } from "@/lib/secrets";

describe("root secret", () => {
  it("uses a trimmed MAIN_SECRET as the root secret", () => {
    expect(rootSecret({ MAIN_SECRET: " main " })).toBe("main");
    expect(rootSecret({ MAIN_SECRET: "  " })).toBeNull();
    expect(rootSecret({})).toBeNull();
  });
});
