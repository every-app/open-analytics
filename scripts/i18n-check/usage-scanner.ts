import path from "node:path";

import ts from "typescript";

import { isRootAppMessagesType } from "./app-messages";
import { rlog } from "./logger";
import { isRelevantSourceFile, joinPath, relativeFromRoot } from "./paths";
import type {
  BindingMap,
  NodeInfo,
  ResolvedPath,
  TypePathMap,
  UsageRef,
} from "./types";
import { resolveTypeNodePath } from "./typescript";

function toPos(
  filePath: string,
  sourceFile: ts.SourceFile,
  node: ts.Node,
): UsageRef {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return {
    file: relativeFromRoot(filePath),
    line: line + 1,
    column: character + 1,
  };
}

function resolvePathFromExpression(
  expression: ts.Expression,
  checker: ts.TypeChecker,
  bindings: BindingMap[],
  appMessagesType: ts.Type,
  appMessagesSymbol: ts.Symbol,
): ResolvedPath | null {
  if (ts.isParenthesizedExpression(expression)) {
    return resolvePathFromExpression(
      expression.expression,
      checker,
      bindings,
      appMessagesType,
      appMessagesSymbol,
    );
  }

  if (ts.isIdentifier(expression)) {
    for (let index = bindings.length - 1; index >= 0; index -= 1) {
      const bound = bindings[index]?.get(expression.text);
      if (bound) {
        return { path: [...bound], dynamic: false };
      }
    }

    const type = checker.getTypeAtLocation(expression);
    if (
      isRootAppMessagesType(type, checker, appMessagesType, appMessagesSymbol)
    ) {
      return { path: [], dynamic: false };
    }
    return null;
  }

  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "getMessages"
  ) {
    return { path: [], dynamic: false };
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const base = resolvePathFromExpression(
      expression.expression,
      checker,
      bindings,
      appMessagesType,
      appMessagesSymbol,
    );
    if (!base) {
      // A property whose value is the messages object itself, such as a
      // route's `match.context.messages`.
      const type = checker.getTypeAtLocation(expression);
      return isRootAppMessagesType(
        type,
        checker,
        appMessagesType,
        appMessagesSymbol,
      )
        ? { path: [], dynamic: false }
        : null;
    }
    return {
      path: [...base.path, expression.name.text],
      dynamic: base.dynamic,
    };
  }

  if (ts.isElementAccessExpression(expression)) {
    const base = resolvePathFromExpression(
      expression.expression,
      checker,
      bindings,
      appMessagesType,
      appMessagesSymbol,
    );
    if (!base) return null;

    const argument = expression.argumentExpression;
    if (
      argument &&
      (ts.isStringLiteral(argument) ||
        ts.isNoSubstitutionTemplateLiteral(argument))
    ) {
      return {
        path: [...base.path, argument.text],
        dynamic: base.dynamic,
      };
    }

    return { path: [...base.path], dynamic: true };
  }

  return null;
}

function bindName(
  name: ts.BindingName,
  prefix: string[],
  scope: BindingMap,
): void {
  if (ts.isIdentifier(name)) {
    scope.set(name.text, [...prefix]);
    return;
  }

  if (ts.isObjectBindingPattern(name)) {
    for (const element of name.elements) {
      const propertyName = element.propertyName;
      if (
        propertyName &&
        !ts.isIdentifier(propertyName) &&
        !ts.isStringLiteral(propertyName)
      )
        continue;
      const key = propertyName
        ? ts.isIdentifier(propertyName)
          ? propertyName.text
          : propertyName.text
        : ts.isIdentifier(element.name)
          ? element.name.text
          : null;
      if (!key) continue;
      bindName(element.name, [...prefix, key], scope);
    }
  }
}

function addUsage(
  map: Map<string, UsageRef[]>,
  key: string,
  ref: UsageRef,
): void {
  const existing = map.get(key) ?? [];
  existing.push(ref);
  map.set(key, existing);
}

function isOutermostAccess(
  node: ts.PropertyAccessExpression | ts.ElementAccessExpression,
): boolean {
  const parent = node.parent;
  return !(
    (ts.isPropertyAccessExpression(parent) ||
      ts.isElementAccessExpression(parent)) &&
    parent.expression === node
  );
}

function isAliasInitializer(node: ts.Node): boolean {
  return (
    ts.isVariableDeclaration(node.parent) && node.parent.initializer === node
  );
}

export function collectUsedKeys(
  program: ts.Program,
  checker: ts.TypeChecker,
  appMessagesType: ts.Type,
  appMessagesSymbol: ts.Symbol,
  definedNodes: Map<string, NodeInfo>,
  typePaths: TypePathMap,
): Map<string, UsageRef[]> {
  const used = new Map<string, UsageRef[]>();

  const relevantFiles = program
    .getSourceFiles()
    .filter((file) => isRelevantSourceFile(path.resolve(file.fileName)));
  const total = relevantFiles.length;
  let count = 0;

  for (const sourceFile of relevantFiles) {
    const filePath = path.resolve(sourceFile.fileName);
    count += 1;
    rlog.progress(count, total);

    const bindings: BindingMap[] = [new Map<string, string[]>()];

    const visit = (node: ts.Node): void => {
      let pushedScope = false;
      if (ts.isFunctionLike(node) || ts.isSourceFile(node)) {
        if (!ts.isSourceFile(node)) {
          bindings.push(new Map<string, string[]>());
          pushedScope = true;
          for (const parameter of node.parameters) {
            const fromType = resolveTypeNodePath(
              parameter.type,
              typePaths,
              filePath,
              checker,
            );
            if (fromType) {
              bindName(
                parameter.name,
                fromType,
                bindings[bindings.length - 1]!,
              );
            } else if (
              ts.isObjectBindingPattern(parameter.name) &&
              parameter.type
            ) {
              const paramType = checker.getTypeAtLocation(parameter.type);
              for (const element of parameter.name.elements) {
                if (ts.isIdentifier(element.name)) {
                  let elementTypeNode: ts.TypeNode | undefined = undefined;
                  const propSymbol = paramType.getProperty(element.name.text);
                  if (
                    propSymbol &&
                    propSymbol.declarations &&
                    propSymbol.declarations.length > 0
                  ) {
                    const decl = propSymbol.declarations[0];
                    if (ts.isPropertySignature(decl)) {
                      elementTypeNode = decl.type;
                    } else if (ts.isPropertyDeclaration(decl)) {
                      elementTypeNode = decl.type;
                    }
                  }

                  let pathValue: string[] | null = null;
                  if (elementTypeNode) {
                    pathValue = resolveTypeNodePath(
                      elementTypeNode,
                      typePaths,
                      filePath,
                      checker,
                    );
                  }

                  if (!pathValue) {
                    const type = checker.getTypeAtLocation(element.name);
                    let typeName: string | null = null;
                    if (type.aliasSymbol) {
                      typeName = type.aliasSymbol.name;
                    } else {
                      const symbol = type.getSymbol();
                      if (symbol) {
                        typeName = symbol.name;
                      } else {
                        typeName = checker.typeToString(type);
                      }
                    }

                    if (typeName) {
                      const localKey = `${filePath}::${typeName}`;
                      if (typePaths.has(localKey)) {
                        pathValue = typePaths.get(localKey) ?? null;
                      } else if (typePaths.has(typeName)) {
                        pathValue = typePaths.get(typeName) ?? null;
                      } else if (typeName === "AppMessages") {
                        pathValue = [];
                      }
                    }
                  }

                  if (pathValue) {
                    bindName(
                      element.name,
                      pathValue,
                      bindings[bindings.length - 1]!,
                    );
                  }
                }
              }
            }
            if (!parameter.initializer) continue;
            const resolved = resolvePathFromExpression(
              parameter.initializer,
              checker,
              bindings,
              appMessagesType,
              appMessagesSymbol,
            );
            if (resolved) {
              bindName(
                parameter.name,
                resolved.path,
                bindings[bindings.length - 1]!,
              );
            }
          }
        }
      }

      if (ts.isVariableDeclaration(node) && node.initializer) {
        const fromType = resolveTypeNodePath(
          node.type,
          typePaths,
          filePath,
          checker,
        );
        if (fromType) {
          bindName(node.name, fromType, bindings[bindings.length - 1]!);
        }

        const resolved = resolvePathFromExpression(
          node.initializer,
          checker,
          bindings,
          appMessagesType,
          appMessagesSymbol,
        );
        if (resolved) {
          bindName(node.name, resolved.path, bindings[bindings.length - 1]!);
        }
      }

      if (
        (ts.isPropertyAccessExpression(node) ||
          ts.isElementAccessExpression(node)) &&
        isOutermostAccess(node)
      ) {
        const resolved = resolvePathFromExpression(
          node,
          checker,
          bindings,
          appMessagesType,
          appMessagesSymbol,
        );
        if (resolved && resolved.path.length > 0) {
          const resolvedKey = joinPath(resolved.path);
          const nodeInfo = definedNodes.get(resolvedKey);
          if (
            isAliasInitializer(node) &&
            nodeInfo?.kind === "object" &&
            !resolved.dynamic
          ) {
            ts.forEachChild(node, visit);
            if (pushedScope) {
              bindings.pop();
            }
            return;
          }

          addUsage(used, resolvedKey, toPos(filePath, sourceFile, node));
        }
      }

      ts.forEachChild(node, visit);

      if (pushedScope) {
        bindings.pop();
      }
    };

    visit(sourceFile);
  }

  return used;
}
