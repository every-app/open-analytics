import { describe, expect, it } from "vitest";

import { formatI18nTemplate } from "@/lib/i18n/template";

describe("Translation Template Interpolator", () => {
  it("should interpolate single string parameters correctly", () => {
    expect(formatI18nTemplate("Hello {name}!", { name: "Antigravity" })).toBe(
      "Hello Antigravity!",
    );
  });

  it("should interpolate multiple parameters in the same template string", () => {
    expect(
      formatI18nTemplate("{greeting}, {name}! Welcome to {place}.", {
        greeting: "Hi",
        name: "Developer",
        place: "Open Analytics",
      }),
    ).toBe("Hi, Developer! Welcome to Open Analytics.");
  });

  it("should coerce numbers and other non-string values into standard strings", () => {
    expect(
      formatI18nTemplate("Remaining days: {days}", {
        days: 30,
      }),
    ).toBe("Remaining days: 30");

    expect(
      formatI18nTemplate("Status is active: {isActive}", {
        isActive: true as any,
      }),
    ).toBe("Status is active: true");
  });

  it("should replace undefined or null parameters with an empty string", () => {
    expect(formatI18nTemplate("Welcome {name}!", {})).toBe("Welcome !");
    expect(formatI18nTemplate("Welcome {name}!", { name: null as any })).toBe(
      "Welcome !",
    );
    expect(
      formatI18nTemplate("Welcome {name}!", { name: undefined as any }),
    ).toBe("Welcome !");
  });

  it("should ignore and preserve unmatched text segments, including single curly braces", () => {
    expect(formatI18nTemplate("This {is} not {matched", { is: "fine" })).toBe(
      "This fine not {matched",
    );
    expect(formatI18nTemplate("Static text only", { unused: "param" })).toBe(
      "Static text only",
    );
  });
});
