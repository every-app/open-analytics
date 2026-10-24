import { useEffect, useMemo, useState } from "react";
import { Badge } from "@insightflare/ui/badge";
import { Button } from "@insightflare/ui/button";
import { Card, CardContent } from "@insightflare/ui/card";
import { PageHeading } from "@insightflare/ui/page-heading";
import { Spinner } from "@insightflare/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@insightflare/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellIcon, CheckCheckIcon, CheckIcon } from "lucide-react";
import { toast } from "sonner";

import { NotificationPreferencesPopover } from "@/components/dashboard/notifications/notification-preferences-popover";
import { shortDateTime } from "@/lib/dashboard/format";
import type {
  AccountNotificationPreferencesInitialData,
  NotificationCenterInitialData,
} from "@/lib/dashboard/management-data";
import { buildSitePath } from "@/lib/dashboard/paths";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { NotificationMessageData } from "@/lib/dashboard-api/client/edge";
import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";
import Link from "@/lib/router";

const VIEWS = ["all", "unread"] as const;
type InboxView = (typeof VIEWS)[number];

type InboxSite = { id: string; name: string; slug: string };

type NotificationsData = {
  messages: NotificationMessageData[];
  unreadAttentionCount: number;
};

function isUnread(item: NotificationMessageData): boolean {
  return item.readAt === null;
}

function emailResult(
  item: NotificationMessageData,
): Record<string, unknown> | null {
  const email = item.deliveryResults.email;
  return typeof email === "object" && email !== null
    ? (email as Record<string, unknown>)
    : null;
}

function emailFailed(item: NotificationMessageData): boolean {
  return emailResult(item)?.status === "failed";
}

/** Delivery skipped the email because the gateway has no sender. */
function emailSkippedUnconfigured(item: NotificationMessageData): boolean {
  const email = emailResult(item);
  return (
    email?.status === "skipped" && email.reason === "system_email_unconfigured"
  );
}

/**
 * The stored body of a generic message starts with its title (the plain-text
 * renderer puts it there for email), and the card already shows the title.
 */
function bodyWithoutTitle(item: NotificationMessageData): string {
  return item.bodyText.startsWith(item.title)
    ? item.bodyText.slice(item.title.length).trim()
    : item.bodyText;
}

/** The viewer's notifications: one list, all or unread. */
export function NotificationCenterClient({
  locale,
  messages,
  userId,
  sites,
  initialData,
  preferencesInitialData,
}: {
  locale: Locale;
  messages: AppMessages;
  userId: string;
  sites: InboxSite[];
  initialData: NotificationCenterInitialData | null;
  preferencesInitialData: AccountNotificationPreferencesInitialData | null;
}) {
  const copy = messages.notificationCenter;
  const queryClient = useQueryClient();
  const [view, setView] = useState<InboxView>("all");
  const [updatingId, setUpdatingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const queryKey = ["dashboard", "notification-messages", locale] as const;
  const messagesQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      requestAdminService<NotificationsData>("notifications", {
        params: { locale, limit: 80 },
        signal,
      }),
    initialData: initialData ?? undefined,
    initialDataUpdatedAt: initialData?.fetchedAt,
    enabled: typeof window !== "undefined",
  });
  const allMessages = messagesQuery.data?.messages ?? [];
  const unreadCount = allMessages.filter(isUnread).length;
  const visible =
    view === "unread" ? allMessages.filter(isUnread) : allMessages;
  const siteById = useMemo(
    () => new Map(sites.map((site) => [site.id, site])),
    [sites],
  );

  useEffect(() => {
    if (messagesQuery.isError) toast.error(copy.loadFailed);
  }, [copy.loadFailed, messagesQuery.errorUpdatedAt, messagesQuery.isError]);

  async function handleRead(messageId: string) {
    setUpdatingId(messageId);
    try {
      const updated = await requestAdminService<NotificationMessageData | null>(
        `notifications/${encodeURIComponent(messageId)}`,
        { method: "PATCH", body: { read: true, locale } },
      );
      queryClient.setQueryData<NotificationsData>(queryKey, (current) =>
        current && updated
          ? {
              ...current,
              messages: current.messages.map((item) =>
                item.id === messageId ? updated : item,
              ),
            }
          : current,
      );
    } catch {
      toast.error(copy.markReadFailed);
    } finally {
      setUpdatingId("");
    }
  }

  async function handleReadAll() {
    setMarkingAll(true);
    try {
      await requestAdminService<{ updated: number }>("notifications/read-all", {
        method: "PATCH",
        body: { read: true },
      });
      await queryClient.invalidateQueries({ queryKey });
      toast.success(copy.markAllReadSuccess);
    } catch {
      toast.error(copy.markAllReadFailed);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeading
        title={copy.title}
        actions={
          <>
            {/* An empty inbox has nothing to filter or mark. */}
            {allMessages.length > 0 ? (
              <>
                <Tabs
                  value={view}
                  onValueChange={(value) => {
                    if (VIEWS.includes(value as InboxView)) {
                      setView(value as InboxView);
                    }
                  }}
                >
                  <TabsList aria-label={copy.title}>
                    <TabsTrigger value="all">{copy.tabs.all}</TabsTrigger>
                    <TabsTrigger value="unread">{copy.tabs.unread}</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleReadAll()}
                  disabled={markingAll || unreadCount === 0}
                >
                  {markingAll ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <CheckCheckIcon data-icon="inline-start" />
                  )}
                  <span>{copy.markAllRead}</span>
                </Button>
              </>
            ) : null}
            <NotificationPreferencesPopover
              messages={messages}
              userId={userId}
              initialData={preferencesInitialData}
            />
          </>
        }
      />

      {messagesQuery.isPending ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Spinner className="mr-2 size-4" />
            {copy.loading}
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <BellIcon className="size-8 text-muted-foreground/70" />
            <p>
              {view === "unread" && allMessages.length > 0
                ? copy.noUnread
                : copy.empty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              locale={locale}
              copy={copy}
              site={item.siteId ? siteById.get(item.siteId) : undefined}
              updating={updatingId === item.id}
              onRead={() => void handleRead(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  item,
  locale,
  copy,
  site,
  updating,
  onRead,
}: {
  item: NotificationMessageData;
  locale: Locale;
  copy: AppMessages["notificationCenter"];
  site: InboxSite | undefined;
  updating: boolean;
  onRead: () => void;
}) {
  const unread = isUnread(item);
  const body = bodyWithoutTitle(item);
  const emailSkipped = emailSkippedUnconfigured(item);
  return (
    <Card>
      <CardContent className="space-y-3 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {unread ? (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full bg-primary"
                />
              ) : null}
              <span className="truncate">{item.title}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {site ? (
                <Link
                  href={buildSitePath(locale, site.slug)}
                  className="font-medium text-foreground/80 hover:text-foreground hover:underline"
                >
                  {site.name}
                </Link>
              ) : null}
              <span>{shortDateTime(locale, item.createdAt * 1000)}</span>
              {item.severity === "warning" || item.severity === "critical" ? (
                <Badge
                  variant={
                    item.severity === "critical" ? "destructive" : "warning"
                  }
                >
                  {copy.severities[item.severity]}
                </Badge>
              ) : null}
              {emailFailed(item) ? (
                <Badge variant="destructive">{copy.emailFailed}</Badge>
              ) : null}
            </div>
          </div>
          {unread ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={updating}
              onClick={onRead}
            >
              {updating ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              <span>{copy.markRead}</span>
            </Button>
          ) : null}
        </div>
        {item.summary || body || emailSkipped ? (
          <div className="space-y-3 border-t pt-3 text-sm leading-6 text-foreground/85">
            {item.summary ? (
              <p className="whitespace-pre-wrap break-words">{item.summary}</p>
            ) : null}
            {body ? (
              <p className="whitespace-pre-wrap break-words">{body}</p>
            ) : null}
            {emailSkipped ? (
              <p className="text-xs text-muted-foreground">
                {copy.emailSkipped}
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
