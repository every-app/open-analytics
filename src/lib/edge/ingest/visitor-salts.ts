import { MAX_CLIENT_EVENT_LAG_MS } from "./normalize";
import type { IngestSqlAccess } from "./sql-access";

const SALT_BYTES = 32;
// A pageview is filed under the UTC day of its start, which can trail its
// arrival by the client lag. Yesterday's salt stays until that lag (plus
// processing slack) has passed after midnight, then it is deleted.
const SALT_GRACE_MS = MAX_CLIENT_EVENT_LAG_MS + 5 * 60 * 1000;

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function randomSalt(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(SALT_BYTES)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Deletes every salt whose UTC day is over, so its visitor ids can't be rebuilt. */
export function deleteExpiredVisitorSalts(
  sql: Pick<IngestSqlAccess, "sqlRun">,
  nowMs: number,
): void {
  sql.sqlRun(
    "DELETE FROM visitor_salts WHERE day < ?",
    utcDay(nowMs - SALT_GRACE_MS),
  );
}

/** The site's random salt for a UTC day, created on the day's first use. */
export function visitorSaltFor(
  sql: Pick<IngestSqlAccess, "sqlOne" | "sqlRun">,
  day: string,
  nowMs: number,
): string {
  const existing = sql.sqlOne<{ salt: string }>(
    "SELECT salt FROM visitor_salts WHERE day = ?",
    day,
  );
  if (existing) return existing.salt;

  deleteExpiredVisitorSalts(sql, nowMs);
  const salt = randomSalt();
  sql.sqlRun("INSERT INTO visitor_salts (day, salt) VALUES (?, ?)", day, salt);
  return salt;
}
