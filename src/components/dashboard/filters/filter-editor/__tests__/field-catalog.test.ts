import { describe, expect, it } from "vitest";

import {
  allowedFields,
  directEventName,
  fieldLabel,
  filterPickerGroups,
  isSelectablePayloadFieldType,
  payloadFieldTypeLabel,
} from "@/components/dashboard/filters/filter-editor/field-catalog";
import {
  defaultCondition,
  type EditorCondition,
} from "@/components/dashboard/filters/filter-editor/model";
import { FilterOperator } from "@/lib/filter-contract";
import type { RegisteredFilterField } from "@/lib/filter-contract/filter-registry";
import type { AppMessages } from "@/lib/i18n/messages";

const messages = {
  filterBuilder: {
    fieldGroups: { page: "Pages", event: "Events" },
    fieldLabels: { "page.path": "Page path" },
    valueKinds: { string: "String", number: "Number", boolean: "Boolean" },
  },
} as unknown as AppMessages;

function condition(
  field: string,
  valueText: string,
  operator = FilterOperator.Eq,
): EditorCondition {
  return {
    ...defaultCondition(() => field, field),
    operator,
    valueText,
  };
}

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

  it("recognizes only one direct event-name condition", () => {
    expect(directEventName([condition("event.name", " signup ")])).toBe(
      "signup",
    );
    expect(directEventName([])).toBeUndefined();
    expect(
      directEventName([
        condition("event.name", "signup", FilterOperator.Neq),
        condition("page.path", "/pricing"),
      ]),
    ).toBeUndefined();
    expect(
      directEventName([
        condition("event.name", "signup"),
        condition("event.name", "purchase"),
      ]),
    ).toBeUndefined();
  });

  it("labels supported payload types and leaves dynamic types explicit", () => {
    expect(isSelectablePayloadFieldType("string")).toBe(true);
    expect(isSelectablePayloadFieldType("number")).toBe(true);
    expect(isSelectablePayloadFieldType("boolean")).toBe(true);
    expect(isSelectablePayloadFieldType("object")).toBe(false);
    expect(payloadFieldTypeLabel("number", messages)).toBe("Number");
    expect(payloadFieldTypeLabel("object", messages)).toBe("object");
  });
});
