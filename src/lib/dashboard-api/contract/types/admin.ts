import type { TeamRole } from "@/lib/dashboard/permissions";
import type { NotificationRuleConfig } from "@/lib/notifications/rules";

/** The organization's workspace: every site belongs to it (viewer.ts). */
export interface TeamData {
  id: string;
  name: string;
  slug: string;
  createdAt: number;
  updatedAt?: number;
  siteCount: number;
  /** The viewer's gateway role in the organization. */
  membershipRole?: TeamRole;
}

export interface SiteData {
  id: string;
  teamId: string;
  name: string;
  domain: string;
  iconPath?: string;
  publicEnabled: number | boolean;
  publicSlug: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Someone in the organization who has opened the app (viewer.ts). */
export interface MemberData {
  teamId: string;
  userId: string;
  role: TeamRole;
  email: string;
  name: string | null;
  lastSeenAt: number;
}

export interface AccountUserData {
  id: string;
  email: string;
  name: string;
  /** "admin" for the organization's owners and admins, "user" for members. */
  systemRole: "admin" | "user";
  timeZone?: string;
  createdAt: number;
  updatedAt: number;
}

export type NotificationDeliveryStatus =
  "created" | "sending" | "sent" | "partial" | "failed" | "skipped";

/** A report or alert for one site, sent to the member who created it. */
export type NotificationRuleData = {
  id: string;
  teamId: string;
  siteId: string;
  name: string;
  enabled: boolean;
  lastCheckedAt: number | null;
  lastTriggeredAt: number | null;
  nextRunAt: number | null;
  cooldownUntil: number | null;
  createdByUserId: string | null;
  createdAt: number;
  updatedAt: number;
} & NotificationRuleConfig;

export interface NotificationMessageData {
  id: string;
  teamId: string;
  siteId: string | null;
  userId: string;
  ruleId: string | null;
  batchId: string | null;
  type: string;
  severity: string;
  requiresAttention: boolean;
  title: string;
  summary: string;
  bodyText: string;
  bodyHtml: string;
  data: Record<string, unknown>;
  channels: Record<string, unknown>;
  deliveryStatus: NotificationDeliveryStatus;
  deliveryResults: Record<string, unknown>;
  errorMessage: string;
  readAt: number | null;
  dismissedAt: number | null;
  archivedAt: number | null;
  triggeredAt: number | null;
  createdAt: number;
  updatedAt: number;
  sentAt: number | null;
  failedAt: number | null;
  expiresAt: number | null;
}
