import type { TeamNotificationsInitialData } from "@/lib/dashboard/management-data";
import { browserTimeZone } from "@/lib/dashboard/time-zone";
import type {
  NotificationRuleData,
  SiteData,
} from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import type {
  ChangeDirection,
  ChangeWindow,
  NotificationRuleType,
  ReportFrequency,
  ReportSchedule,
} from "@/lib/notifications/rules";

type NotificationsCopy = AppMessages["teamManagement"]["notifications"];

export interface TeamNotificationsClientProps {
  locale: Locale;
  messages: AppMessages;
  teamId: string;
  /**
   * Owners and admins see and manage every rule and add sites; members see
   * and manage their own rules.
   */
  canManage: boolean;
  initialData?: TeamNotificationsInitialData | null;
}
/** The rule dialog's fields, as the inputs hold them. */
export interface RuleFormState {
  id: string;
  name: string;
  type: NotificationRuleType;
  siteId: string;
  frequency: ReportFrequency;
  dayOfWeek: string;
  dayOfMonth: string;
  time: string;
  timezone: string;
  direction: ChangeDirection;
  window: ChangeWindow;
  percent: string;
}
export const EMPTY_FORM: RuleFormState = {
  id: "",
  name: "",
  type: "report",
  siteId: "",
  frequency: "weekly",
  dayOfWeek: "1",
  dayOfMonth: "1",
  time: "08:00",
  timezone: "UTC",
  direction: "spike",
  window: "last_1h",
  percent: "50",
};
export const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});
export const WEEK_DAY_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

export function inferFormFromRule(rule: NotificationRuleData): RuleFormState {
  const base = {
    ...EMPTY_FORM,
    id: rule.id,
    name: rule.name,
    type: rule.type,
    siteId: rule.siteId,
  };
  if (rule.type === "change")
    return {
      ...base,
      ...rule.condition,
      percent: String(rule.condition.percent),
    };
  const { schedule } = rule;
  return {
    ...base,
    frequency: schedule.kind,
    time: schedule.time,
    timezone: schedule.timezone,
    dayOfWeek:
      schedule.kind === "weekly" ? String(schedule.dayOfWeek) : base.dayOfWeek,
    dayOfMonth:
      schedule.kind === "monthly"
        ? String(schedule.dayOfMonth)
        : base.dayOfMonth,
  };
}
function scheduleFromForm(form: RuleFormState): ReportSchedule {
  const time = form.time;
  const timezone = form.timezone;
  return form.frequency === "weekly"
    ? { kind: "weekly", dayOfWeek: Number(form.dayOfWeek), time, timezone }
    : { kind: "monthly", dayOfMonth: Number(form.dayOfMonth), time, timezone };
}
export function defaultName(
  copy: NotificationsCopy,
  type: NotificationRuleType,
  site?: SiteData,
): string {
  return formatI18nTemplate(copy.defaultNames[type], {
    site: site?.name || copy.siteLabel,
  });
}
/** What the rule endpoint takes; the server checks every field. */
export function buildRulePayload(
  copy: NotificationsCopy,
  form: RuleFormState,
  sites: SiteData[],
) {
  const site = sites.find((item) => item.id === form.siteId);
  const common = {
    name: form.name.trim() || defaultName(copy, form.type, site),
    siteId: form.siteId,
  };
  return form.type === "report"
    ? { ...common, type: form.type, schedule: scheduleFromForm(form) }
    : {
        ...common,
        type: form.type,
        condition: {
          direction: form.direction,
          window: form.window,
          percent: Number(form.percent),
        },
      };
}
/** When a rule sends: its schedule, or the change it watches for. */
export function ruleConditionLabel(
  copy: NotificationsCopy,
  rule: NotificationRuleData,
): string {
  if (rule.type === "change") {
    return formatI18nTemplate(copy.alertCondition, {
      direction: copy.directions[rule.condition.direction],
      percent: String(rule.condition.percent),
      window: copy.windows[rule.condition.window],
    });
  }
  const { schedule } = rule;
  return schedule.kind === "weekly"
    ? formatI18nTemplate(copy.scheduleWeekly, {
        day: copy.weekDays[schedule.dayOfWeek] ?? "",
        time: schedule.time,
      })
    : formatI18nTemplate(copy.scheduleMonthly, {
        day: String(schedule.dayOfMonth),
        time: schedule.time,
      });
}
export function siteLabel(
  siteById: Map<string, SiteData>,
  siteId: string,
): string {
  const site = siteById.get(siteId);
  if (!site) return siteId;
  return site.name === site.domain
    ? site.name
    : `${site.name} (${site.domain})`;
}
export function browserDefaultTimeZone(): string {
  return browserTimeZone() || "UTC";
}
