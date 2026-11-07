import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Field, FieldLabel } from "@insightflare/ui/field";
import { Input } from "@insightflare/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@insightflare/ui/select";

import {
  buildTimeZoneOptions,
  supportedTimeZones,
} from "@/lib/analytics/time-zone";
import { intlLocale } from "@/lib/dashboard/format";
import type { SiteData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import {
  CHANGE_DIRECTIONS,
  CHANGE_WINDOWS,
  MAX_CHANGE_PERCENT,
  MIN_CHANGE_PERCENT,
  NOTIFICATION_RULE_TYPES,
  REPORT_FREQUENCIES,
} from "@/lib/notifications/rules";
import { cn } from "@/lib/utils";

import {
  browserDefaultTimeZone,
  defaultName,
  type RuleFormState,
  TIME_OPTIONS,
  WEEK_DAY_INDEXES,
} from "./model";

function RuleFormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <hr className="border-border" />
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  );
}

function OptionSelect<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => {
          if (options.includes(next as T)) onChange(next as T);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function RuleFormFields({
  copy,
  locale,
  form,
  sites,
  onChange,
}: {
  copy: AppMessages["teamManagement"]["notifications"];
  locale: Locale;
  form: RuleFormState;
  sites: SiteData[];
  onChange: (patch: Partial<RuleFormState>) => void;
}) {
  const timeZones = useMemo(() => supportedTimeZones(), []);
  const timeZoneOptionTimestamp = useMemo(() => Date.now(), []);
  const [localTimeZone, setLocalTimeZone] = useState("UTC");
  useEffect(() => {
    setLocalTimeZone(browserDefaultTimeZone());
  }, []);
  const timeZoneOptions = useMemo(
    () =>
      buildTimeZoneOptions({
        locale: intlLocale(locale),
        supported: timeZones,
        selected: form.timezone,
        active: form.timezone,
        browser: localTimeZone,
        timestampMs: timeZoneOptionTimestamp,
      }),
    [form.timezone, locale, localTimeZone, timeZoneOptionTimestamp, timeZones],
  );
  const selectedSite = sites.find((site) => site.id === form.siteId);

  return (
    <div className="space-y-5">
      <Field>
        <FieldLabel>{copy.ruleTypeLabel}</FieldLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {NOTIFICATION_RULE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "min-h-16 border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                form.type === type
                  ? "border-primary bg-primary/8 text-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
              onClick={() => onChange({ type })}
            >
              <span className="block font-medium text-foreground">
                {copy.ruleTypes[type]}
              </span>
              <span className="mt-1 block leading-4">
                {copy.ruleTypeDescriptions[type]}
              </span>
            </button>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel>{copy.siteLabel}</FieldLabel>
          <Select
            value={form.siteId}
            onValueChange={(siteId) => onChange({ siteId })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={copy.chooseSite} />
            </SelectTrigger>
            <SelectContent>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>{copy.nameLabel}</FieldLabel>
          <Input
            value={form.name}
            placeholder={defaultName(copy, form.type, selectedSite)}
            maxLength={160}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </Field>
      </div>

      {form.type === "report" ? (
        <RuleFormSection title={copy.sendScheduleSection}>
          <div className="grid gap-4 md:grid-cols-2">
            <OptionSelect
              label={copy.scheduleLabel}
              value={form.frequency}
              options={REPORT_FREQUENCIES}
              labels={copy.scheduleKinds}
              onChange={(frequency) => onChange({ frequency })}
            />
            {form.frequency === "weekly" ? (
              <Field>
                <FieldLabel>{copy.dayLabel}</FieldLabel>
                <Select
                  value={form.dayOfWeek}
                  onValueChange={(dayOfWeek) => onChange({ dayOfWeek })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEK_DAY_INDEXES.map((index) => (
                      <SelectItem key={index} value={String(index)}>
                        {copy.weekDays[index]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field>
                <FieldLabel>{copy.dayOfMonthLabel}</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dayOfMonth}
                  onChange={(event) =>
                    onChange({ dayOfMonth: event.target.value })
                  }
                />
              </Field>
            )}
            <Field>
              <FieldLabel>{copy.timeLabel}</FieldLabel>
              <Select
                value={form.time}
                onValueChange={(time) => onChange({ time })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="min-w-0">
              <FieldLabel>{copy.timezoneLabel}</FieldLabel>
              <Select
                value={form.timezone}
                onValueChange={(timezone) => onChange({ timezone })}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {timeZoneOptions.map((timeZone) => (
                    <SelectItem key={timeZone.value} value={timeZone.value}>
                      {timeZone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </RuleFormSection>
      ) : (
        <RuleFormSection title={copy.conditionSection}>
          <div className="grid gap-4 md:grid-cols-3">
            <OptionSelect
              label={copy.directionLabel}
              value={form.direction}
              options={CHANGE_DIRECTIONS}
              labels={copy.directions}
              onChange={(direction) => onChange({ direction })}
            />
            <Field>
              <FieldLabel>{copy.percentLabel}</FieldLabel>
              <Input
                type="number"
                min={MIN_CHANGE_PERCENT}
                max={MAX_CHANGE_PERCENT}
                step={1}
                value={form.percent}
                onChange={(event) => onChange({ percent: event.target.value })}
              />
            </Field>
            <OptionSelect
              label={copy.windowLabel}
              value={form.window}
              options={CHANGE_WINDOWS}
              labels={copy.windows}
              onChange={(window) => onChange({ window })}
            />
          </div>
        </RuleFormSection>
      )}
    </div>
  );
}
