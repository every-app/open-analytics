import process from "node:process";

import ts from "typescript";

import { getAppMessagesType } from "./app-messages";
import {
  findUnusedLeaves,
  findUsedButMissing,
  formatUsageRefs,
} from "./diagnostics";
import { rlog } from "./logger";
import { EN_PATH, TSCONFIG_PATH } from "./paths";
import { pruneUnusedKeys } from "./prune";
import type { NodeInfo } from "./types";
import { collectTypePaths, parseTsConfig } from "./typescript";
import { collectUsedKeys } from "./usage-scanner";
import { collectNodes, readYaml } from "./yaml";

export async function runCli(
  args: string[] = process.argv.slice(2),
): Promise<void> {
  rlog.info("Loading en.yaml...");
  const enNodes = new Map<string, NodeInfo>();
  const enLeaves = new Map<string, string>();
  collectNodes(await readYaml(EN_PATH), [], enNodes, enLeaves);

  rlog.info("Parsing tsconfig.json...");
  const config = parseTsConfig(TSCONFIG_PATH);

  rlog.info(
    `Creating TypeScript program for ${config.fileNames.length} files...`,
  );
  const program = ts.createProgram({
    rootNames: config.fileNames,
    options: config.options,
  });

  rlog.info("Acquiring TypeScript TypeChecker...");
  const checker = program.getTypeChecker();

  rlog.info("Resolving referenced translation type paths...");
  const typePaths = collectTypePaths(program, checker);

  rlog.info("Analyzing AppMessages type properties...");
  const { type: appMessagesType, symbol: appMessagesSymbol } =
    getAppMessagesType(program, checker);

  rlog.info("Scanning codebase to collect all referenced keys...");
  const usageMap = collectUsedKeys(
    program,
    checker,
    appMessagesType,
    appMessagesSymbol,
    enNodes,
    typePaths,
  );
  const usedPaths = [...usageMap.keys()].sort();

  rlog.info("Running diagnostics validation...");

  const usedButMissing = findUsedButMissing(usedPaths, enNodes);
  const unusedKeys = findUnusedLeaves(enLeaves, usedPaths);
  const errors = usedButMissing.length;

  if (errors > 0) {
    rlog.error("I18n Check Failed!");
  } else {
    rlog.success("I18n Check Passed Successfully!");
  }

  rlog.log(`- en leaf keys: ${enLeaves.size}`);
  rlog.log(`- referenced key paths: ${usedPaths.length}`);
  if (errors > 0) {
    rlog.error(`- structural errors: ${errors}`);
  } else {
    rlog.success(`- structural errors: ${errors}`);
  }

  if (unusedKeys.length > 0) {
    rlog.warn(`- unused en leaf keys: ${unusedKeys.length}`);
  } else {
    rlog.log(`- unused en leaf keys: ${unusedKeys.length}`);
  }

  if (usedButMissing.length > 0) {
    rlog.error("\nUsed But Missing In en.yaml");
    for (const key of usedButMissing) {
      rlog.warn(`- ${key} (${formatUsageRefs(usageMap.get(key))})`);
    }
  }

  if (unusedKeys.length > 0) {
    rlog.file.info("\nUnused en.yaml Keys");
    rlog.screen.info("Writing unused en.yaml keys to local log file...");
    let i = 0;
    for (const key of unusedKeys) {
      rlog.file.info(`- ${key}`);
      i += 1;
      rlog.progress(i, unusedKeys.length);
    }
  }

  if (args.includes("--prune") && unusedKeys.length > 0) {
    await pruneUnusedKeys(unusedKeys);
  }

  if (errors > 0) {
    process.exitCode = 1;
  }
}
