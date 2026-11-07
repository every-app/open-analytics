import type { FilterDocument } from "@/lib/filter-contract/filters";

import type { BaseQuery, Sort } from "./types";

// Custom properties: page views' properties and events' top-level string
// payload values, together by key, as in Plausible.

export interface PropertyKeysQuery extends BaseQuery {
  readonly filters: FilterDocument;
  readonly limit: number;
}

/** A key seen in the period, with the visitors who had it. */
export interface PropertyKey {
  readonly key: string;
  readonly visitors: number;
}

export interface PropertyKeysResult {
  readonly items: readonly PropertyKey[];
}

/** What a key's values can be ordered by. */
export enum PropertyValueSortKey {
  Visitors = "visitors",
  Sessions = "sessions",
  Views = "views",
  Events = "events",
}

export interface PropertyValuesQuery extends BaseQuery {
  readonly filters: FilterDocument;
  readonly key: string;
  /** Keeps the values containing it, ignoring case; empty keeps all. */
  readonly search: string;
  readonly sort: Sort<PropertyValueSortKey>;
  readonly limit: number;
}

/** A value of a key with its visitors, visits, page views and events. */
export interface PropertyValue {
  readonly value: string;
  readonly visitors: number;
  readonly sessions: number;
  readonly views: number;
  readonly events: number;
}

export interface PropertyValuesResult {
  readonly key: string;
  readonly items: readonly PropertyValue[];
}
