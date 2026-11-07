import { describe, expect, it } from "vitest";

import {
  collectTokenSigningSecret,
  deriveSecret,
  rootSecret,
  SECRET_PURPOSES,
  visitorDailySaltSecret,
} from "@/lib/secrets";

describe("secret derivation", () => {
  it("uses a trimmed MAIN_SECRET as the root secret", () => {
    expect(rootSecret({ MAIN_SECRET: " main " })).toBe("main");
    expect(rootSecret({ MAIN_SECRET: "  " })).toBeNull();
    expect(rootSecret({})).toBeNull();
  });

  it("derives different purpose-specific secrets from the same root", async () => {
    const root = "root-secret";

    await expect(visitorDailySaltSecret({ MAIN_SECRET: root })).resolves.toBe(
      await deriveSecret(root, SECRET_PURPOSES.visitorDailySalt),
    );
    await expect(
      collectTokenSigningSecret({ MAIN_SECRET: root }),
    ).resolves.toBe(
      await deriveSecret(root, SECRET_PURPOSES.collectTokenSigning),
    );
    expect(await visitorDailySaltSecret({ MAIN_SECRET: root })).not.toBe(
      await collectTokenSigningSecret({ MAIN_SECRET: root }),
    );
  });
});
