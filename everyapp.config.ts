/**
 * The Every App manifest: OpenAnalytics' id, resources and public surface.
 *
 * cloudflare.config.ts builds the Worker from it, and `everyapp deploy`
 * validates it, provisions D1, KV and the Durable Object, migrates D1 and
 * registers the app with the gateway. The Worker itself never imports this
 * file.
 */
export default {
  id: "analytics",
  name: "OpenAnalytics",
  description: "Privacy-friendly web analytics for your organization's sites.",
  icon: "/everyapp-icon.svg",
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
  // Required: the app doesn't open without it (src/lib/secrets.ts). In dev,
  // .dev.vars sets it.
  secrets: [
    {
      name: "MAIN_SECRET",
      why: "The root secret for visitor salts and collect tokens; 32 or more random characters, e.g. openssl rand -base64 32.",
    },
  ],
  // Builds the UI packages and the tracker bundles before `vite build`, and
  // watches the translations while `vite dev` runs (scripts/dev.ts).
  build: "pnpm run build",
  dev: "pnpm run dev:app",
  // Notification reports and alerts go out as the gateway's mail
  // (src/lib/notifications/edge/delivery.ts).
  capabilities: {
    // Whom reports and alerts go to: the organization's members who can
    // open the app now (src/lib/notifications/edge/rule-store.ts).
    members: {
      access: "read",
      why: "Sends reports and alerts only to people who can still open the app.",
    },
    // Optional: without it reports and alerts stay in the inbox, and the app
    // says so where email is turned on.
    email: {
      access: "write",
      optional: true,
      why: "Emails scheduled reports and alerts to members who turned email notifications on.",
    },
  },
  // Every member of the organization can open the dashboards; owners and
  // admins manage sites and settings (src/lib/edge/auth/viewer.ts).
  access: "everyone",
  // Nothing reaches the app without a signed-in member but what anonymous
  // visitors and share-link viewers need. /healthz is not listed: a signed-in
  // member or a personal access token reaches it, and the Gateway's own
  // https://<gateway>/health is the public liveness check.
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
    { path: "/favicon.svg", methods: ["GET"] },
    { path: "/favicon-96x96.png", methods: ["GET"] },
    { path: "/apple-touch-icon.png", methods: ["GET"] },
    { path: "/site.webmanifest", methods: ["GET"] },
    { path: "/web-app-manifest-192x192.png", methods: ["GET"] },
    { path: "/web-app-manifest-512x512.png", methods: ["GET"] },
  ],
} as const;
