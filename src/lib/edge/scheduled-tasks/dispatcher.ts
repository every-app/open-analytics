import {
  and,
  compileD1Mutation,
  compileD1Query,
  createD1DatabaseClient,
  eq,
  filter,
  isNull,
  lt,
  lte,
  or,
  param,
  project,
  scan,
  unixepoch,
  update,
} from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { INGEST_SWEEP_D1_QUERIES } from "@/lib/edge/ingest/alarm-sweep";
import type { InvocationLogger } from "@/lib/edge/observability/logger";
import type { Env } from "@/lib/edge/types";
import { runNotificationTick } from "@/lib/notifications/edge/notification-task";

import { runAnalyticsRetention } from "./analytics-retention";
import {
  D1_QUERIES_PER_INVOCATION,
  D1QueryBudget,
  withD1QueryBudget,
} from "./d1-query-budget";
import { runDatabaseMaintenance } from "./database-maintenance";
import { SCHEDULED_TASKS } from "./registry";
import { runScheduledTask, type ScheduledTaskOutcome } from "./runner";
import { runVisitRollups } from "./visit-rollups";

/**
 * Tasks that must run go first and use what they need; the backlog tasks
 * then share what the invocation has left.
 */
const TASK_ORDER = [
  "notification_tick",
  "database_maintenance",
  "visit_rollups",
  "analytics_retention",
] as const;
type TaskKey = (typeof TASK_ORDER)[number];

/**
 * Tasks that work through backlogs of any size. Each due on a tick gets an
 * equal part of what the invocation has left when it starts, and what one
 * doesn't use goes to the next, so neither waits on the other. A task with
 * work left runs again on the next tick.
 */
const BACKLOG_TASKS: ReadonlySet<TaskKey> = new Set([
  "visit_rollups",
  "analytics_retention",
]);

/**
 * The dispatcher's queries: each cron tick is one Worker invocation, and the
 * ingest alarm sweep runs beside the dispatcher on every 30th minute.
 */
const DISPATCHER_D1_QUERIES =
  D1_QUERIES_PER_INVOCATION - INGEST_SWEEP_D1_QUERIES;
/** The dispatcher's own queries for a task: its claim and its release. */
const CLAIM_AND_RELEASE_QUERIES = 2;
/**
 * A task starts only with at least this many queries, enough for its reads
 * and some work; otherwise it stays due for the next tick.
 */
const MIN_TASK_D1_QUERIES = 10;

// A claim older than this belongs to a run that died; another tick may retake it.
const CLAIM_TTL_SECONDS = 6 * 60 * 60;

interface ScheduleStateRow {
  taskKey: TaskKey;
  nextRunAt: number;
}

function nowSeconds(scheduledTime: number): number {
  return Math.max(0, Math.trunc(scheduledTime / 1000));
}

function nextDailyRunAt(now: number): number {
  const next = new Date(now * 1000);
  next.setUTCHours(0, 0, 0, 0);
  next.setUTCDate(next.getUTCDate() + 1);
  return Math.trunc(next.getTime() / 1000);
}

/** The next cron tick: the cron runs every minute. */
function nextTickAt(now: number): number {
  return (Math.floor(now / 60) + 1) * 60;
}

function nextRunAt(taskKey: string, now: number, workRemains: boolean): number {
  if (workRemains) return nextTickAt(now);
  const definition = SCHEDULED_TASKS.find((task) => task.key === taskKey);
  if (!definition) return now + 30 * 60;
  const schedule = definition.internalSchedule;
  if (schedule.kind === "daily") return nextDailyRunAt(now);
  const intervalSeconds = schedule.everyMinutes * 60;
  return (Math.floor(now / intervalSeconds) + 1) * intervalSeconds;
}

async function loadDueStates(
  env: Env,
  now: number,
): Promise<ScheduleStateRow[]> {
  const scheduleState = schema.scheduled_task_schedule_state;
  const states = scan(scheduleState);
  const dueStates = filter(states, lte(states.columns.next_run_at, param(now)));
  const query = project(dueStates, {
    taskKey: dueStates.columns.task_key,
    nextRunAt: dueStates.columns.next_run_at,
  });
  const result = await createD1DatabaseClient(env.DB).all(
    compileD1Query(query, {
      tag: "scheduled-tasks.scheduled_task_schedule_state.all",
    }),
  );
  const due = new Map<string, (typeof result.results)[number]>();
  for (const row of result.results) {
    if (typeof row.taskKey !== "string") continue;
    due.set(row.taskKey, row);
  }
  return TASK_ORDER.flatMap((key) => {
    const row = due.get(key);
    // Only known scheduled tasks survive this allowlisted key lookup, so the
    // nullable PK reported by generated schema metadata is refined here.
    return row ? [{ ...row, taskKey: key }] : [];
  });
}

async function claimTask(
  env: Env,
  taskKey: string,
  now: number,
  claimToken: string,
): Promise<boolean> {
  try {
    const scheduleState = schema.scheduled_task_schedule_state;
    const result = await createD1DatabaseClient(env.DB).run(
      compileD1Mutation(
        update(scheduleState, (columns) => ({
          set: {
            claim_token: claimToken,
            claim_expires_at: now + CLAIM_TTL_SECONDS,
            updated_at: unixepoch(),
          },
          where: and(
            eq(columns.task_key, param(taskKey)),
            lte(columns.next_run_at, param(now)),
            or(
              isNull(columns.claim_token),
              isNull(columns.claim_expires_at),
              lt(columns.claim_expires_at, param(now)),
            ),
          ),
        })),
        { tag: "scheduled_tasks.dispatcher.claim" },
      ),
    );
    return Number(result.meta?.changes ?? 0) === 1;
  } catch {
    // Claiming is fail-closed: a database error must not turn into duplicate
    // work by allowing the task handler to run without ownership.
    return false;
  }
}

/**
 * Records a run and schedules the next: on the next tick when the run left
 * work, otherwise on the task's own schedule. A failed run waits for its
 * schedule.
 */
async function releaseTask(
  env: Env,
  taskKey: string,
  claimToken: string,
  scheduledTime: number,
  outcome: { error: unknown; workRemains: boolean },
): Promise<void> {
  const { error, workRemains } = outcome;
  const now = nowSeconds(scheduledTime);
  const next = nextRunAt(taskKey, now, workRemains);
  const lastError = error ? String(error).slice(0, 1000) : null;
  const scheduleState = schema.scheduled_task_schedule_state;
  await createD1DatabaseClient(env.DB).run(
    compileD1Mutation(
      update(scheduleState, (columns) => ({
        set: {
          last_run_at: now,
          next_run_at: next,
          claim_token: null,
          claim_expires_at: null,
          last_error: lastError,
          updated_at: unixepoch(),
        },
        where: and(
          eq(columns.task_key, param(taskKey)),
          eq(columns.claim_token, param(claimToken)),
        ),
      })),
      { tag: "scheduled_tasks.dispatcher.complete" },
    ),
  );
}

function runTask(
  env: Env,
  taskKey: TaskKey,
  scheduledTime: number,
  budget: D1QueryBudget,
  observability: InvocationLogger,
): Promise<ScheduledTaskOutcome | undefined> {
  switch (taskKey) {
    case "notification_tick":
      return runScheduledTask(
        env,
        taskKey,
        (context) => runNotificationTick(context, budget.left),
        observability,
      );
    case "database_maintenance":
      return runScheduledTask(
        env,
        taskKey,
        (context) => runDatabaseMaintenance(context, budget.left),
        observability,
      );
    case "visit_rollups":
      return runScheduledTask(
        env,
        taskKey,
        ({ logger }) =>
          runVisitRollups(env, scheduledTime, {
            logger,
            maxQueries: budget.left,
          }),
        observability,
      );
    case "analytics_retention":
      return runScheduledTask(
        env,
        taskKey,
        (context) => runAnalyticsRetention(context, budget.left),
        observability,
      );
  }
}

/**
 * Claims, runs and releases a task. The claim and release count against the
 * invocation's `queries`; the run, against `budget`, a part of them.
 */
async function executeTask(
  env: Env,
  taskKey: TaskKey,
  scheduledTime: number,
  queries: D1QueryBudget,
  budget: D1QueryBudget,
  observability: InvocationLogger,
): Promise<void> {
  const dispatcherEnv = withD1QueryBudget(env, queries);
  const claimToken = crypto.randomUUID();
  const now = nowSeconds(scheduledTime);
  if (!(await claimTask(dispatcherEnv, taskKey, now, claimToken))) return;

  try {
    const outcome = await runTask(
      withD1QueryBudget(env, budget),
      taskKey,
      scheduledTime,
      budget,
      observability,
    );
    await releaseTask(dispatcherEnv, taskKey, claimToken, scheduledTime, {
      error: null,
      workRemains: outcome?.workRemains === true,
    });
  } catch (error) {
    try {
      await releaseTask(dispatcherEnv, taskKey, claimToken, scheduledTime, {
        error,
        workRemains: false,
      });
    } catch {
      observability.warn("scheduled_task.claim_release_failed");
    }
    observability.error("scheduled_task.handler_failed");
  }
}

/**
 * Runs the due tasks in `TASK_ORDER` within the invocation's D1 queries.
 * Each task's run, the runner's settings read included, gets a budget of
 * what the invocation has left after the task's claim and release: all of
 * it for a task that must run, and an equal part for each backlog task still
 * to run on this tick. A task whose part is too small stays due and runs on
 * the next tick.
 */
export async function dispatchInternalScheduledTasks(
  env: Env,
  scheduledTime: number,
  observability: InvocationLogger,
): Promise<void> {
  const queries = new D1QueryBudget(DISPATCHER_D1_QUERIES);
  const dueStates = await loadDueStates(
    withD1QueryBudget(env, queries),
    nowSeconds(scheduledTime),
  );
  for (const [index, state] of dueStates.entries()) {
    const free = queries.left - CLAIM_AND_RELEASE_QUERIES;
    const share = BACKLOG_TASKS.has(state.taskKey)
      ? dueStates
          .slice(index)
          .filter(({ taskKey }) => BACKLOG_TASKS.has(taskKey)).length
      : 1;
    const allowance = Math.floor(free / share);
    if (allowance < MIN_TASK_D1_QUERIES) {
      observability.warn("scheduled_task.deferred", { taskKey: state.taskKey });
      continue;
    }
    await executeTask(
      env,
      state.taskKey,
      scheduledTime,
      queries,
      queries.child(allowance),
      observability,
    );
  }
}
