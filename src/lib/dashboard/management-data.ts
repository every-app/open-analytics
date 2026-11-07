import type { NotificationPreferencesData } from "@/lib/dashboard-api/client/edge";
import type {
  NotificationMessageData,
  NotificationRuleData,
  SiteData,
} from "@/lib/dashboard-api/contract/types";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";
import type { RetentionConfig } from "@/lib/retention";
import type { SiteSettingsConfig } from "@/lib/site-settings";
export type ManagementJsonValue =
  | string
  | number
  | boolean
  | null
  | ManagementJsonValue[]
  | { [key: string]: ManagementJsonValue };
export type ManagementJsonObject = {
  [key: string]: ManagementJsonValue;
};
export type SerializableNotificationMessageData = Omit<
  NotificationMessageData,
  "data" | "channels" | "deliveryResults"
> & {
  data: ManagementJsonObject;
  channels: ManagementJsonObject;
  deliveryResults: ManagementJsonObject;
};
export interface ScriptSnippetData {
  siteId: string;
  src: string;
  snippet: string;
}
export interface SiteSettingsInitialData {
  config: SiteSettingsConfig;
  scriptSnippet: string;
  origin: string;
  fetchedAt: number;
}
export interface TeamNotificationsInitialData {
  rules: NotificationRuleData[];
  sites: SiteData[];
  /** Null when the gateway's email status couldn't be read. */
  emailConfigured: boolean | null;
  fetchedAt: number;
}
export interface NotificationCenterInitialData {
  messages: SerializableNotificationMessageData[];
  unreadAttentionCount: number;
  fetchedAt: number;
}
export interface AccountNotificationPreferencesInitialData {
  preferences: NotificationPreferencesData;
  /** For the note under the email switch; null when it couldn't be read. */
  notificationEmail: PublicNotificationEmailConfig | null;
  fetchedAt: number;
}
export interface SystemSettingsInitialData {
  notificationEmail: PublicNotificationEmailConfig;
  retention: RetentionConfig;
  fetchedAt: number;
}
