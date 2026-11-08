import {
  TRAFFIC_CHANNEL_IDS,
  type TrafficChannelId,
} from "@/lib/analytics/traffic-channel-rules";
import { describeFilterCondition } from "@/lib/dashboard/filter-description";
import { decodeUrlDisplayValue } from "@/lib/dashboard/url-display";
import {
  analyticsFilterRegistry,
  type FilterCondition,
  type FilterDocument,
  FilterOperator,
  type FilterValue,
  PROPERTY_FIELD,
} from "@/lib/filter-contract";
import { resolveCountryLabel } from "@/lib/i18n/code-labels";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";

type PillMessages = Pick<
  AppMessages,
  | "common"
  | "conditionDescription"
  | "dashboard"
  | "filterBuilder"
  | "filterPills"
  | "overview"
>;

/** The dashboard cards' fields, named as their cards name them. */
const FIELD_LABELS: Readonly<
  Record<string, (messages: PillMessages) => string>
> = {
  "page.path": (messages) => messages.dashboard.columns.page,
  "session.entryPath": (messages) => messages.dashboard.columns.entryPage,
  "session.exitPath": (messages) => messages.dashboard.columns.exitPage,
  "referrer.domain": (messages) => messages.dashboard.columns.source,
  "traffic.channel": (messages) => messages.dashboard.columns.channel,
  "utm.source": (messages) => messages.dashboard.tabs.utm.source,
  "utm.medium": (messages) => messages.dashboard.tabs.utm.medium,
  "utm.campaign": (messages) => messages.dashboard.tabs.utm.campaign,
  "utm.term": (messages) => messages.dashboard.tabs.utm.term,
  "utm.content": (messages) => messages.dashboard.tabs.utm.content,
  "geo.country": (messages) => messages.dashboard.columns.country,
  "geo.region": (messages) => messages.dashboard.columns.region,
  "geo.city": (messages) => messages.dashboard.columns.city,
  "client.browser": (messages) => messages.dashboard.columns.browser,
  "client.osVersion": (messages) => messages.dashboard.columns.operatingSystem,
  "client.deviceType": (messages) => messages.dashboard.columns.device,
};

/** One active filter as a pill: what it says, and the filters without it. */
export interface FilterPill {
  key: string;
  label: string;
  without: FilterDocument;
}

const DIRECT_REFERRER_FILTER_VALUE = "__direct__";
const LOCATION_FIELDS = ["geo.country", "geo.region", "geo.city"] as const;

function fieldOf(condition: FilterCondition): string | null {
  return condition.target.kind === "field" ? condition.target.field : null;
}

function valueText(
  field: string,
  value: FilterValue,
  messages: PillMessages,
  locale: Locale,
): string {
  const text = String(value);
  if (field === "geo.country") {
    return resolveCountryLabel(text, locale, messages.common.unknown).label;
  }
  if (field === "traffic.channel") {
    return TRAFFIC_CHANNEL_IDS.includes(text as TrafficChannelId)
      ? messages.overview.channelLabels[text as TrafficChannelId]
      : text;
  }
  if (field === "referrer.domain" && text === DIRECT_REFERRER_FILTER_VALUE) {
    return messages.overview.direct;
  }
  if (field === "geo.city" || field === "geo.region") {
    // Filters keep places in lowercase; a pill names them as places.
    return text.replace(
      /(^|[\s-])(\p{Ll})/gu,
      (_, start: string, letter: string) =>
        `${start}${letter.toLocaleUpperCase()}`,
    );
  }
  if (field === "client.deviceType") {
    const labels = messages.common.deviceLabels;
    return text in labels ? labels[text as keyof typeof labels] : text;
  }
  return decodeUrlDisplayValue(text);
}

function conditionText(
  condition: FilterCondition,
  field: string,
  messages: PillMessages,
  locale: Locale,
): string {
  const fieldLabel =
    FIELD_LABELS[field]?.(messages) ??
    messages.filterBuilder.fieldLabels[field] ??
    field;
  const value = condition.value;
  const values = Array.isArray(value) ? value : [value];
  const isPlainValue = values.every(
    (item) =>
      item === null || ["string", "number", "boolean"].includes(typeof item),
  );
  if (value === undefined || !isPlainValue) {
    return describeFilterCondition(
      condition,
      analyticsFilterRegistry,
      messages,
    );
  }
  const text = (values as FilterValue[])
    .map((item) => valueText(field, item, messages, locale))
    .join(messages.filterPills.valueSeparator);
  if (
    condition.operator === FilterOperator.Eq ||
    condition.operator === FilterOperator.In
  ) {
    return formatI18nTemplate(messages.filterPills.is, {
      field: fieldLabel,
      value: text,
    });
  }
  if (
    condition.operator === FilterOperator.Neq ||
    condition.operator === FilterOperator.NotIn
  ) {
    return formatI18nTemplate(messages.filterPills.isNot, {
      field: fieldLabel,
      value: text,
    });
  }
  const operator =
    messages.filterBuilder.operatorLabels[condition.operator] ??
    condition.operator;
  return `${fieldLabel} ${operator.toLocaleLowerCase()} ${text}`;
}

/**
 * The page's filters as pills, one per condition, with a location's
 * country, region and city as one.
 */
export function filterPills(
  document: FilterDocument,
  messages: PillMessages,
  locale: Locale,
): FilterPill[] {
  const conditions = document.conditions;
  const pills: FilterPill[] = [];
  const isLocation = (condition: FilterCondition) =>
    (LOCATION_FIELDS as readonly string[]).includes(fieldOf(condition) ?? "");
  const locationIndexes = conditions.flatMap((condition, index) =>
    isLocation(condition) ? [index] : [],
  );
  conditions.forEach((condition, index) => {
    const field = fieldOf(condition);
    if (isLocation(condition)) {
      // The location's most specific part speaks for all of it.
      if (index !== locationIndexes.at(-1)) return;
      const location = locationIndexes
        .map((locationIndex) => conditions[locationIndex]!)
        .sort(
          (left, right) =>
            LOCATION_FIELDS.indexOf(fieldOf(right) as never) -
            LOCATION_FIELDS.indexOf(fieldOf(left) as never),
        )[0]!;
      pills.push({
        key: "location",
        label: conditionText(location, fieldOf(location)!, messages, locale),
        without: {
          conditions: conditions.filter(
            (_, other) => !locationIndexes.includes(other),
          ),
        },
      });
      return;
    }
    pills.push({
      key: `${index}:${field ?? PROPERTY_FIELD}`,
      label: field
        ? conditionText(condition, field, messages, locale)
        : describeFilterCondition(condition, analyticsFilterRegistry, messages),
      without: {
        conditions: conditions.filter((_, other) => other !== index),
      },
    });
  });
  return pills;
}
