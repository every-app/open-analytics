import fs from "node:fs/promises";

import * as prettier from "prettier";
import YAML from "yaml";

import { rlog } from "./logger";
import { APP_MESSAGES_PATH, EN_PATH } from "./paths";
import type { JsonLike } from "./types";

function tsKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function toTsInterface(
  obj: JsonLike,
  indent: number = 2,
  path: string[] = [],
): string {
  const currentPath = path.join(".");
  if (
    currentPath === "common.continentLabels" ||
    currentPath === "geo.investigation.typeLabels" ||
    currentPath === "filterBuilder.fieldLabels" ||
    currentPath === "filterBuilder.operatorLabels"
  ) {
    return "Record<string, string>";
  }

  if (Array.isArray(obj)) {
    return "string[]";
  }

  if (obj && typeof obj === "object") {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return "Record<string, never>";
    }

    const spaces = " ".repeat(indent);
    const childSpaces = " ".repeat(indent + 2);
    const lines = ["{"];
    for (const [key, value] of entries) {
      const propType = toTsInterface(value, indent + 2, [...path, key]);
      lines.push(`${childSpaces}${tsKey(key)}: ${propType};`);
    }
    lines.push(`${spaces}}`);
    return lines.join("\n");
  }

  return "string";
}

function buildMessagesOutput(parsedYaml: unknown): string {
  const interfaceBody = [];
  for (const [key, value] of Object.entries(
    parsedYaml as Record<string, unknown>,
  )) {
    const propType = toTsInterface(value as JsonLike, 2, [key]);
    interfaceBody.push(`  ${tsKey(key)}: ${propType};`);
  }

  return `// @generated from src/i18n/en.yaml by scripts/i18n-check.
import type { Locale } from "./config";

export interface AppMessages {
${interfaceBody.join("\n")}
}

const enMessages = ${JSON.stringify(parsedYaml, null, 2)} as AppMessages;

const DICTIONARIES: Record<Locale, AppMessages> = {
  en: enMessages,
};

export function getMessages(locale: Locale): AppMessages {
  return DICTIONARIES[locale];
}
`;
}

async function writeMessagesFile(parsedYaml: unknown): Promise<void> {
  const prettierOptions = await prettier.resolveConfig(APP_MESSAGES_PATH);
  const formatted = await prettier.format(buildMessagesOutput(parsedYaml), {
    ...(prettierOptions ?? {}),
    filepath: APP_MESSAGES_PATH,
  });
  await fs.writeFile(APP_MESSAGES_PATH, formatted, "utf8");
  rlog.success("Successfully regenerated messages.ts schema!");
}

export async function regenerateAppMessages(): Promise<void> {
  await writeMessagesFile(YAML.parse(await fs.readFile(EN_PATH, "utf8")));
}

export async function pruneUnusedKeys(unusedKeys: string[]): Promise<void> {
  rlog.info("\nPruning unused keys from en.yaml...");

  const doc = YAML.parseDocument(await fs.readFile(EN_PATH, "utf8"));
  for (const key of unusedKeys) {
    doc.deleteIn(key.split("."));
  }
  const prunedText = doc.toString();
  await fs.writeFile(EN_PATH, prunedText, "utf8");
  rlog.success(`Successfully pruned ${unusedKeys.length} keys from en.yaml!`);

  rlog.info("Regenerating messages.ts schema to match pruned translations...");
  await writeMessagesFile(YAML.parse(prunedText));
}
