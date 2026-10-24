import type { AppMessages } from "@/lib/i18n/messages";
import { splitI18nTemplate } from "@/lib/i18n/template";

/**
 * The gateway settings that turn email on; optional in everyapp.config.ts.
 * Both are needed: the gateway's parseEmailSender() returns null without a
 * display name and refuses to send ("Set EMAIL_FROM and EMAIL_FROM_NAME"),
 * so a sentence naming EMAIL_FROM alone sends an admin in a circle.
 */
const SET_COMMAND = "pnpm everyapp secret set EMAIL_FROM EMAIL_FROM_NAME";

/**
 * "Email isn't set up on this gateway. An admin sets the sender with
 * `pnpm everyapp secret set EMAIL_FROM EMAIL_FROM_NAME`…": the one sentence
 * every surface that turns email on shows when the gateway has no sender,
 * with the command as code. The message is a template ({command}) so each
 * locale places it its own way.
 */
export function EmailNotSetUp({ messages }: { messages: AppMessages }) {
  const values: Record<string, string> = { command: SET_COMMAND };
  return (
    <>
      {splitI18nTemplate(messages.systemSettings.emailGatewayNotReady).map(
        (part, index) =>
          "text" in part ? (
            part.text
          ) : (
            <code key={index} className="font-mono">
              {values[part.placeholder] ?? ""}
            </code>
          ),
      )}
    </>
  );
}
