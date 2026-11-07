import path from "node:path";

import ts from "typescript";

import { APP_MESSAGES_PATH, relativeFromRoot } from "./paths";

function resolveAliasedSymbol(
  symbol: ts.Symbol,
  checker: ts.TypeChecker,
): ts.Symbol {
  if ((symbol.flags & ts.SymbolFlags.Alias) === 0) {
    return symbol;
  }

  return checker.getAliasedSymbol(symbol);
}

function findDeclaredAppMessagesSymbol(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
): ts.Symbol | null {
  const localDeclaration = sourceFile.statements.find(
    (
      statement,
    ): statement is ts.InterfaceDeclaration | ts.TypeAliasDeclaration =>
      (ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement)) &&
      statement.name.text === "AppMessages",
  );
  if (localDeclaration) {
    return checker.getSymbolAtLocation(localDeclaration.name) ?? null;
  }

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    if (!statement.exportClause) continue;
    if (!ts.isNamedExports(statement.exportClause)) continue;

    for (const element of statement.exportClause.elements) {
      if (element.name.text !== "AppMessages") continue;
      const exportedSymbol = checker.getSymbolAtLocation(element.name);
      if (exportedSymbol) {
        return resolveAliasedSymbol(exportedSymbol, checker);
      }

      const localName = element.propertyName ?? element.name;
      const localSymbol = checker.getSymbolAtLocation(localName);
      if (localSymbol) {
        return resolveAliasedSymbol(localSymbol, checker);
      }
    }
  }

  return null;
}

export function getAppMessagesType(
  program: ts.Program,
  checker: ts.TypeChecker,
): { type: ts.Type; symbol: ts.Symbol } {
  const sourceFile = program
    .getSourceFiles()
    .find((file) => path.resolve(file.fileName) === APP_MESSAGES_PATH);
  if (!sourceFile) {
    throw new Error(
      `Unable to find ${relativeFromRoot(APP_MESSAGES_PATH)} in ts.Program`,
    );
  }

  const symbol = findDeclaredAppMessagesSymbol(sourceFile, checker);
  if (!symbol) {
    throw new Error("Unable to locate AppMessages interface declaration");
  }

  const type = checker.getDeclaredTypeOfSymbol(symbol);

  return { type, symbol };
}

/**
 * Pick<AppMessages, "a" | "b"> and other slices of the root: every property
 * is one of the root's, with the root's type, so its keys read as the root's.
 */
function isAppMessagesSlice(
  type: ts.Type,
  checker: ts.TypeChecker,
  appMessagesType: ts.Type,
): boolean {
  const rootKeys = new Set(
    appMessagesType.getProperties().map((property) => property.name),
  );
  const properties = type.getProperties();
  return (
    properties.length > 0 &&
    properties.every((property) => rootKeys.has(property.name)) &&
    checker.isTypeAssignableTo(appMessagesType, type)
  );
}

export function isRootAppMessagesType(
  type: ts.Type,
  checker: ts.TypeChecker,
  appMessagesType: ts.Type,
  appMessagesSymbol: ts.Symbol,
): boolean {
  if ((type.flags & ts.TypeFlags.Any) !== 0) return false;

  if (
    type.aliasSymbol &&
    (type.aliasSymbol.flags & ts.SymbolFlags.Alias) !== 0
  ) {
    const aliased = checker.getAliasedSymbol(type.aliasSymbol);
    if (aliased === appMessagesSymbol) return true;
  }

  const symbol = type.getSymbol();
  if (symbol === appMessagesSymbol) return true;

  if (
    "isTypeAssignableTo" in checker &&
    typeof checker.isTypeAssignableTo === "function" &&
    isAppMessagesSlice(type, checker, appMessagesType)
  ) {
    return true;
  }

  if (
    "isTypeAssignableTo" in checker &&
    typeof checker.isTypeAssignableTo === "function"
  ) {
    try {
      return checker.isTypeAssignableTo(type, appMessagesType);
    } catch {
      return false;
    }
  }

  return checker.typeToString(type) === "AppMessages";
}
