import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";

const root = process.cwd();
const uiContractsDirectory = path.join(root, "packages/ui/src/components/ui");
const productContractsDirectory = path.join(root, "packages/product-ui/src");

function contractFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return contractFiles(absolute);
    return entry.name.endsWith(".contract.tsx") ? [absolute] : [];
  });
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

const sourceFiles = [
  ...contractFiles(uiContractsDirectory),
  ...contractFiles(productContractsDirectory),
];
const contractIds: string[] = [];
const fixtureIds: string[] = [];
const issues: string[] = [];
function stringProperty(
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): string | undefined {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    const resolvedName =
      ts.isIdentifier(name) || ts.isStringLiteralLike(name)
        ? name.text
        : undefined;
    if (
      resolvedName === propertyName &&
      ts.isStringLiteralLike(property.initializer)
    ) {
      return property.initializer.text;
    }
  }
  return undefined;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function fixtureArrayIds(expression: ts.Expression): string[] {
  const unwrapped = unwrapExpression(expression);
  if (!ts.isArrayLiteralExpression(unwrapped)) return [];
  return unwrapped.elements.flatMap((element) => {
    if (!ts.isObjectLiteralExpression(element)) return [];
    const id = stringProperty(element, "id");
    return id ? [id] : [];
  });
}

function contractData(
  sourcePath: string,
  source: string,
): {
  contractIds: string[];
  fixtureIds: string[];
} {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const fixturesByName = new Map<string, string[]>();
  const contractIds: string[] = [];
  const fixtureIds: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !declaration.initializer ||
        !ts.isArrayLiteralExpression(unwrapExpression(declaration.initializer))
      ) {
        continue;
      }
      fixturesByName.set(
        declaration.name.text,
        fixtureArrayIds(declaration.initializer),
      );
    }
  }

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "defineComponentContract" &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const definition = node.arguments[0];
      const id = stringProperty(definition, "id");
      if (id) contractIds.push(id);
      for (const property of definition.properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          !ts.isIdentifier(property.name) ||
          property.name.text !== "fixtures"
        ) {
          continue;
        }
        const initializer = property.initializer;
        if (ts.isIdentifier(initializer)) {
          fixtureIds.push(...(fixturesByName.get(initializer.text) ?? []));
        } else {
          fixtureIds.push(...fixtureArrayIds(initializer));
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { contractIds, fixtureIds };
}

for (const sourcePath of sourceFiles) {
  const source = readFileSync(sourcePath, "utf8");
  if (/Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(\s*\)/u.test(source)) {
    issues.push(
      `Non-deterministic value in component contract: ${path.relative(root, sourcePath)}`,
    );
  }
  const data = contractData(sourcePath, source);
  contractIds.push(...data.contractIds);
  fixtureIds.push(...data.fixtureIds);
}

for (const id of duplicates(contractIds))
  issues.push(`Duplicate contract id: ${id}`);
for (const id of duplicates(fixtureIds))
  issues.push(`Duplicate fixture id: ${id}`);

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `UI contracts passed (${contractIds.length} contracts, ${fixtureIds.length} fixtures).`,
  );
}
