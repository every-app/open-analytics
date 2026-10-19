import { useState } from "react";
import { Badge } from "@insightflare/ui/badge";
import { Button } from "@insightflare/ui/button";
import { Input } from "@insightflare/ui/input";
import { Spinner } from "@insightflare/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";

import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import type { SystemSettingsInitialData } from "@/lib/dashboard/management-data";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { AppMessages } from "@/lib/i18n/messages";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";

interface NotificationEmailSettingsClientProps {
  messages: AppMessages;
  currentUserEmail: string;
  initialData?: SystemSettingsInitialData | null;
}

/**
 * Notification email is the Every App gateway's: this section shows whether
 * it can send, and sends a test message.
 */
export function NotificationEmailSettingsClient({
  messages,
  currentUserEmail,
  initialData = null,
}: NotificationEmailSettingsClientProps) {
  const copy = messages.systemSettings;
  const [testRecipient, setTestRecipient] = useState(currentUserEmail);
  const [testing, setTesting] = useState(false);
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

  async function handleSendTest() {
    setTesting(true);
    try {
      await requestAdminService("notification-email/test", {
        method: "POST",
        body: { to: testRecipient.trim() },
      });
      toast.success(copy.testSent);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.testFailed);
    } finally {
      setTesting(false);
    }
  }

  return (
    <SettingsSection title={copy.notificationEmailTitle}>
      <SettingsCard>
        <SettingsRow
          label={copy.emailSenderLabel}
          description={
            status && !status.enabled ? copy.emailGatewayNotReady : undefined
          }
        >
          {status?.enabled && status.sender ? (
            <span className="text-sm text-muted-foreground">
              {status.sender}
            </span>
          ) : null}
          {status ? (
            <Badge variant={status.enabled ? "success" : "warning"}>
              {status.enabled ? copy.enabledOn : copy.enabledOff}
            </Badge>
          ) : null}
        </SettingsRow>
        <SettingsRow
          label={copy.testRecipientLabel}
          htmlFor="system-email-test-recipient"
        >
          <Input
            id="system-email-test-recipient"
            type="email"
            className="sm:w-64"
            value={testRecipient}
            disabled={testing}
            onChange={(event) => setTestRecipient(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={testing || !status?.enabled || !testRecipient.trim()}
            onClick={() => {
              void handleSendTest();
            }}
          >
            {testing ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <SendIcon data-icon="inline-start" />
            )}
            {testing ? copy.testing : copy.test}
          </Button>
        </SettingsRow>
      </SettingsCard>
    </SettingsSection>
  );
}
