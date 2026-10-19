import { useState } from "react";
import { AutoTransition } from "@insightflare/ui/auto-transition";
import { Badge } from "@insightflare/ui/badge";
import { Button } from "@insightflare/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@insightflare/ui/card";
import { Input } from "@insightflare/ui/input";
import { Label } from "@insightflare/ui/label";
import { PageHeading } from "@insightflare/ui/page-heading";
import { Spinner } from "@insightflare/ui/spinner";
import { useQuery } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";

import type { SystemSettingsInitialData } from "@/lib/dashboard/management-data";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";

interface NotificationEmailSettingsClientProps {
  locale: Locale;
  messages: AppMessages;
  currentUserEmail: string;
  showHeading?: boolean;
  initialData?: SystemSettingsInitialData | null;
}

/**
 * Notification email is the Every App gateway's: this card shows whether it
 * can send, and sends a test message.
 */
export function NotificationEmailSettingsClient({
  messages,
  currentUserEmail,
  showHeading = true,
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
    <div className="space-y-4">
      {showHeading ? (
        <PageHeading title={copy.title} subtitle={copy.subtitle} />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <SendIcon className="size-4" />
            {copy.notificationEmailTitle}
            {status ? (
              <Badge variant={status.enabled ? "default" : "secondary"}>
                {status.enabled ? copy.enabledOn : copy.enabledOff}
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>{copy.notificationEmailDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {status?.enabled
              ? status.sender
                ? `${copy.emailSenderLabel}: ${status.sender}`
                : copy.emailGatewayReady
              : copy.emailGatewayNotReady}
          </p>
          <div className="grid gap-3 border-t pt-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="system-email-test-recipient">
                {copy.testRecipientLabel}
              </Label>
              <Input
                id="system-email-test-recipient"
                type="email"
                value={testRecipient}
                disabled={testing}
                onChange={(event) => setTestRecipient(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={testing || !status?.enabled}
              onClick={() => {
                void handleSendTest();
              }}
            >
              <AutoTransition className="inline-flex items-center gap-[var(--button-content-gap)]">
                {testing ? (
                  <span
                    key="testing"
                    className="inline-flex items-center gap-[var(--button-content-gap)]"
                  >
                    <Spinner data-icon="inline-start" />
                    {copy.testing}
                  </span>
                ) : (
                  <span
                    key="test"
                    className="inline-flex items-center gap-[var(--button-content-gap)]"
                  >
                    <SendIcon data-icon="inline-start" />
                    {copy.test}
                  </span>
                )}
              </AutoTransition>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
