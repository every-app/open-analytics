/**
 * The Every App manifest: Open Analytics' id, resources and public surface.
 *
 * cloudflare.config.ts builds the Worker from it, and `everyapp deploy`
 * validates it, provisions D1, KV and the Durable Object, migrates D1 and
 * registers the app with the gateway. The Worker itself never imports this
 * file.
 */
export default {
  id: "analytics",
  name: "Open Analytics",
  description: "Privacy-friendly web analytics for your organization's sites.",
  // The date InsightFlare ran on under Wrangler.
  compatibilityDate: "2026-03-01",
  resources: {
    // Sites, settings and every analytics row.
    d1: ["DB"],
    // Per-site tracking settings, read by /script.js and /collect.
    kv: ["SITE_SETTINGS_KV"],
    // One per site: buffers ingest, serves realtime and flushes to D1.
    durableObjects: [{ name: "INGEST_DO", className: "IngestDurableObject" }],
  },
  migrations: { engine: "d1-sql", dir: "migrations", binding: "DB" },
  // Builds the UI packages and the tracker bundles before `vite build`, and
  // watches the translations while `vite dev` runs (scripts/dev.ts).
  build: "pnpm run build",
  dev: "pnpm run dev:app",
  // Notification reports and alerts go out as the gateway's mail
  // (src/lib/notifications/edge/delivery.ts).
  capabilities: {
    email: {
      access: "write",
      why: "Emails scheduled reports and alerts to members who turned email notifications on.",
    },
  },
  // Every member of the organization can open the dashboards; owners and
  // admins manage sites and settings (src/lib/edge/auth/viewer.ts).
  access: "everyone",
  // Nothing reaches the app without a signed-in member but what anonymous
  // visitors and share-link viewers need:
  public: [
    // The tracker, loaded by <script> on the organization's own websites,
    // and the collector it posts to. The tracker posts text/plain, so the
    // browser sends no preflight and OPTIONS stays private.
    { path: "/script.js", methods: ["GET"] },
    { path: "/collect", methods: ["POST"] },
    // Public share links: the pages, their data and the map resources they
    // draw, plus the built assets and icons those pages load.
    { path: "/share/**", methods: ["GET"] },
    { path: "/:locale/share/**", methods: ["GET"] },
    { path: "/api/public/share/**", methods: ["GET"] },
    { path: "/api/public/resources/**", methods: ["GET"] },
    { path: "/assets/**", methods: ["GET"] },
    { path: "/images/**", methods: ["GET"] },
    { path: "/favicon.ico", methods: ["GET"] },
    { path: "/site.webmanifest", methods: ["GET"] },
    { path: "/android-chrome-192x192.png", methods: ["GET"] },
    { path: "/android-chrome-512x512.png", methods: ["GET"] },
    // Says only whether the Worker and its bindings answer.
    { path: "/healthz", methods: ["GET"] },
  ],
} as const;
