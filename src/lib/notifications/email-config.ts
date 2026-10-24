/**
 * Notification email goes out through the Every App gateway's email
 * capability (everyapp.config.ts): the gateway's sender, within its daily
 * budgets. There is nothing to configure in the app.
 */
export interface PublicNotificationEmailConfig {
  /**
   * The gateway has a sender set (EMAIL_FROM). Null when its status couldn't
   * be read: unknown, so no surface tells an admin to set a name that may
   * already be set.
   */
  enabled: boolean | null;
  /** The address mail goes out from, when the gateway reports one. */
  sender: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(email);
}
