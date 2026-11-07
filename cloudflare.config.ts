import {
  everyAppWorker,
  type EveryAppWorkerManifest,
} from "@every-app/sdk/cloudflare";
import { bindings, defineConfig } from "cf/config";

import * as entrypoint from "./src/server.ts" with { type: "cf-worker" };
import config from "./everyapp.config.ts";

// @every-app/sdk 0.3.0-rc.14 types a feature as its secrets and settings
// alone, so one listing only capabilities or providers fails the type check.
// Drop the cast once the SDK types the whole feature.
const manifest = config as Omit<typeof config, "features"> &
  Pick<EveryAppWorkerManifest, "features">;

// The Worker, as `pnpm dev` and `everyapp deploy` build it, from
// everyapp.config.ts. Nothing the Worker imports may be imported here: in dev
// the Cloudflare Vite plugin hides this file's imports from the Worker.
export default defineConfig((ctx) => {
  const worker = everyAppWorker({
    manifest,
    entrypoint,
    ctx,
    // Every minute: the dispatcher runs each task on its own schedule, and
    // again on the next minute while it has work left; the ingest alarm
    // sweep runs every 30 minutes (src/lib/edge/scheduled-tasks/dispatcher.ts,
    // src/lib/edge/ingest/alarm-sweep.ts).
    crons: ["* * * * *"],
  });
  return {
    worker: {
      ...worker,
      // As under Wrangler: global fetch() only reaches public addresses.
      compatibilityFlags: [
        ...worker.compatibilityFlags,
        "global_fetch_strictly_public",
      ],
      env: {
        ...worker.env,
        // Minutes of inactivity that end a session.
        SESSION_WINDOW_MINUTES: bindings.text("30"),
        // How long the Worker caches a site's /script.js response.
        SCRIPT_CACHE_TTL_SECONDS: bindings.text("600"),
      },
    },
  };
});
