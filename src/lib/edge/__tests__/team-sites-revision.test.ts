import { describe, expect, it } from "vitest";

import { createMigratedDatabase } from "@/../scripts/schema/database";
import { createSqliteD1Database } from "@/lib/db/__tests__/sqlite-d1";
import { readTeamSitesRevision } from "@/lib/edge/analytics/providers/d1/internal/team";
import type { Env } from "@/lib/edge/types";

describe("team sites revision", () => {
  it("changes when a site is added or edited", async () => {
    const database = createMigratedDatabase();
    const env = { DB: createSqliteD1Database(database) } as Env;
    expect(await readTeamSitesRevision(env, "org-1")).toBe("0:0");
    database
      .prepare("INSERT INTO teams (id, name, slug) VALUES (?, ?, ?)")
      .run("org-1", "org-1", "org-1");
    database
      .prepare(
        "INSERT INTO sites (id, team_id, name, domain, updated_at) VALUES (?, ?, ?, 'shop.example.com', ?)",
      )
      .run("site-1", "org-1", "site-1", 100);
    expect(await readTeamSitesRevision(env, "org-1")).toBe("1:100");
    database.prepare("UPDATE sites SET updated_at = 200").run();
    expect(await readTeamSitesRevision(env, "org-1")).toBe("1:200");
    database.close();
  });
});
