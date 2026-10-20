import { listMembers } from "@every-app/sdk/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import type { Env } from "@/lib/edge/types";
import {
  type NotificationRule,
  resolveNotificationRecipients,
} from "@/lib/notifications/edge/rule-store";

vi.mock("@every-app/sdk/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listMembers: vi.fn(),
}));

// The gateway's members who can open the app: Ana and Bo have opened it,
// Cy never has. Dee opened it once but has since left the organization.
const GATEWAY_MEMBERS = [
  { id: "ana", email: "ana@new.test", name: "Ana", role: "owner" },
  { id: "bo", email: "bo@example.test", name: "Bo", role: "admin" },
  { id: "cy", email: "cy@example.test", name: "", role: "member" },
] as const;

const database = createMigratedDatabase();
const env = { DB: createSqliteD1Database(database) } as unknown as Env;

function rule(input: Partial<NotificationRule>): NotificationRule {
  return {
    teamId: "org-1",
    createdByUserId: null,
    ...input,
  } as NotificationRule;
}

beforeEach(() => {
  vi.mocked(listMembers).mockResolvedValue({
    members: GATEWAY_MEMBERS.map((member) => ({ ...member })),
  });
  const insertUser = database.prepare(
    `INSERT INTO users (id, email, notification_preferences_json,
       preferred_locale, timezone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, 1)`,
  );
  insertUser.run("ana", "ana@old.test", '{"email":true}', "ja", "Asia/Tokyo");
  insertUser.run("bo", "bo@example.test", "{}", "", "");
  insertUser.run("dee", "dee@example.test", "{}", "", "");
});

afterEach(() => {
  database.exec("DELETE FROM users");
});

describe("resolveNotificationRecipients", () => {
  it("sends only to members the gateway lists, picked by the rule's mode", async () => {
    const ids = async (input: Partial<NotificationRule>) =>
      (await resolveNotificationRecipients(env, rule(input))).map(
        (recipient) => recipient.id,
      );

    expect(
      await ids({ recipient: { mode: "creator" }, createdByUserId: "dee" }),
    ).toEqual([]);
    expect(
      await ids({ recipient: { mode: "users", userIds: ["ana", "dee"] } }),
    ).toEqual(["ana"]);
    expect(await ids({ recipient: { mode: "team_admins" } })).toEqual([
      "ana",
      "bo",
    ]);
    expect(await ids({ recipient: { mode: "all_team_members" } })).toEqual([
      "ana",
      "bo",
      "cy",
    ]);
    expect(listMembers).toHaveBeenCalledWith({
      env,
      for: { background: true, organizationId: "org-1" },
    });
  });

  it("takes the address from the gateway and the rest from the member's own settings", async () => {
    const recipients = await resolveNotificationRecipients(
      env,
      rule({ recipient: { mode: "all_team_members" } }),
    );

    expect(recipients[0]).toEqual({
      id: "ana",
      email: "ana@new.test",
      preferencesJson: '{"email":true}',
      preferredLocale: "ja",
      timeZone: "Asia/Tokyo",
    });
    // Never opened the app: the defaults.
    expect(recipients[2]).toEqual({
      id: "cy",
      email: "cy@example.test",
      preferencesJson: "{}",
      preferredLocale: null,
      timeZone: null,
    });
  });
});
