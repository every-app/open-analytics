import type { DatabaseRuntime, DatabaseStatement } from "@/lib/db";
import type { Env } from "@/lib/edge/types";

/**
 * Cloudflare D1 lets one Worker invocation make 1,000 queries on Workers
 * Paid, and a `batch()` counts as one. It is the platform's limit, the only
 * one on how much a cron tick does: a task with work left when its queries
 * run out says so, and the dispatcher runs it again on the next tick, a
 * minute later.
 */
export const D1_QUERIES_PER_INVOCATION = 1000;

export class D1QueryBudgetExceededError extends Error {
  constructor(readonly limit: number) {
    super(`A task tried to make more than its ${limit} D1 queries.`);
    this.name = "D1QueryBudgetExceededError";
  }
}

/**
 * A count of D1 queries that refuses one past `limit`. A child budget's
 * queries count against its parent's too.
 */
export class D1QueryBudget {
  #used = 0;

  constructor(
    readonly limit: number,
    private readonly parent?: D1QueryBudget,
  ) {}

  get used(): number {
    return this.#used;
  }

  get left(): number {
    const own = this.limit - this.#used;
    return this.parent ? Math.min(own, this.parent.left) : own;
  }

  spend(): void {
    if (this.#used >= this.limit) {
      throw new D1QueryBudgetExceededError(this.limit);
    }
    this.parent?.spend();
    this.#used += 1;
  }

  /** A budget of up to `limit` of this budget's queries. */
  child(limit: number): D1QueryBudget {
    return new D1QueryBudget(limit, this);
  }
}

const RAW_STATEMENT = new WeakMap<object, D1PreparedStatement>();

function countedStatement(
  statement: D1PreparedStatement,
  budget: D1QueryBudget,
): D1PreparedStatement {
  const counted = new Proxy(statement, {
    get(target, property) {
      if (property === "bind") {
        return (...values: unknown[]) =>
          countedStatement(target.bind(...values), budget);
      }
      if (
        property === "all" ||
        property === "run" ||
        property === "first" ||
        property === "raw"
      ) {
        const query = target[property] as (...args: unknown[]) => unknown;
        return async (...args: unknown[]) => {
          budget.spend();
          return query.apply(target, args);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  RAW_STATEMENT.set(counted, statement);
  return counted;
}

/** `db` with each query it makes counted against `budget`, as D1 counts them. */
export function countD1Queries(
  db: D1Database,
  budget: D1QueryBudget,
): D1Database {
  return new Proxy(db, {
    get(target, property) {
      if (property === "prepare") {
        return (sql: string) => countedStatement(target.prepare(sql), budget);
      }
      if (property === "batch") {
        return async (statements: D1PreparedStatement[]) => {
          budget.spend();
          return target.batch(
            statements.map(
              (statement) => RAW_STATEMENT.get(statement) ?? statement,
            ),
          );
        };
      }
      if (property === "exec") {
        return async (sql: string) => {
          budget.spend();
          return target.exec(sql);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/** `env` with its D1 queries counted against `budget`. */
export function withD1QueryBudget(env: Env, budget: D1QueryBudget): Env {
  const db = countD1Queries(env.DB, budget);
  return new Proxy(env, {
    get(target, property, receiver) {
      return property === "DB" ? db : Reflect.get(target, property, receiver);
    },
  });
}

/**
 * A task's database: it counts the D1 queries it makes (a batch is one
 * query) and refuses a query past `maxQueries`, the queries the task was
 * given. Tasks plan their work with `queriesLeft`.
 */
export class BudgetedDatabase implements DatabaseRuntime {
  readonly #budget: D1QueryBudget;

  constructor(
    private readonly db: DatabaseRuntime,
    readonly maxQueries: number,
  ) {
    this.#budget = new D1QueryBudget(maxQueries);
  }

  get queries(): number {
    return this.#budget.used;
  }

  get queriesLeft(): number {
    return this.#budget.left;
  }

  all<T extends object = Record<string, unknown>>(
    statement: DatabaseStatement,
  ): Promise<D1Result<T>> {
    this.#budget.spend();
    return this.db.all<T>(statement);
  }

  first<T = Record<string, unknown>>(
    statement: DatabaseStatement,
    columnName?: string,
  ): Promise<T | null> {
    this.#budget.spend();
    return this.db.first<T>(statement, columnName);
  }

  run(statement: DatabaseStatement): Promise<D1Result> {
    this.#budget.spend();
    return this.db.run(statement);
  }

  batch(
    statements: readonly DatabaseStatement[],
  ): Promise<readonly D1Result[]> {
    this.#budget.spend();
    return this.db.batch(statements);
  }

  exec(sql: string): Promise<D1ExecResult> {
    this.#budget.spend();
    return this.db.exec(sql);
  }
}
