import {
  currentInvocationLogger,
  type InvocationLogger,
} from "@/lib/edge/observability/logger";
import type { Env } from "@/lib/edge/types";
import type { RetentionConfig } from "@/lib/retention";

import { readRetentionConfig } from "./retention-config";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type LogData = Record<string, JsonValue>;
/**
 * A task's log. Entries reach the Worker invocation record as stable event
 * codes; their messages and data stay in the code as documentation and are
 * never written anywhere, since they can name members and sites.
 */
export interface ScheduledTaskLogger {
  debug(event: string, message: string, data?: LogData): Promise<void>;
  info(event: string, message: string, data?: LogData): Promise<void>;
  warn(event: string, message: string, data?: LogData): Promise<void>;
  error(event: string, message: string, data?: LogData): Promise<void>;
}
export interface ScheduledTaskContext {
  env: Env;
  startedAt: number;
  logger: ScheduledTaskLogger;
  retention?: RetentionConfig;
}
/** What a run did, for its caller; the runner keeps no history. */
export interface ScheduledTaskOutcome {
  status?: "success" | "partial" | "skipped";
  summary?: Record<string, unknown>;
}
function createLogger(observability?: InvocationLogger): ScheduledTaskLogger {
  const write = async (
    level: "debug" | "info" | "warn" | "error",
    event: string,
  ) => {
    const eventCode = `scheduled_task.${event.slice(0, 120)}`;
    if (level === "error") observability?.error(eventCode);
    else if (level === "warn") observability?.warn(eventCode);
    else observability?.info(eventCode);
  };
  return {
    debug: (event) => write("debug", event),
    info: (event) => write("info", event),
    warn: (event) => write("warn", event),
    error: (event) => write("error", event),
  };
}
export async function runScheduledTask(
  env: Env,
  taskKey: string,
  handler: (
    context: ScheduledTaskContext,
  ) => Promise<ScheduledTaskOutcome | undefined>,
  observability?: InvocationLogger,
): Promise<void> {
  // Cron supplies its logger explicitly; anything else runs beneath the Hono
  // request scope. Either way task work lands in the outer invocation record.
  const logger = createLogger(observability ?? currentInvocationLogger());
  const retention = await readRetentionConfig(env);
  await logger.info("start", `Task ${taskKey} started`);
  try {
    await handler({
      env,
      startedAt: Date.now(),
      logger,
      retention,
    });
    await logger.info("finish", `Task ${taskKey} finished`);
  } catch (error) {
    await logger.error("error", `Task ${taskKey} failed`);
    throw error;
  }
}
