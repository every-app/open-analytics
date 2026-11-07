/** How long the instance keeps notifications and detailed analytics, in days. */
export interface RetentionConfig {
  notificationAttentionDays: number;
  notificationDefaultDays: number;
  /** Page views and custom events older than this are deleted; hourly totals stay. */
  analyticsDetailDays: number;
}

export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  notificationAttentionDays: 180,
  notificationDefaultDays: 120,
  analyticsDetailDays: 396,
};

export const RETENTION_CONFIG_KEY = "scheduled-task-retention";
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 3650;

function validRetentionDays(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_RETENTION_DAYS &&
    value <= MAX_RETENTION_DAYS
  );
}

export function normalizeRetentionConfig(
  value: Partial<RetentionConfig> | Record<string, unknown> | null | undefined,
): RetentionConfig {
  return {
    notificationAttentionDays: validRetentionDays(
      value?.notificationAttentionDays,
    )
      ? value.notificationAttentionDays
      : DEFAULT_RETENTION_CONFIG.notificationAttentionDays,
    notificationDefaultDays: validRetentionDays(value?.notificationDefaultDays)
      ? value.notificationDefaultDays
      : DEFAULT_RETENTION_CONFIG.notificationDefaultDays,
    analyticsDetailDays: validRetentionDays(value?.analyticsDetailDays)
      ? value.analyticsDetailDays
      : DEFAULT_RETENTION_CONFIG.analyticsDetailDays,
  };
}

export function mergeRetentionConfig(
  current: RetentionConfig,
  patch: Record<string, unknown>,
): RetentionConfig {
  return normalizeRetentionConfig({ ...current, ...patch });
}

export function retentionDaysForNotification(
  input: { severity: string },
  config: RetentionConfig = DEFAULT_RETENTION_CONFIG,
): number {
  if (input.severity === "warning" || input.severity === "critical") {
    return config.notificationAttentionDays;
  }
  return config.notificationDefaultDays;
}
