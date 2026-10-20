import fs from "node:fs";
import path from "node:path";

import Rlog from "rlog-js";

import { LOGS_DIR } from "./paths";

interface ScriptLoggerOptions {
  logFile?: string | false;
  silent?: boolean;
}

let issueHintNeeded = false;
let issueHintPrinted = false;
let issueHintRegistered = false;
let latestIssueHintLogger: Rlog | null = null;
let latestIssueHintLogFilePath: string | undefined;

function defaultLogFile(): string {
  const scriptPath = process.argv[1];
  if (!scriptPath) return "script.log";

  const name = path.basename(scriptPath).replace(/\.(?:c|m)?tsx?$/i, "");
  return `${name || "script"}.log`;
}

function issueUrl(): string {
  return "https://github.com/every-app/private-open-analytics/issues";
}

function printIssueHint(rlog: Rlog, logFilePath: string | undefined): void {
  if (!issueHintNeeded || issueHintPrinted) return;
  issueHintPrinted = true;

  rlog.warn("");
  rlog.warn(
    "Need help? Please open an issue and include the logs around the error.",
  );
  if (logFilePath) {
    rlog.warn(`Log file: ${logFilePath}`);
  }
  rlog.warn(`Issue tracker: ${issueUrl()}`);
}

function registerIssueHint(rlog: Rlog, logFilePath: string | undefined): void {
  latestIssueHintLogger = rlog;
  latestIssueHintLogFilePath = logFilePath;

  rlog.onExit(() => {
    printIssueHint(rlog, logFilePath);
  });

  if (issueHintRegistered) return;
  issueHintRegistered = true;

  process.once("beforeExit", () => {
    if (latestIssueHintLogger) {
      printIssueHint(latestIssueHintLogger, latestIssueHintLogFilePath);
    }
  });
}

function attachIssueHint(rlog: Rlog, logFilePath: string | undefined): Rlog {
  registerIssueHint(rlog, logFilePath);

  const originalError = rlog.error.bind(rlog);
  rlog.error = ((...args: unknown[]) => {
    issueHintNeeded = true;
    originalError(...args);
  }) as typeof rlog.error;

  const originalExit = rlog.exit.bind(rlog);
  rlog.exit = ((message: unknown) => {
    issueHintNeeded = true;
    return originalExit(message);
  }) as typeof rlog.exit;

  return rlog;
}

export function createScriptLogger(options: ScriptLoggerOptions = {}): Rlog {
  const logFile =
    options.logFile === false
      ? undefined
      : (options.logFile ?? defaultLogFile());
  const logFilePath = logFile ? path.join(LOGS_DIR, logFile) : undefined;

  if (logFilePath && !fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }

  return attachIssueHint(
    new Rlog({
      enableColorfulOutput: true,
      logFilePath,
      silent: options.silent,
    }),
    logFilePath,
  );
}
