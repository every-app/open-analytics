import type { Locale } from "@/lib/i18n/config";
import { type AppMessages, getMessages } from "@/lib/i18n/messages";

export type NotificationEmailMessages = AppMessages["notificationEmail"];

export const NOTIFICATION_EMAIL_MESSAGES: Record<
  Locale,
  NotificationEmailMessages
> = {
  en: getMessages("en").notificationEmail,
};
