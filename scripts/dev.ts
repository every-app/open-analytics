/**
 * The app's dev server, as `everyapp dev` starts it (everyapp.config.ts `dev`):
 * builds the tracker SDK, then starts `cf dev` while watching src/i18n/*.yaml.
 *
 * The yaml watcher reruns `regenerateAppMessages()` on change so editing
 * translation files takes effect in the running app without a restart.
 */
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import path from "node:path";

import { createYamlWatcher } from "./i18n-check/watch";
import { createScriptLogger } from "./shared/logger";

const rlog = createScriptLogger({
  logFile: "dev.log",
});

const ROOT = process.cwd();
const TSCLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const TRACKER_INPUTS = [
  path.join(ROOT, "src/tracker/sdk.ts"),
  path.join(ROOT, "src/tracker/auto-track.ts"),
  path.join(ROOT, "src/tracker/performance.ts"),
  path.join(ROOT, "src/tracker/ua-client-hints.ts"),
  path.join(ROOT, "scripts/build-tracker-sdk.ts"),
];
const TRACKER_OUTPUTS = [
  path.join(ROOT, "src/tracker/sdk.min.ts"),
  path.join(ROOT, "src/tracker/sdk.no-perf.min.ts"),
];

function trackerBuildIsFresh(): boolean {
  try {
    const newestInput = Math.max(
      ...TRACKER_INPUTS.map((filePath) => statSync(filePath).mtimeMs),
    );
    return TRACKER_OUTPUTS.every(
      (filePath) => statSync(filePath).mtimeMs >= newestInput,
    );
  } catch {
    return false;
  }
}

async function runBuildSdk(): Promise<void> {
  if (trackerBuildIsFresh()) {
    rlog.info("Tracker SDK is up to date; skipping build.");
    return;
  }
  rlog.info("Building tracker SDK...");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [TSCLI, path.join(ROOT, "scripts", "build-tracker-sdk.ts")],
      { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
    );
    child.stdout.on("data", (chunk: Buffer) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`build-tracker-sdk failed with exit code ${code}`));
    });
  });
}

async function main(): Promise<void> {
  await runBuildSdk();

  const watcher = createYamlWatcher(rlog);
  watcher.start();

  rlog.info("Starting cf dev...");
  // `pnpm run` puts node_modules/.bin on PATH.
  const vite = spawn("cf", ["dev"], {
    cwd: ROOT,
    stdio: ["inherit", "inherit", "inherit"],
  });

  vite.on("error", (error) => {
    rlog.error("cf dev failed to start:", error.message);
    watcher.stop();
    process.exit(1);
  });

  vite.on("close", (code, signal) => {
    watcher.stop();
    const reason =
      signal != null
        ? `cf dev terminated by signal ${signal}`
        : `cf dev exited with code ${code ?? 0}`;
    rlog.info(reason);
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  rlog.error(
    "fatal:",
    error instanceof Error ? error.stack || error.message : String(error),
  );
  process.exit(1);
});
