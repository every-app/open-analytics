import { describe, expect, it, vi } from "vitest";

import {
  getUserNotificationPreferences,
  isNotificationChannelEnabled,
  mergeNotificationPreferencesUpdate,
  normalizeNotificationPreferences,
  shouldCreateUnreadAttention,
  updateUserNotificationPreferences,
} from "@/lib/notifications/edge/preferences";

describe("notification preferences", () => {
  it("normalizes invalid input to safe defaults and keeps in-app enabled", () => {
    const preferences = normalizeNotificationPreferences("{bad json");

    expect(preferences.inApp).toBe(true);
    expect(preferences.email).toBe(true);
    expect(preferences.webPush).toBe(false);
    expect(isNotificationChannelEnabled(preferences, "inApp")).toBe(true);
  });

  it("honors email opt-out without allowing in-app opt-out", () => {
    const preferences = normalizeNotificationPreferences({
      inApp: false,
      email: false,
      attention: {
        reportsCreateUnread: true,
      },
    });

    expect(preferences.inApp).toBe(true);
    expect(preferences.email).toBe(false);
    expect(isNotificationChannelEnabled(preferences, "email")).toBe(false);
    expect(preferences.attention.reportsCreateUnread).toBe(true);
    expect(preferences.attention.alertsCreateUnread).toBe(true);
  });

  it("merges updates without allowing unsupported channel changes", () => {
    const merged = mergeNotificationPreferencesUpdate(
      JSON.stringify({
        email: false,
        webPush: true,
        attention: {
          reportsCreateUnread: true,
          alertsCreateUnread: false,
        },
      }),
      {
        email: true,
        webPush: false,
        attention: {
          reportsCreateUnread: false,
        },
      },
    );

    expect(merged).toEqual({
      inApp: true,
      email: true,
      webPush: true,
      attention: {
        reportsCreateUnread: false,
        alertsCreateUnread: false,
      },
    });
    expect(mergeNotificationPreferencesUpdate(merged, null)).toEqual(merged);
  });

  it("checks channel and unread attention rules", () => {
    const preferences = normalizeNotificationPreferences({
      email: false,
      webPush: true,
      attention: {
        reportsCreateUnread: true,
        alertsCreateUnread: true,
      },
    });

    expect(isNotificationChannelEnabled(preferences, "webPush")).toBe(true);
    expect(isNotificationChannelEnabled(preferences, "email")).toBe(false);
    expect(isNotificationChannelEnabled(preferences, "unknown" as never)).toBe(
      false,
    );
    expect(shouldCreateUnreadAttention({ preferences, type: "report" })).toBe(
      true,
    );
    expect(
      shouldCreateUnreadAttention({
        preferences: {
          ...preferences,
          attention: { ...preferences.attention, alertsCreateUnread: false },
        },
        type: "change",
      }),
    ).toBe(false);
  });

  it("loads and updates user preferences in the database", async () => {
    const run = vi.fn(() => Promise.resolve());
    const bindCalls: unknown[][] = [];
    const env = {
      DB: {
        prepare: vi.fn((sql: string) => ({
          bind: vi.fn((...args: unknown[]) => {
            bindCalls.push(args);
            return {
              first: vi.fn(() =>
                Promise.resolve(
                  sql.startsWith("SELECT")
                    ? {
                        preferencesJson: JSON.stringify({
                          email: false,
                          attention: { reportsCreateUnread: true },
                        }),
                      }
                    : null,
                ),
              ),
              run,
            };
          }),
        })),
      },
    };

    await expect(
      getUserNotificationPreferences(env as never, "user-1"),
    ).resolves.toMatchObject({
      email: false,
      attention: { reportsCreateUnread: true },
    });
    await expect(
      updateUserNotificationPreferences(env as never, {
        userId: "user-1",
        preferences: { email: true },
      }),
    ).resolves.toMatchObject({ email: true });

    expect(run).toHaveBeenCalled();
    expect(env.DB.prepare).toHaveBeenCalledTimes(3);
    expect(bindCalls.at(-1)).toEqual([
      JSON.stringify({
        inApp: true,
        email: true,
        webPush: false,
        attention: {
          reportsCreateUnread: true,
          alertsCreateUnread: true,
        },
      }),
      "user-1",
    ]);
  });
});
