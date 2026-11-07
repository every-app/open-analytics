import { createDatabaseRuntime } from "@/lib/db";

import { BudgetedDatabase, D1_QUERIES_PER_INVOCATION } from "./d1-query-budget";
import type { ScheduledTaskContext, ScheduledTaskOutcome } from "./runner";

/**
 * Rows per delete statement, so no single D1 statement runs long. A run
 * deletes batch after batch while it has queries; the next tick goes on.
 */
const DELETE_BATCH_SIZE = 100;
/** The query kept for refreshing the statistics after the deletes. */
const OPTIMIZE_QUERIES = 1;

/**
 * Deletes expired notifications, then refreshes D1's query statistics. A run
 * does as much as its `maxQueries` D1 queries allow, by default the
 * invocation's; with notifications left it reports `workRemains`.
 */
export async function runDatabaseMaintenance(
  context: ScheduledTaskContext,
  maxQueries = D1_QUERIES_PER_INVOCATION,
): Promise<ScheduledTaskOutcome> {
  const { env, logger } = context;
  const db = new BudgetedDatabase(createDatabaseRuntime(env.DB), maxQueries);
  let notificationsDeleted = 0;
  let workRemains = false;
  while (db.queriesLeft > OPTIMIZE_QUERIES) {
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
    workRemains = changes === DELETE_BATCH_SIZE;
    if (!workRemains) break;
  }

  // D1 supports PRAGMA optimize and uses it to refresh query-planner
  // statistics after the maintenance deletes.
  await db.run({
    sql: "PRAGMA optimize",
    tag: "scheduled_tasks.maintenance.optimize",
  });
  const summary = { notificationsDeleted, workRemains };
  await logger.info(
    "database_maintenance_finish",
    "Database maintenance finished",
    summary,
  );
  return { status: "success", summary, workRemains };
}
