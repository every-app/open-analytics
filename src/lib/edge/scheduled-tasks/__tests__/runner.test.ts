import { describe, expect, it, vi } from "vitest";

import {
  createInvocationLogger,
  runWithInvocationLogger,
} from "@/lib/edge/observability/logger";
import { runScheduledTask } from "@/lib/edge/scheduled-tasks/runner";
import type { Env } from "@/lib/edge/types";
import { DEFAULT_RETENTION_CONFIG } from "@/lib/retention";

/** A database whose only read is the retention config, which is unset. */
function createEnv(): Env {
  const statement = {
    bind: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn(),
  };
  return {
    DB: { prepare: vi.fn(() => statement), batch: vi.fn() },
  } as unknown as Env;
}

function taskEventsOf(
  observability: ReturnType<typeof createInvocationLogger>,
) {
  return observability
    .build()
    .logs.map((entry) => entry.message)
    .filter((message) => message.startsWith("scheduled_task."));
}

describe("runScheduledTask", () => {
  it("runs the handler with the instance's retention and writes nothing", async () => {
    const env = createEnv();
    const handler = vi.fn().mockResolvedValue({ status: "success" });

    await runScheduledTask(env, "test_task", handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      env,
      retention: DEFAULT_RETENTION_CONFIG,
      startedAt: expect.any(Number),
    });
    expect(env.DB.batch).not.toHaveBeenCalled();
  });

  it("mirrors task events to the invocation record without their data", async () => {
    const observability = createInvocationLogger({
      source: "worker",
      trigger: "alarm",
    });
    await runScheduledTask(
      createEnv(),
      "test_task",
      async ({ logger }) => {
        await logger.debug("render", "Rendering the email");
        await logger.warn("delivery_skipped", "Sent to person@example.com", {
          email: "person@example.com",
        });
        return undefined;
      },
      observability,
    );

    expect(taskEventsOf(observability)).toEqual([
      "scheduled_task.start",
      "scheduled_task.render",
      "scheduled_task.delivery_skipped",
      "scheduled_task.finish",
    ]);
    expect(JSON.stringify(observability.build())).not.toContain(
      "person@example.com",
    );
  });

  it("logs a failure and rethrows the handler's error", async () => {
    const observability = createInvocationLogger({
      source: "worker",
      trigger: "alarm",
    });
    const failure = new Error("rollup failed");

    await expect(
      runScheduledTask(
        createEnv(),
        "test_task",
        async () => {
          throw failure;
        },
        observability,
      ),
    ).rejects.toBe(failure);
    expect(taskEventsOf(observability)).toEqual([
      "scheduled_task.start",
      "scheduled_task.error",
    ]);
  });

  it("logs into the request's invocation record when none is passed", async () => {
    const observability = createInvocationLogger({
      source: "worker",
      trigger: "request",
    });

    await runWithInvocationLogger(observability, () =>
      runScheduledTask(createEnv(), "test_task", async () => undefined),
    );

    expect(taskEventsOf(observability)).toEqual([
      "scheduled_task.start",
      "scheduled_task.finish",
    ]);
  });
});
