import { Badge } from "@insightflare/ui/badge";
import { useQuery } from "@tanstack/react-query";

import { EmailNotSetUp } from "@/components/dashboard/notifications/email-not-set-up";
import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import type { SystemSettingsInitialData } from "@/lib/dashboard/management-data";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { AppMessages } from "@/lib/i18n/messages";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";

/**
 * Notification email is sent by the Every App gateway: this section shows
 * whether it can send, and from which address.
 */
export function EmailSenderStatus({
  messages,
  initialData,
}: {
  messages: AppMessages;
  initialData: SystemSettingsInitialData | null;
}) {
  const copy = messages.systemSettings;
  const statusQuery = useQuery({
    queryKey: ["dashboard", "notification-email-config"],
    queryFn: ({ signal }) =>
      requestAdminService<PublicNotificationEmailConfig>("notification-email", {
        signal,
      }),
    initialData: initialData?.notificationEmail,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const status = statusQuery.data;

  return (
    <SettingsSection title={copy.notificationEmailTitle}>
      <SettingsCard>
        <SettingsRow
          label={copy.emailSenderLabel}
          description={
            status?.enabled === false ? (
              <EmailNotSetUp messages={messages} />
            ) : undefined
          }
        >
          {status?.enabled && status.sender ? (
            <span className="text-sm text-muted-foreground">
              {status.sender}
            </span>
          ) : null}
          {/* Null: the status couldn't be read; say nothing rather than Off. */}
          {status && status.enabled !== null ? (
            <Badge variant={status.enabled ? "success" : "warning"}>
              {status.enabled ? copy.enabledOn : copy.enabledOff}
            </Badge>
          ) : null}
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
