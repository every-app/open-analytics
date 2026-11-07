import type { DatabaseRuntime } from "@/lib/db";
import { readConfig, upsertConfig } from "@/lib/edge/system-config";
import {
  DEFAULT_RETENTION_CONFIG,
  normalizeRetentionConfig,
  RETENTION_CONFIG_KEY,
  type RetentionConfig,
} from "@/lib/retention";
export async function readRetentionConfig(
  db: DatabaseRuntime,
): Promise<RetentionConfig> {
  try {
    return normalizeRetentionConfig(await readConfig(db, RETENTION_CONFIG_KEY));
  } catch {
    return DEFAULT_RETENTION_CONFIG;
  }
}
export async function writeRetentionConfig(
  db: DatabaseRuntime,
  value: RetentionConfig,
): Promise<RetentionConfig> {
  const normalized = normalizeRetentionConfig(value);
  await upsertConfig(db, RETENTION_CONFIG_KEY, { ...normalized });
  return normalized;
}
