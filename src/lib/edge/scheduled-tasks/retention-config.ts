import { readConfig, upsertConfig } from "@/lib/edge/system-config";
import type { Env } from "@/lib/edge/types";
import {
  DEFAULT_RETENTION_CONFIG,
  normalizeRetentionConfig,
  RETENTION_CONFIG_KEY,
  type RetentionConfig,
} from "@/lib/retention";
export async function readRetentionConfig(
  env: Pick<Env, "DB">,
): Promise<RetentionConfig> {
  try {
    return normalizeRetentionConfig(
      await readConfig(env, RETENTION_CONFIG_KEY),
    );
  } catch {
    return DEFAULT_RETENTION_CONFIG;
  }
}
export async function writeRetentionConfig(
  env: Pick<Env, "DB">,
  value: RetentionConfig,
): Promise<RetentionConfig> {
  const normalized = normalizeRetentionConfig(value);
  await upsertConfig(env, RETENTION_CONFIG_KEY, { ...normalized });
  return normalized;
}
