import { GatewayRefusalError } from "@every-app/sdk/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deliverNotificationMessage } from "@/lib/notifications/edge/delivery";
import type { NotificationMessage } from "@/lib/notifications/message";

const updateNotificationDeliveryResult = vi.hoisted(() => vi.fn());
const renderNotificationEmail = vi.hoisted(() => vi.fn());
const sendEmail = vi.hoisted(() => vi.fn());

vi.mock("@every-app/sdk/server", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendEmail,
}));

vi.mock("@/lib/notifications/edge/message-store", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateNotificationDeliveryResult,
}));

vi.mock("@/lib/notifications/edge/email-renderer", () => ({
  renderNotificationEmail,
}));

function message(
  input: Partial<NotificationMessage> = {},
): NotificationMessage {
  return {
    id: "msg-1",
    teamId: "org-1",
    title: "Test",
    summary: "Summary",
    bodyText: "Body",
    bodyHtml: "",
    data: {},
    ...input,
  } as NotificationMessage;
}

const user = {
  id: "user-1",
  email: "user@example.test",
  preferencesJson: "{}",
  preferredLocale: "en",
};

function deliveredEmail() {
  return updateNotificationDeliveryResult.mock.calls[0]?.[1];
}

describe("notification delivery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    updateNotificationDeliveryResult.mockResolvedValue(message());
    renderNotificationEmail.mockResolvedValue({
      subject: "Rendered subject",
      text: "Rendered text",
      html: "<p>Rendered</p>",
    });
    sendEmail.mockResolvedValue({ messageId: "gw-1", status: "delivered" });
  });

  it("skips email when the person turned it off", async () => {
    await deliverNotificationMessage(
      {} as never,
      message(),
      { ...user, preferencesJson: '{"email":false}' },
      {},
    );

    expect(sendEmail).not.toHaveBeenCalled();
    expect(deliveredEmail()).toMatchObject({
      status: "sent",
      deliveryResults: { email: { reason: "user_preference_disabled" } },
    });
  });

  it("sends through the gateway as the organization's background mail", async () => {
    await deliverNotificationMessage({} as never, message(), user, {});

    expect(sendEmail).toHaveBeenCalledWith({
      env: {},
      for: { background: true, organizationId: "org-1" },
      message: {
        to: "user@example.test",
        subject: "Rendered subject",
        text: "Rendered text",
        html: "<p>Rendered</p>",
      },
    });
    expect(deliveredEmail()).toMatchObject({
      status: "sent",
      deliveryResults: { email: { status: "sent", messageId: "gw-1" } },
    });
  });

  it("renders in the message's locale before the person's", async () => {
    await deliverNotificationMessage(
      {} as never,
      message({ data: { locale: "zh" } }),
      user,
      {},
    );

    expect(renderNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "zh" }),
    );
  });

  it("falls back to the saved text when rendering fails", async () => {
    renderNotificationEmail.mockRejectedValue(new Error("render failed"));

    await deliverNotificationMessage({} as never, message(), user, {});

    expect(sendEmail.mock.calls[0]?.[0].message).toEqual({
      to: "user@example.test",
      subject: "Test",
      text: "Body",
    });
  });

  it("skips email while the gateway has none set up", async () => {
    sendEmail.mockRejectedValue(
      new GatewayRefusalError({
        status: 503,
        code: "integration_not_configured",
        message: "No sender",
      }),
    );

    await deliverNotificationMessage({} as never, message(), user, {});

    expect(deliveredEmail()).toMatchObject({
      status: "sent",
      deliveryResults: { email: { reason: "system_email_unconfigured" } },
    });
  });

  it("marks delivery failed when the gateway refuses the send", async () => {
    sendEmail.mockRejectedValue(
      new GatewayRefusalError({
        status: 429,
        code: "email_budget_exhausted",
        message: "Daily budget used",
      }),
    );

    await deliverNotificationMessage({} as never, message(), user, {});

    expect(deliveredEmail()).toMatchObject({
      status: "failed",
      errorMessage: "Daily budget used",
      deliveryResults: { email: { reason: "email_budget_exhausted" } },
    });
  });
});
