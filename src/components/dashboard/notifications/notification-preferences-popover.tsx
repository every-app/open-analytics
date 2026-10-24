import { useState } from "react";
import { Button } from "@insightflare/ui/button";
import { Popover } from "@insightflare/ui/popover";
import { Switch } from "@insightflare/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2Icon } from "lucide-react";
import { toast } from "sonner";

import { EmailNotSetUp } from "@/components/dashboard/notifications/email-not-set-up";
import type { AccountNotificationPreferencesInitialData } from "@/lib/dashboard/management-data";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import {
  normalizeNotificationPreferencesData,
  type NotificationPreferencesData,
} from "@/lib/dashboard-api/client/edge";
import type { AppMessages } from "@/lib/i18n/messages";
import type { PublicNotificationEmailConfig } from "@/lib/notifications/email-config";

type AttentionKey = keyof NotificationPreferencesData["attention"];

/**
 * The viewer's notification preferences: email on or off, and which new
 * notifications arrive unread. Each switch saves as it changes.
 */
export function NotificationPreferencesPopover({
  messages,
  userId,
  initialData,
}: {
  messages: AppMessages;
  userId: string;
  initialData: AccountNotificationPreferencesInitialData | null;
}) {
  const copy = messages.notificationCenter;
  const queryClient = useQueryClient();
  const queryKey = ["dashboard", "notification-preferences", userId];
  const [saving, setSaving] = useState(false);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      requestAdminService<NotificationPreferencesData>(
        "notifications/preferences",
        { signal },
      ).then(normalizeNotificationPreferencesData),
    initialData: initialData?.preferences,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const preferences = query.data;
  // Email is optional on the gateway; the switch says so when it isn't set.
  const emailStatusQuery = useQuery({
    queryKey: ["dashboard", "notification-email-config"],
    queryFn: ({ signal }) =>
      requestAdminService<PublicNotificationEmailConfig>("notification-email", {
        signal,
      }),
    initialData: initialData?.notificationEmail ?? undefined,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const emailNotSetUp = emailStatusQuery.data?.enabled === false;

  async function save(next: NotificationPreferencesData) {
    setSaving(true);
    try {
      const saved = await requestAdminService<NotificationPreferencesData>(
        "notifications/preferences",
        { method: "PATCH", body: next },
      );
      queryClient.setQueryData(
        queryKey,
        normalizeNotificationPreferencesData(saved),
      );
    } catch {
      toast.error(copy.preferencesSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  const attentionRows: Array<{ key: AttentionKey; label: string }> = [
    { key: "reportsCreateUnread", label: copy.reportsUnreadLabel },
    { key: "milestonesCreateUnread", label: copy.milestonesUnreadLabel },
    { key: "alertsCreateUnread", label: copy.alertsUnreadLabel },
  ];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={copy.preferencesTitle}
          title={copy.preferencesTitle}
        >
          <Settings2Icon />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="w-72 origin-(--radix-popover-content-transform-origin) rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
            {copy.preferencesTitle}
          </p>
          {preferences ? (
            <div className="flex flex-col">
              <PreferenceRow
                id="inbox-preference-email"
                label={copy.emailNotificationsLabel}
                checked={preferences.email}
                disabled={saving}
                onChange={(email) => void save({ ...preferences, email })}
              />
              {emailNotSetUp ? (
                <p className="px-3 pb-2 text-xs text-muted-foreground">
                  <EmailNotSetUp messages={messages} />
                </p>
              ) : null}
              {attentionRows.map((row) => (
                <PreferenceRow
                  key={row.key}
                  id={`inbox-preference-${row.key}`}
                  label={row.label}
                  checked={preferences.attention[row.key]}
                  disabled={saving}
                  onChange={(checked) =>
                    void save({
                      ...preferences,
                      attention: {
                        ...preferences.attention,
                        [row.key]: checked,
                      },
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {messages.common.loading}
            </p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PreferenceRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2 text-sm hover:bg-foreground/5"
    >
      {label}
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </label>
  );
}
