import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { handleRetentionAdmin } from "@/lib/edge/admin/retention/handler";
import type { Env } from "@/lib/edge/types";
import { DEFAULT_RETENTION_CONFIG } from "@/lib/retention";

const requireActor = vi.hoisted(() => vi.fn());
vi.mock("@/lib/edge/admin/auth", () => ({ requireActor }));

let database: DatabaseSync;
let env: Env;

function request(method: string, body?: unknown) {
  return new Request("https://app.test/api/private/admin/retention", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function dataOf(response: Response) {
  return ((await response.json()) as { data: unknown }).data;
}

beforeEach(() => {
  database = createMigratedDatabase();
  env = { DB: createSqliteD1Database(database) } as unknown as Env;
  requireActor.mockResolvedValue({ isAdmin: true });
});

afterEach(() => {
  database.close();
});

describe("retention admin route", () => {
  it("reads the defaults, then saves a change over them", async () => {
    await expect(
      dataOf(await handleRetentionAdmin(request("GET"), env)),
    ).resolves.toEqual(DEFAULT_RETENTION_CONFIG);

    const saved = await handleRetentionAdmin(
      request("PATCH", {
        retention: { analyticsDetailDays: 90, notificationDefaultDays: 0 },
      }),
      env,
    );

    // An out-of-range value keeps the current setting.
    const expected = { ...DEFAULT_RETENTION_CONFIG, analyticsDetailDays: 90 };
    await expect(dataOf(saved)).resolves.toEqual(expected);
    await expect(
      dataOf(await handleRetentionAdmin(request("GET"), env)),
    ).resolves.toEqual(expected);
  });

  it("refuses a change without settings, other methods and non-admins", async () => {
    expect(
      (await handleRetentionAdmin(request("PATCH", { days: 30 }), env)).status,
    ).toBe(400);
    expect((await handleRetentionAdmin(request("POST", {}), env)).status).toBe(
      405,
    );

    requireActor.mockResolvedValue({ isAdmin: false });
    expect((await handleRetentionAdmin(request("GET"), env)).status).toBe(403);

    requireActor.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await handleRetentionAdmin(request("GET"), env)).status).toBe(401);
  });
});
