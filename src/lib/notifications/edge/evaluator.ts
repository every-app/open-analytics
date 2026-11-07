import type { Env } from "@/lib/edge/types";
import type { NotificationMessageDraft } from "@/lib/notifications/message";
import {
  CHANGE_ALERT_COOLDOWN_SECONDS,
  type ChangeCondition,
  type ReportSchedule,
} from "@/lib/notifications/rules";

import type { NotificationInvocationCache } from "./notification-cache";
import { loadReportData, loadSiteInfo, loadVisitorChange } from "./report-data";
import type { NotificationRule } from "./rule-store";

export type NotificationRuleEvaluationResult =
  | { status: "skipped"; reason: "site_not_found" }
  | { status: "checked"; triggered: false }
  | {
      status: "triggered";
      message: NotificationMessageDraft;
      cooldownUntil: number | null;
    };

function numberWithCommas(value: number): string {
  return Math.trunc(value).toLocaleString("en-US");
}

function siteDisplayName(site: { name: string; domain: string }): string {
  return site.domain || site.name || "Site";
}

async function evaluateReport(
  env: Env,
  rule: NotificationRule,
  schedule: ReportSchedule,
  now: number,
  cache?: NotificationInvocationCache,
): Promise<NotificationRuleEvaluationResult> {
  const data = await loadReportData(env, {
    siteId: rule.siteId,
    now,
    reportType: schedule.kind,
    timezone: schedule.timezone,
    cache,
  });
  if (!data) return { status: "skipped", reason: "site_not_found" };
  const site = siteDisplayName({
    name: data.siteName,
    domain: data.siteDomain,
  });
  const title = `${site} ${schedule.kind} traffic report`;
  const summary = `${data.range.label}: ${numberWithCommas(data.metrics.visitors)} visitors and ${numberWithCommas(data.metrics.views)} views.`;
  return {
    status: "triggered",
    cooldownUntil: null,
    message: {
      type: "report",
      severity: "info",
      title,
      summary,
      bodyText: summary,
      data: {
        ruleId: rule.id,
        siteId: rule.siteId,
        siteName: data.siteName,
        siteDomain: data.siteDomain,
        reportType: schedule.kind,
        range: data.range,
        metrics: data.metrics,
        topPages: data.topPages,
        topReferrers: data.topReferrers,
      },
    },
  };
}

/**
 * The change in visitors as a percentage of the previous window. Traffic out
 * of nothing counts as a 100% rise.
 */
export function visitorChangePercent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

async function evaluateChange(
  env: Env,
  rule: NotificationRule,
  condition: ChangeCondition,
  now: number,
  cache?: NotificationInvocationCache,
): Promise<NotificationRuleEvaluationResult> {
  const siteInfo = await loadSiteInfo(env, rule.siteId, cache);
  if (!siteInfo) return { status: "skipped", reason: "site_not_found" };
  const change = await loadVisitorChange(env, {
    siteId: rule.siteId,
    window: condition.window,
    now,
    cache,
  });
  const percent = visitorChangePercent(change.current, change.previous);
  const triggered =
    condition.direction === "spike"
      ? percent >= condition.percent
      : percent <= -condition.percent;
  if (!triggered) return { status: "checked", triggered: false };

  const site = siteDisplayName(siteInfo);
  const summary = `Visitors ${condition.direction === "spike" ? "rose" : "fell"} ${numberWithCommas(Math.abs(percent))}% (${numberWithCommas(change.previous)} to ${numberWithCommas(change.current)}).`;
  return {
    status: "triggered",
    cooldownUntil: now + CHANGE_ALERT_COOLDOWN_SECONDS,
    message: {
      type: "change",
      severity: "warning",
      title: `${site} traffic ${condition.direction}`,
      summary,
      bodyText: summary,
      data: {
        ruleId: rule.id,
        siteId: rule.siteId,
        siteName: siteInfo.name,
        siteDomain: siteInfo.domain,
        direction: condition.direction,
        window: condition.window,
        threshold: condition.percent,
        current: change.current,
        previous: change.previous,
        change: percent,
        range: change.range,
        previousRange: change.previousRange,
      },
    },
  };
}

export function evaluateNotificationRule(
  env: Env,
  rule: NotificationRule,
  now: number,
  cache?: NotificationInvocationCache,
): Promise<NotificationRuleEvaluationResult> {
  return rule.type === "report"
    ? evaluateReport(env, rule, rule.schedule, now, cache)
    : evaluateChange(env, rule, rule.condition, now, cache);
}
