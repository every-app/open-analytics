import type { SqlExpression } from "./expression";
import type {
  LogicalQueryNode,
  ProjectNode,
  QuerySource,
  ScanNode,
} from "./plan";

export interface DirectScanProjectionChoice {
  readonly scan: ScanNode;
  /** Actual schema SQL column names in the Project output order. */
  readonly sqlColumnNames: readonly string[];
}

function nodeExpressions(node: LogicalQueryNode): readonly SqlExpression[] {
  switch (node.kind) {
    case "filter":
      return [node.predicate];
    case "project":
      return node.projections.map(({ expression }) => expression);
    case "join":
      return [node.condition];
    case "aggregate":
      return [
        ...node.groups.map(({ expression }) => expression),
        ...node.aggregates.map(({ expression }) => expression),
      ];
    case "sort":
      return node.keys.map(({ expression }) => expression);
    case "limit":
      return [node.count, ...(node.offset ? [node.offset] : [])];
    case "scan":
      return [];
  }
}

function expressionSources(expression: SqlExpression): QuerySource[] {
  const result: QuerySource[] = [];
  const visit = (current: SqlExpression): void => {
    switch (current.kind) {
      case "binary":
        visit(current.left);
        visit(current.right);
        break;
      case "boolean":
        current.expressions.forEach(visit);
        break;
      case "null-check":
        visit(current.expression);
        break;
      case "aggregate":
        if (current.expression) visit(current.expression);
        break;
      case "coalesce":
        current.expressions.forEach(visit);
        break;
      case "case":
        current.branches.forEach((branch) => {
          visit(branch.when);
          visit(branch.then);
        });
        if (current.else) visit(current.else);
        break;
      case "scalar-subquery":
        result.push(current.query);
        break;
      case "column":
      case "parameter":
      case "excluded":
      case "unixepoch":
        break;
    }
  };
  visit(expression);
  return result;
}

function nodeChildren(node: LogicalQueryNode): QuerySource[] {
  return node.kind === "scan"
    ? []
    : node.kind === "filter" ||
        node.kind === "project" ||
        node.kind === "aggregate" ||
        node.kind === "sort" ||
        node.kind === "limit"
      ? [node.input]
      : [node.left, node.right];
}

function nodeSources(node: LogicalQueryNode): QuerySource[] {
  return [
    ...nodeChildren(node),
    ...nodeExpressions(node).flatMap(expressionSources),
  ];
}

/** Project(Scan) nodes whose projections are plain columns of the scan. */
export function directScanProjectionChoices(
  root: LogicalQueryNode,
): ReadonlyMap<ProjectNode, DirectScanProjectionChoice> {
  const choices = new Map<ProjectNode, DirectScanProjectionChoice>();
  const visited = new Set<LogicalQueryNode>();
  const visit = (node: LogicalQueryNode): void => {
    if (visited.has(node)) return;
    visited.add(node);
    for (const source of nodeSources(node)) visit(source.node);
    if (node.kind !== "project" || node.input.node.kind !== "scan") return;
    const scan = node.input.node;
    const columns = Object.values(scan.table.columns);
    const sqlColumnNames: string[] = [];
    for (const projection of node.projections) {
      const expression = projection.expression;
      if (
        expression.kind !== "column" ||
        expression.scope !== node.input.scope ||
        !Number.isInteger(expression.index) ||
        expression.index < 0
      )
        return;
      // Callers validate the logical plan first, which guarantees that this
      // column scope and index belong to the generated Scan input.
      sqlColumnNames.push(columns[expression.index]!.sqlName);
    }
    choices.set(node, { scan, sqlColumnNames });
  };
  visit(root);
  return choices;
}
