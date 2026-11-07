import type { PaginatedCollection } from "./pagination";

export interface EventField {
  path: string;
  valueType: "string" | "number" | "boolean" | "object" | "array" | "null";
  events: number;
  occurrences: number;
  firstSeenAt: number;
  lastSeenAt: number;
  exampleValue?: string | number | boolean | null;
}

export interface EventFieldValueStat {
  value: string | number | boolean | null;
  events: number;
  occurrences: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

export interface EventFieldValuesData {
  ok: boolean;
  fieldPath: string;
  fieldValueType: EventField["valueType"] | "";
  data: PaginatedCollection<EventFieldValueStat>;
}

export interface EventTypeFieldsData {
  ok: boolean;
  eventName: string;
  data: PaginatedCollection<EventField>;
}
