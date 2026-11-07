import fs from "node:fs/promises";

import YAML from "yaml";

import { joinPath } from "./paths";
import type { JsonLike, JsonMap, NodeInfo } from "./types";

function normalizeValue(value: JsonLike): JsonMap {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  throw new Error("Expected top-level YAML object");
}

export async function readYaml(filePath: string): Promise<JsonMap> {
  const text = await fs.readFile(filePath, "utf8");
  return normalizeValue(YAML.parse(text) as JsonLike);
}

export function collectNodes(
  value: JsonLike,
  prefix: string[],
  nodes: Map<string, NodeInfo>,
  leaves: Map<string, string>,
): void {
  const currentPath = joinPath(prefix);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if (currentPath) {
      nodes.set(currentPath, { kind: "object" });
    }
    for (const [key, child] of Object.entries(value)) {
      collectNodes(child, [...prefix, key], nodes, leaves);
    }
    return;
  }

  const scalar = value === null || value === undefined ? "" : String(value);
  nodes.set(currentPath, { kind: "scalar", value: scalar });
  leaves.set(currentPath, scalar);
}
