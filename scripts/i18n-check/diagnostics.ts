import type { NodeInfo, UsageRef } from "./types";

function startsWithPath(pathValue: string, prefix: string): boolean {
  return pathValue === prefix || pathValue.startsWith(`${prefix}.`);
}

export function findUsedButMissing(
  usedPaths: string[],
  definedNodes: Map<string, NodeInfo>,
): string[] {
  return usedPaths.filter((usedPath) => {
    if (definedNodes.has(usedPath)) return false;
    for (const definedPath of definedNodes.keys()) {
      if (startsWithPath(definedPath, usedPath)) return false;
    }
    return true;
  });
}

export function findUnusedLeaves(
  leaves: Map<string, string>,
  usedPaths: string[],
): string[] {
  return [...leaves.keys()].filter(
    (leafPath) =>
      !usedPaths.some((usedPath) => startsWithPath(leafPath, usedPath)),
  );
}

export function formatUsageRefs(refs: UsageRef[] | undefined): string {
  if (!refs || refs.length === 0) return "";
  return refs
    .slice(0, 3)
    .map((ref) => `${ref.file}:${ref.line}:${ref.column}`)
    .join(", ");
}
