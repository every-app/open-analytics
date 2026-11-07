import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  handleNotificationPreferences,
  handleNotificationRead,
  handleNotificationRulesAdmin,
  handleNotifications,
  handleNotificationsReadAll,
} from "@/lib/edge/admin/notifications/handler";
const WEEKLY = { kind: "weekly", dayOfWeek: 1, time: "08:00", timezone: "UTC" };
const ALERT = { direction: "spike", window: "last_1h", percent: 50 };
const ALERT_BODY = {
  teamId: "team-1",
  siteId: "site-1",
  type: "change",
  condition: ALERT,
};
const requireActor = vi.hoisted(() => vi.fn());
const canReadTeam = vi.hoisted(() => vi.fn());
const createNotificationRule = vi.hoisted(() => vi.fn());
const deleteNotificationRule = vi.hoisted(() => vi.fn());
const listNotificationRules = vi.hoisted(() => vi.fn());
const updateNotificationRule = vi.hoisted(() => vi.fn());
const listNotificationMessagesForTeam = vi.hoisted(() => vi.fn());
const listNotificationMessagesForUser = vi.hoisted(() => vi.fn());
const countUnreadAttentionMessages = vi.hoisted(() => vi.fn());
const markNotificationMessageRead = vi.hoisted(() => vi.fn());
const markAllNotificationMessagesRead = vi.hoisted(() => vi.fn());
const getUserNotificationPreferences = vi.hoisted(() => vi.fn());
const updateUserNotificationPreferences = vi.hoisted(() => vi.fn());
vi.mock("@/lib/edge/admin/auth", () => ({
  requireActor,
}));
vi.mock("@/lib/edge/admin/access", () => ({
  canReadTeam,
}));
vi.mock("@/lib/notifications/edge/rule-store", () => ({
  createNotificationRule,
  deleteNotificationRule,
  listNotificationRules,
  updateNotificationRule,
}));
vi.mock("@/lib/notifications/edge/message-store", () => ({
  countUnreadAttentionMessages,
  listNotificationMessagesForTeam,
  listNotificationMessagesForUser,
  markAllNotificationMessagesRead,
  markNotificationMessageRead,
}));
vi.mock("@/lib/notifications/edge/preferences", () => ({
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
}));
function request(path: string, body: Record<string, unknown>): Request {
  return new Request(`https://edge.test${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function getRequest(path: string): Request {
  return new Request(`https://edge.test${path}`);
}
function methodRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Request {
  return new Request(`https://edge.test${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function patchRequest(body: Record<string, unknown>): Request {
  return new Request("https://edge.test/api/private/admin/notification-rules", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function rule() {
  return {
    id: "rule-1",
    teamId: "team-1",
    siteId: "site-1",
    type: "report",
  };
}
describe("admin notification handlers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireActor.mockResolvedValue({
      user: { id: "user-1" },
      isAdmin: false,
    });
    updateNotificationRule.mockResolvedValue(rule());
    createNotificationRule.mockResolvedValue(rule());
    deleteNotificationRule.mockResolvedValue(true);
    listNotificationRules.mockResolvedValue([rule()]);
    listNotificationMessagesForTeam.mockResolvedValue([{ id: "msg-team" }]);
    listNotificationMessagesForUser.mockResolvedValue([{ id: "msg-user" }]);
    countUnreadAttentionMessages.mockResolvedValue(2);
    markNotificationMessageRead.mockResolvedValue({ id: "msg-1", readAt: 1 });
    markAllNotificationMessagesRead.mockResolvedValue(3);
    getUserNotificationPreferences.mockResolvedValue({ channels: {} });
    updateUserNotificationPreferences.mockResolvedValue({
      channels: { email: true },
    });
  });

  it("lists, creates, and deletes notification rules", async () => {
    const url = new URL(
      "https://edge.test/api/private/admin/notification-rules?teamId=team-1&siteId=site-1",
    );
    const list = await handleNotificationRulesAdmin(
      getRequest(url.pathname + url.search),
      {} as never,
      url,
    );
    const create = await handleNotificationRulesAdmin(
      request("/api/private/admin/notification-rules", {
        teamId: " team-1 ",
        siteId: " site-1 ",
        name: " Weekly ",
        type: "report",
        enabled: false,
        schedule: WEEKLY,
      }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const removed = await handleNotificationRulesAdmin(
      methodRequest(
        "DELETE",
        "/api/private/admin/notification-rules?id=rule-1",
      ),
      {} as never,
      new URL(
        "https://edge.test/api/private/admin/notification-rules?id=rule-1",
      ),
    );

    expect(list.status).toBe(200);
    expect(create.status).toBe(200);
    expect(removed.status).toBe(200);
    expect(listNotificationRules).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        teamId: "team-1",
        siteId: "site-1",
      },
    );
    expect(createNotificationRule).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        teamId: "team-1",
        siteId: "site-1",
        name: "Weekly",
        enabled: false,
        config: { type: "report", schedule: WEEKLY },
      },
    );
    expect(deleteNotificationRule).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "rule-1",
    );
  });

  it("maps forbidden rule list access for ordinary team members", async () => {
    listNotificationRules.mockRejectedValueOnce(new Error("Forbidden"));
    const url = new URL(
      "https://edge.test/api/private/admin/notification-rules?teamId=team-1",
    );

    const response = await handleNotificationRulesAdmin(
      getRequest(url.pathname + url.search),
      {} as never,
      url,
    );

    expect(response.status).toBe(403);
    expect(listNotificationRules).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ user: { id: "user-1" }, isAdmin: false }),
      { teamId: "team-1", siteId: undefined },
    );
  });

  it("allows rule list access for team owners and admins", async () => {
    const url = new URL(
      "https://edge.test/api/private/admin/notification-rules?teamId=team-1",
    );

    const response = await handleNotificationRulesAdmin(
      getRequest(url.pathname + url.search),
      {} as never,
      url,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, data: [{ id: "rule-1" }] });
  });

  it("denies ordinary members rule management mutations", async () => {
    createNotificationRule.mockRejectedValueOnce(new Error("Forbidden"));
    updateNotificationRule.mockRejectedValueOnce(new Error("Forbidden"));
    deleteNotificationRule.mockRejectedValueOnce(new Error("Forbidden"));

    const create = await handleNotificationRulesAdmin(
      request("/api/private/admin/notification-rules", ALERT_BODY),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const update = await handleNotificationRulesAdmin(
      patchRequest({ ruleId: "rule-1", name: "x" }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const remove = await handleNotificationRulesAdmin(
      methodRequest(
        "DELETE",
        "/api/private/admin/notification-rules?id=rule-1",
      ),
      {} as never,
      new URL(
        "https://edge.test/api/private/admin/notification-rules?id=rule-1",
      ),
    );

    expect(create.status).toBe(403);
    expect(update.status).toBe(403);
    expect(remove.status).toBe(403);
  });

  it("validates rule mutations and maps store errors", async () => {
    const missingTeam = await handleNotificationRulesAdmin(
      request("/api/private/admin/notification-rules", {}),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const missingSite = await handleNotificationRulesAdmin(
      request("/api/private/admin/notification-rules", { teamId: "team-1" }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const removedType = await handleNotificationRulesAdmin(
      request("/api/private/admin/notification-rules", {
        ...ALERT_BODY,
        type: "threshold",
      }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const badSchedule = await handleNotificationRulesAdmin(
      patchRequest({
        ruleId: "rule-1",
        type: "report",
        schedule: { ...WEEKLY, kind: "daily" },
      }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const blankSite = await handleNotificationRulesAdmin(
      patchRequest({ ruleId: "rule-1", siteId: " " }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const missingPatchId = await handleNotificationRulesAdmin(
      patchRequest({ name: "Missing id" }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    const missingDeleteId = await handleNotificationRulesAdmin(
      methodRequest("DELETE", "/api/private/admin/notification-rules"),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    updateNotificationRule.mockRejectedValueOnce(new Error("Not Found"));
    const notFound = await handleNotificationRulesAdmin(
      patchRequest({ ruleId: "missing", name: "x" }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );

    expect(missingTeam.status).toBe(400);
    expect(missingSite.status).toBe(400);
    expect(removedType.status).toBe(400);
    await expect(removedType.json()).resolves.toMatchObject({
      error: { message: "type must be one of report, change" },
    });
    expect(badSchedule.status).toBe(400);
    expect(blankSite.status).toBe(400);
    expect(createNotificationRule).not.toHaveBeenCalled();
    expect(missingPatchId.status).toBe(400);
    expect(missingDeleteId.status).toBe(400);
    expect(notFound.status).toBe(404);
  });

  it("returns auth responses, method-not-allowed, and forbidden mapped errors", async () => {
    requireActor.mockResolvedValueOnce(new Response("nope", { status: 401 }));
    const unauthorized = await handleNotificationRulesAdmin(
      getRequest("/api/private/admin/notification-rules"),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    expect(unauthorized.status).toBe(401);

    const unsupportedRules = await handleNotificationRulesAdmin(
      methodRequest("PUT", "/api/private/admin/notification-rules"),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    expect(unsupportedRules.status).toBe(405);

    createNotificationRule.mockRejectedValueOnce(new Error("Forbidden"));
    const forbidden = await handleNotificationRulesAdmin(
      request("/api/private/admin/notification-rules", ALERT_BODY),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    updateNotificationRule.mockRejectedValueOnce("plain failure");
    const badRequest = await handleNotificationRulesAdmin(
      patchRequest({ ruleId: "rule-1", name: "x" }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );
    expect(forbidden.status).toBe(403);
    expect(badRequest.status).toBe(400);
  });

  it("passes only explicit fields for notification rule enabled patches", async () => {
    const response = await handleNotificationRulesAdmin(
      patchRequest({ ruleId: "rule-1", enabled: false }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );

    expect(response.status).toBe(200);
    expect(updateNotificationRule).toHaveBeenCalledWith(
      expect.anything(),
      {
        user: { id: "user-1" },
        isAdmin: false,
      },
      {
        ruleId: "rule-1",
        enabled: false,
      },
    );
  });

  it("passes only explicit fields for notification rule name patches", async () => {
    await handleNotificationRulesAdmin(
      patchRequest({ ruleId: "rule-1", name: "Renamed" }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );

    expect(updateNotificationRule).toHaveBeenCalledWith(
      expect.anything(),
      {
        user: { id: "user-1" },
        isAdmin: false,
      },
      {
        ruleId: "rule-1",
        name: "Renamed",
      },
    );
  });

  it("changes a rule's type, schedule and condition together", async () => {
    await handleNotificationRulesAdmin(
      patchRequest({
        ruleId: "rule-1",
        siteId: " site-2 ",
        name: " Renamed ",
        enabled: "nope",
        type: "change",
        condition: ALERT,
        schedule: WEEKLY,
      }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );

    expect(updateNotificationRule).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      {
        ruleId: "rule-1",
        siteId: "site-2",
        name: "Renamed",
        config: { type: "change", condition: ALERT },
      },
    );
  });

  it("leaves the rule's config alone when no type is sent", async () => {
    await handleNotificationRulesAdmin(
      patchRequest({ ruleId: "rule-1", condition: ["bad"] }),
      {} as never,
      new URL("https://edge.test/api/private/admin/notification-rules"),
    );

    expect(updateNotificationRule).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { ruleId: "rule-1" },
    );
  });

  it("lists the actor's own notifications with the request's filters", async () => {
    canReadTeam.mockReturnValue(true);
    const url = new URL(
      "https://edge.test/api/private/notifications?teamId=team-1&siteId=site-1&ruleId=rule-1&type=report&severity=warning&unread=1&before=120.7&limit=200",
    );

    const response = await handleNotifications(
      getRequest(url.pathname + url.search),
      {} as never,
      url,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { messages: [{ id: "msg-user" }], unreadAttentionCount: 2 },
    });
    expect(canReadTeam).toHaveBeenCalledWith(expect.anything(), "team-1");
    expect(listNotificationMessagesForTeam).not.toHaveBeenCalled();
    expect(listNotificationMessagesForUser).toHaveBeenCalledWith(
      expect.anything(),
      {
        userId: "user-1",
        teamId: "team-1",
        siteId: "site-1",
        ruleId: "rule-1",
        type: "report",
        severity: "warning",
        unread: true,
        limit: 100,
        before: 120,
      },
    );
  });

  it("never reads another member's inbox, whoever asks", async () => {
    canReadTeam.mockReturnValue(true);
    for (const isAdmin of [false, true]) {
      requireActor.mockResolvedValueOnce({
        user: { id: "user-1" },
        teamId: "team-1",
        isAdmin,
      });
      const url = new URL(
        "https://edge.test/api/private/notifications?teamId=team-1&userId=user-2",
      );
      const response = await handleNotifications(
        getRequest(url.pathname + url.search),
        {} as never,
        url,
      );
      expect(response.status).toBe(403);
    }
    expect(listNotificationMessagesForUser).not.toHaveBeenCalled();
    expect(listNotificationMessagesForTeam).not.toHaveBeenCalled();
  });

  it("keeps the inbox inside the actor's organization", async () => {
    canReadTeam.mockReturnValue(false);
    requireActor.mockResolvedValueOnce({
      user: { id: "user-1" },
      teamId: "team-1",
      isAdmin: true,
    });
    const url = new URL(
      "https://edge.test/api/private/notifications?teamId=team-2",
    );

    const response = await handleNotifications(
      getRequest(url.pathname + url.search),
      {} as never,
      url,
    );

    expect(response.status).toBe(403);
    expect(listNotificationMessagesForUser).not.toHaveBeenCalled();
    expect(listNotificationMessagesForTeam).not.toHaveBeenCalled();
  });

  it("asking for your own id is the same as not asking", async () => {
    const url = new URL(
      "https://edge.test/api/private/notifications?userId=user-1&unread=1&before=0&limit=5",
    );

    const response = await handleNotifications(
      getRequest(url.pathname + url.search),
      {} as never,
      url,
    );

    expect(response.status).toBe(200);
    expect(canReadTeam).not.toHaveBeenCalled();
    expect(listNotificationMessagesForUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: "user-1",
        teamId: undefined,
        unread: true,
        before: undefined,
        limit: 5,
      }),
    );
  });

  it("returns method and mapped errors for notification lists", async () => {
    const unsupported = await handleNotifications(
      methodRequest("POST", "/api/private/notifications", {}),
      {} as never,
      new URL("https://edge.test/api/private/notifications"),
    );
    listNotificationMessagesForUser.mockRejectedValueOnce(
      new Error("Invalid notification request"),
    );
    const failed = await handleNotifications(
      getRequest("/api/private/notifications"),
      {} as never,
      new URL("https://edge.test/api/private/notifications"),
    );

    expect(unsupported.status).toBe(405);
    expect(failed.status).toBe(400);
  });

  it("handles notification preferences and read actions", async () => {
    const preferences = await handleNotificationPreferences(
      getRequest("/api/private/notification-preferences"),
      {} as never,
    );
    const update = await handleNotificationPreferences(
      methodRequest("PATCH", "/api/private/notification-preferences", {
        channels: { email: true },
      }),
      {} as never,
    );
    const read = await handleNotificationRead(
      methodRequest("PATCH", "/api/private/notifications/msg-1/read"),
      {} as never,
      "msg-1",
    );
    const readAll = await handleNotificationsReadAll(
      methodRequest("PATCH", "/api/private/notifications/read-all", {
        teamId: " team-1 ",
      }),
      {} as never,
    );

    expect(preferences.status).toBe(200);
    expect(update.status).toBe(200);
    expect(read.status).toBe(200);
    expect(readAll.status).toBe(200);
    expect(markNotificationMessageRead).toHaveBeenCalledWith(
      expect.anything(),
      {
        messageId: "msg-1",
        userId: "user-1",
      },
    );
    expect(markAllNotificationMessagesRead).toHaveBeenCalledWith(
      expect.anything(),
      {
        userId: "user-1",
        teamId: "team-1",
      },
    );
  });

  it("marks all notifications read without an optional team filter", async () => {
    const readAll = await handleNotificationsReadAll(
      methodRequest("PATCH", "/api/private/notifications/read-all", {}),
      {} as never,
    );

    expect(readAll.status).toBe(200);
    expect(markAllNotificationMessagesRead).toHaveBeenCalledWith(
      expect.anything(),
      {
        userId: "user-1",
        teamId: undefined,
      },
    );
  });

  it("returns auth responses from notification sub-handlers", async () => {
    requireActor.mockResolvedValue(new Response("nope", { status: 401 }));

    const responses = await Promise.all([
      handleNotifications(
        getRequest("/api/private/notifications"),
        {} as never,
        new URL("https://edge.test/api/private/notifications"),
      ),
      handleNotificationPreferences(
        getRequest("/api/private/notification-preferences"),
        {} as never,
      ),
      handleNotificationRead(
        methodRequest("PATCH", "/api/private/notifications/msg-1/read"),
        {} as never,
        "msg-1",
      ),
      handleNotificationsReadAll(
        methodRequest("PATCH", "/api/private/notifications/read-all", {}),
        {} as never,
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401,
    ]);
  });

  it("returns method and validation errors for preferences and read handlers", async () => {
    const unsupportedPreferences = await handleNotificationPreferences(
      methodRequest("POST", "/api/private/notification-preferences", {}),
      {} as never,
    );
    const unsupportedRead = await handleNotificationRead(
      getRequest("/api/private/notifications/msg-1/read"),
      {} as never,
      "msg-1",
    );
    const missingReadId = await handleNotificationRead(
      methodRequest("PATCH", "/api/private/notifications/read"),
      {} as never,
      "",
    );
    const unsupportedReadAll = await handleNotificationsReadAll(
      getRequest("/api/private/notifications/read-all"),
      {} as never,
    );

    expect(unsupportedPreferences.status).toBe(405);
    expect(unsupportedRead.status).toBe(405);
    expect(missingReadId.status).toBe(400);
    expect(unsupportedReadAll.status).toBe(405);
  });
});
