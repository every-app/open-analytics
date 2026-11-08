import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import { D1_MAX_COMPOUND_SELECT_TERMS } from "@/lib/db";

export interface SqliteD1Trace {
  readonly preparedSql: string[];
  readonly bindings: SQLInputValue[][];
  readonly batchStatements?: string[][];
}

/** D1's own limits, which SQLite's defaults would let a test pass. */
export function applyD1Limits(database: DatabaseSync): DatabaseSync {
  database.limits.compoundSelect = D1_MAX_COMPOUND_SELECT_TERMS;
  return database;
}

/** `database` as a D1 binding, with D1's limits. */
export function createSqliteD1Database(
  database: DatabaseSync,
  trace?: SqliteD1Trace,
): D1Database {
  applyD1Limits(database);
  const statementSql = new WeakMap<object, string>();
  return {
    prepare(sql: string) {
      trace?.preparedSql.push(sql);
      const statement = database.prepare(sql);
      let bindings: SQLInputValue[] = [];
      const prepared = {
        bind(...values: SQLInputValue[]) {
          bindings = values;
          trace?.bindings.push(values);
          return prepared;
        },
        async first<Row>() {
          return (statement.get(...bindings) as Row | undefined) ?? null;
        },
        async all<Row>() {
          return {
            success: true,
            results: statement.all(...bindings) as Row[],
          } as D1Result<Row>;
        },
        async run() {
          // D1 returns a statement's RETURNING rows from run() and batch().
          if (/\bRETURNING\b/i.test(sql)) {
            const results = statement.all(...bindings);
            return {
              success: true,
              results,
              meta: { changes: results.length },
            } as D1Result;
          }
          const result = statement.run(...bindings);
          return {
            success: true,
            meta: { changes: Number(result.changes) },
          } as D1Result;
        },
      };
      statementSql.set(prepared, sql);
      return prepared as unknown as D1PreparedStatement;
    },
    async batch(statements: D1PreparedStatement[]) {
      trace?.batchStatements?.push(
        statements.map((prepared) => statementSql.get(prepared) ?? ""),
      );
      database.exec("BEGIN");
      try {
        const results: D1Result[] = [];
        for (const prepared of statements) {
          results.push(await prepared.run());
        }
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  } as D1Database;
}
