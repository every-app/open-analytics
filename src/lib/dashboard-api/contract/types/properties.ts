/** A custom property key seen in the period. */
export interface PropertyKeyStat {
  key: string;
  visitors: number;
}

export interface PropertyKeysData {
  ok: boolean;
  data: { items: PropertyKeyStat[] };
}

/** What a property's values can be ordered by: one of their counts. */
export type PropertyValueSortKey = "visitors" | "sessions" | "views" | "events";

/** A custom property's value with its counts. */
export interface PropertyValueStat {
  value: string;
  visitors: number;
  sessions: number;
  views: number;
  events: number;
}

export interface PropertyValuesData {
  ok: boolean;
  data: { key: string; items: PropertyValueStat[] };
}
