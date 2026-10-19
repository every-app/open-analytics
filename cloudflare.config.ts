import { everyAppWorker } from "@every-app/sdk/cloudflare";
import { bindings, defineConfig } from "cf/config";

import * as entrypoint from "./src/server.ts" with { type: "cf-worker" };
import manifest from "./everyapp.config.ts";

// The Worker, as `pnpm dev` and `everyapp deploy` build it, from
// everyapp.config.ts. Nothing the Worker imports may be imported here: in dev
// the Cloudflare Vite plugin hides this file's imports from the Worker.
export default defineConfig((ctx) => {
  const worker = everyAppWorker({
    manifest,
    entrypoint,
    ctx,
    // Rollups, notifications, retention and the ingest alarm sweep
    // (src/lib/edge/scheduled-tasks/dispatcher.ts).
    crons: ["*/30 * * * *"],
    // The root secret for visitor salts, collect tokens and stored-secret
    // encryption (src/lib/secrets.ts): `everyapp secret set MAIN_SECRET`, 32
    // or more random characters. In dev, .dev.vars sets it.
    secrets: ["MAIN_SECRET"],
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
