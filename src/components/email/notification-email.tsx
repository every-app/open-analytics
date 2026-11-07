import * as React from "react";

import { EmailBadge } from "@/components/email/ui/email-badge";
import { EmailCard } from "@/components/email/ui/email-card";
import { EmailLayout } from "@/components/email/ui/email-layout";
import {
  EmailMetricCard,
  EmailMetricGrid,
} from "@/components/email/ui/email-metric";
import {
  EmailListTable,
  EmailTable,
  type EmailTableRow,
} from "@/components/email/ui/email-table";
import {
  createEmailTextStyles,
  emailTableResetStyle,
  emailTheme,
} from "@/components/email/ui/email-theme";
import type { Locale } from "@/lib/i18n/config";
import {
  formatNotificationChange,
  type NotificationContent,
  notificationWindowLabel,
} from "@/lib/notifications/content";
import { formatNotificationNumber } from "@/lib/notifications/email-format";
import { NOTIFICATION_EMAIL_MESSAGES } from "@/lib/notifications/email-i18n";
import type { NotificationMessage } from "@/lib/notifications/message";

export interface NotificationEmailProps {
  locale: Locale;
  content: NotificationContent;
  message: NotificationMessage;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function Intro({ content }: { content: NotificationContent }) {
  const textStyles = createEmailTextStyles();
  return (
    <table
      role="presentation"
      cellPadding="0"
      cellSpacing="0"
      width="100%"
      style={{
        width: "100%",
        margin: "0 0 16px",
        ...emailTableResetStyle,
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "0 0 14px",
              borderBottom: `1px solid ${emailTheme.colors.border}`,
            }}
          >
            <h1 style={textStyles.heading}>{content.title}</h1>
            <p style={textStyles.body}>{content.summary}</p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function ReportEmail({ locale, message }: NotificationEmailProps) {
  const messages = NOTIFICATION_EMAIL_MESSAGES[locale];
  const range = record(message.data.range);
  const metrics = record(message.data.metrics);
  const topPages = rows(message.data.topPages);
  const topReferrers = rows(message.data.topReferrers);
  const pageRows: EmailTableRow[] = topPages.map((page, index) => ({
    label: `${index + 1}. ${textValue(page.path, "/")}`,
    value: `${formatNotificationNumber(page.views, locale)} ${messages.common.viewsUnit}`,
  }));
  const referrerRows: EmailTableRow[] = topReferrers.map((referrer, index) => ({
    label: `${index + 1}. ${textValue(referrer.referrer, messages.common.direct)}`,
    value: `${formatNotificationNumber(referrer.visits, locale)} ${messages.common.visits}`,
  }));

  return (
    <>
      <EmailTable
        rows={[
          {
            label: messages.common.date,
            value: textValue(range.label),
          },
        ]}
      />
      <EmailMetricGrid>
        <EmailMetricCard
          label={messages.common.views}
          value={formatNotificationNumber(metrics.views, locale)}
        />
        <EmailMetricCard
          label={messages.common.visitors}
          value={formatNotificationNumber(metrics.visitors, locale)}
        />
        <EmailMetricCard
          label={messages.common.sessions}
          value={formatNotificationNumber(metrics.sessions, locale)}
        />
      </EmailMetricGrid>
      <EmailListTable
        title={messages.common.topPages}
        rows={pageRows}
        empty={messages.common.noPageData}
      />
      <EmailListTable
        title={messages.common.topReferrers}
        rows={referrerRows}
        empty={messages.common.noReferrerData}
      />
    </>
  );
}

function ChangeEmail({ locale, message }: NotificationEmailProps) {
  const messages = NOTIFICATION_EMAIL_MESSAGES[locale];
  return (
    <>
      <EmailBadge severity={message.severity}>
        {messages.common.severity[message.severity]}
      </EmailBadge>
      <EmailTable
        rows={[
          {
            label: messages.common.window,
            value: notificationWindowLabel(locale, message.data.window),
          },
          {
            label: messages.common.previousValue,
            value: formatNotificationNumber(message.data.previous, locale),
          },
          {
            label: messages.common.currentValue,
            value: formatNotificationNumber(message.data.current, locale),
          },
          {
            label: messages.common.change,
            value: formatNotificationChange(message.data.change, locale),
          },
        ]}
      />
    </>
  );
}

export function NotificationEmail(props: NotificationEmailProps) {
  const { locale, content, message } = props;
  return (
    <EmailLayout locale={locale} preview={content.summary}>
      <EmailCard>
        <Intro content={content} />
        {message.type === "report" ? (
          <ReportEmail {...props} />
        ) : (
          <ChangeEmail {...props} />
        )}
      </EmailCard>
    </EmailLayout>
  );
}
