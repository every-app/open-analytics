import {
  and,
  compileD1Mutation,
  createD1DatabaseClient,
  eq,
  gt,
  param,
  unixepoch,
  update,
} from "@/lib/db";
import { schema } from "@/lib/db/schema";
import type { Env } from "@/lib/edge/types";

/**
 * Makes a scheduled task due at `now`, so the next cron tick, within a
 * minute, runs it instead of its next scheduled run.
 */
export async function runOnNextTick(
  env: Env,
  taskKey: string,
  now: number,
): Promise<void> {
  await createD1DatabaseClient(env.DB).run(
    compileD1Mutation(
      update(schema.scheduled_task_schedule_state, (columns) => ({
        set: { next_run_at: now, updated_at: unixepoch() },
        where: and(
          eq(columns.task_key, param(taskKey)),
          gt(columns.next_run_at, param(now)),
        ),
      })),
      { tag: "scheduled_tasks.run_on_next_tick" },
    ),
  );
}
