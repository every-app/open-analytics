import type { AppMessages } from "@/lib/i18n/messages";
import { splitI18nTemplate } from "@/lib/i18n/template";

/** The gateway setting that turns email on; optional in everyapp.config.ts. */
const EMAIL_SETTING = "EMAIL_FROM";
const SET_COMMAND = `pnpm everyapp secret set ${EMAIL_SETTING}`;

/**
 * "Email isn't set up on this gateway. An admin sets EMAIL_FROM with
 * `pnpm everyapp secret set EMAIL_FROM`…": the one sentence every surface
 * that turns email on shows when the gateway has no sender, with the name
 * and the command as code. The message is a template ({name}, {command}) so
 * each locale orders them its own way.
 */
export function EmailNotSetUp({ messages }: { messages: AppMessages }) {
  const values: Record<string, string> = {
    name: EMAIL_SETTING,
    command: SET_COMMAND,
  };
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
