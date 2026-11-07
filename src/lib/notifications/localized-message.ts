import type { Locale } from "@/lib/i18n/config";

import { buildNotificationContent } from "./content";
import { renderNotificationPlainText } from "./email-text";
import type { NotificationMessageDraft } from "./message";

export interface LocalizedNotificationMessageFields {
  locale: Locale;
  title: string;
  summary: string;
  bodyText: string;
}

/** A rule's message in the recipient's language, as the inbox shows it. */
export function buildLocalizedNotificationMessageFields({
  draft,
  locale,
}: {
  draft: NotificationMessageDraft;
  locale: Locale;
}): LocalizedNotificationMessageFields {
  const message = { type: draft.type, data: draft.data ?? {} };
  const content = buildNotificationContent({ ...message, locale });
  return {
    locale,
    title: content.title,
    summary: content.summary,
    bodyText: renderNotificationPlainText({ content, message, locale }),
  };
}
