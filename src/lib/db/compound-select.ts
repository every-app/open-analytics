import { D1_MAX_COMPOUND_SELECT_TERMS } from "./d1-budget";

export enum CompoundOperator {
  Union = "UNION",
  UnionAll = "UNION ALL",
}

/**
 * Joins SELECTs with `operator` in a form D1 accepts. A compound of more
 * than D1_MAX_COMPOUND_SELECT_TERMS terms becomes a compound of subqueries,
 * each holding at most that many, nested as deep as needed. The rows are
 * the same: UNION ALL keeps every row of every group, and UNION removes
 * duplicates across groups as it does within one.
 */
export function compoundSelectSql(
  selects: readonly string[],
  operator: CompoundOperator,
): string {
  if (selects.length <= D1_MAX_COMPOUND_SELECT_TERMS) {
    return selects.join(`\n${operator}\n`);
  }
  const groups: string[] = [];
  for (
    let index = 0;
    index < selects.length;
    index += D1_MAX_COMPOUND_SELECT_TERMS
  ) {
    const group = selects.slice(index, index + D1_MAX_COMPOUND_SELECT_TERMS);
    groups.push(`SELECT * FROM (\n${group.join(`\n${operator}\n`)}\n)`);
  }
  return compoundSelectSql(groups, operator);
}
