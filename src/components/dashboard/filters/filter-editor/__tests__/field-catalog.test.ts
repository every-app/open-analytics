import { describe, expect, it } from "vitest";

import {
  allowedFields,
  fieldLabel,
  filterPickerGroups,
} from "@/components/dashboard/filters/filter-editor/field-catalog";
import type { RegisteredFilterField } from "@/lib/filter-contract/filter-registry";
import type { AppMessages } from "@/lib/i18n/messages";

const messages = {
  filterBuilder: {
    fieldGroups: { page: "Pages", event: "Events" },
    fieldLabels: { "page.path": "Page path" },
  },
} as unknown as AppMessages;

describe("filter field catalog", () => {
  it("labels a field by its translation, or its id when there is none", () => {
    const fields = allowedFields("private-dashboard");
    const field = (id: string) => fields.find((item) => item.id === id)!;

    expect(fieldLabel(field("page.path"), messages)).toBe("Page path");
    expect(fieldLabel(field("page.title"), messages)).toBe("page.title");
  });

  it("keeps each audience to its fields", () => {
    const ids = (audience: "public-share" | "private-dashboard") =>
      allowedFields(audience).map((field) => field.id);
    expect(ids("public-share")).not.toContain("page.query");
    expect(ids("private-dashboard")).toContain("page.query");
    expect(
      allowedFields("private-dashboard").find(
        (field) => field.id === "page.scrollDepth",
      ),
    ).toMatchObject({ unit: "%", number: { min: 0, max: 100, step: 1 } });
  });

  it("groups the picker's fields in the registry's order", () => {
    const fields = allowedFields("private-dashboard").filter((field) =>
      ["page.path", "page.title", "event.name"].includes(field.id),
    );
    expect(filterPickerGroups(fields, messages)).toEqual([
      {
        key: "page",
        label: "Pages",
        fields: [
          {
            id: "page.path",
            label: "Page path",
            searchText: "Page path page.path",
          },
          {
            id: "page.title",
            label: "page.title",
            searchText: "page.title page.title",
          },
        ],
      },
      {
        key: "event",
        label: "Events",
        fields: [
          {
            id: "event.name",
            label: "event.name",
            searchText: "event.name event.name",
          },
        ],
      },
    ]);
    const ungrouped = {
      id: "unlisted.field",
      group: "unlisted",
    } as unknown as RegisteredFilterField;
    expect(filterPickerGroups([ungrouped], messages)[0]?.label).toBe(
      "unlisted",
    );
  });
});
