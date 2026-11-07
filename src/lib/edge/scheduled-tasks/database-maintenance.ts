import { createDatabaseRuntime } from "@/lib/db";

import type { ScheduledTaskContext, ScheduledTaskOutcome } from "./runner";

const DELETE_BATCH_SIZE = 100;
const MAX_DELETE_BATCHES = 1000;

/** Deletes expired notifications, then refreshes D1's query statistics. */
export async function runDatabaseMaintenance(
  context: ScheduledTaskContext,
): Promise<ScheduledTaskOutcome> {
  const { env, logger } = context;
  const db = createDatabaseRuntime(env.DB);
  let notificationsDeleted = 0;
  for (let batch = 0; batch < MAX_DELETE_BATCHES; batch += 1) {
    const result = await db.run({
      sql: `
        DELETE FROM notification_messages
        WHERE id IN (
          SELECT id
          FROM notification_messages
          WHERE expires_at < unixepoch()
          ORDER BY expires_at ASC
          LIMIT ?
        )
      `,
      bindings: [DELETE_BATCH_SIZE],
      tag: "scheduled_tasks.maintenance.delete_expired_batch",
    });
    const changes = Number(result.meta?.changes ?? 0);
    notificationsDeleted += changes;
    if (changes < DELETE_BATCH_SIZE) break;
  }

  // D1 supports PRAGMA optimize and uses it to refresh query-planner
  // statistics after the maintenance deletes.
  await db.run({
    sql: "PRAGMA optimize",
    tag: "scheduled_tasks.maintenance.optimize",
  });
  const summary = { notificationsDeleted };
  await logger.info(
    "database_maintenance_finish",
    "Database maintenance finished",
    summary,
  );
  return { status: "success", summary };
}
