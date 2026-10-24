# Porting InsightFlare to the Every App gateway: audit

> Historical. This is the plan written before the port (Wrangler, API keys, `skills.json`, a draft manifest); it no longer describes the app. What the app is now is in [`everyapp.config.ts`](../everyapp.config.ts) and the [README](../README.md).

Audited 2026-10-19 against InsightFlare v0.7.1 (`a4b67dd4`, cloned here as `open-analytics`) and `private-every-app` main (`666013dd`). Goal: a feature-complete replica of InsightFlare, open source, deployable as an app on an Every App gateway.

## Outcome

The port is done on the `every-app-port` branch. The plan below is kept as the record of what was weighed. Where the port differs from it:

- **Tenancy** took the simpler alternative. One organization is one team, and roles come from `orgRole`: owners and admins manage, members read. Teams, invites, per-member site restrictions, passwords and sessions are gone. Reports and alerts go to the members the gateway lists as able to open the app now (the `members` capability, `listMembers()`), so people who leave stop receiving them; a local `members` table keeps each person's notification settings from their visits.
- **Agent access** is MCP only. `/api/v1`, API keys, the OpenAPI spec and the skills spec are removed. `src/lib/mcp/tools.ts` defines 15 tools: read, write and destructive (destructive tools are hidden by the gateway). They call the private dashboard API in-process.
- **Retention:** page views and events are kept 396 days by default (configurable), behind each site's hourly rollup watermark. There is no R2 archive.
- **Request Observation** covers only requests the collector blocked, stored in D1 for 30 days with an IP prefix rather than an address. Analytics Engine is gone.
- **Email** goes through the gateway's `sendEmail`. Resend and its settings are gone.
- **External services:** the basemap is OpenFreeMap through a same-origin style relay, link previews are fetched by the Worker, and place-name translations come from a pinned jsDelivr copy of `iso-3166-2-locale`. Browser feature data still comes from `caniuse.ravelloh.com`; only feature names are sent.
- **Removed:** the demo build, the e2e harness, the version-update page, site transfer between teams, and the upstream changelog, screenshots and translated READMEs.
- **Gateway change:** the perimeter now passes `request.cf` to apps (private-every-app PR #339). Without it, location, EU mode, ASN blocking and bot signals are empty.
- **Public surface, 2026-10-24:** `/healthz` left the manifest's `public` list. The section 4 table and the draft manifest below still list it (and `/.well-known/health`) as public for monitors; that was the plan. Every App decided on 2026-10-24 to err on not public and to put per-app health behind gateway identity, so `/healthz` now answers a signed-in member or a personal access token, and the gateway's own `https://<gateway>/health` is the public liveness check.

## Verdict

The port is feasible, and most of the work is in the app, not the platform. InsightFlare already runs on the same stack as Every App apps: TanStack Start, the Cloudflare Vite plugin, and one Worker with a Durable Object, D1, KV and a cron. Every binding it needs is on the gateway's allowlist except Analytics Engine, and the code already tolerates Analytics Engine being absent.

One platform change is required: **the gateway drops `request.cf`** when it proxies to an app. That removes geo, EU mode, ASN blocking and bot signals. Everything else on the gateway works as it is today, or is a limitation we can design around.

The biggest piece of app work is **identity**. InsightFlare has its own users, passwords, teams, invites, sessions and admin pages, and all of it has to sit on gateway identity instead.

The second is **operability**. The README promises 1-year retention, compression and an R2 archive, but none of that exists in the code. `visits` grows without limit toward D1's 10 GB cap, so the port has to add a retention job.

Rough size is 15–25 agent-days, about three weeks of wall-clock time with parallel work. This assumes a hard fork and the decisions below. It is an estimate from reading the code, not from a spike.

## Decisions to make first

1. **Fork strategy.** Upstream is moving fast: about 1,200 commits in 8 months, almost all from one author.
   - **Recommended:** a hard fork from v0.7.1, cherry-picking upstream analytics features by hand. The identity rip-out and the rebrand touch hundreds of files, so regular merges would be painful.
   - **Alternative:** keep upstream names and file layout so merges stay possible. Every change becomes more constrained.
2. **Tenancy.**
   - **Recommended:** keep InsightFlare teams, with team roles and per-member site restrictions, nested under the gateway organization. Add `teams.org_id` and filter by it. That is feature-complete and keeps the hosted first-party option open.
   - **Simpler alternative:** one org is one team, and roles come from `orgRole`. This loses multiple teams per org and per-member site restrictions, so it isn't a replica.
3. **Agent access.** Keep InsightFlare's API keys (`/api/v1`, needed for parity and scripts), and also expose the read operations as gateway MCP tools, so agents connect without copying a key. See "Agent API and MCP".
4. **Retention policy.** Pick the default detail retention (for example 13 months) and decide whether an R2 archive is in v1. See "Data and retention".
5. **App access.** Use `access: "everyone"` and let in-app team roles decide what people see. The manifest default is `admins`.
6. **Target tiers.** Self-hosted gateways first, with one Worker per org. Hosted first-party would work with `org_id` scoping. Hosted third-party (dispatch) can't run this app: it has no crons, KV or R2, and a 5 s CPU limit.

## Platform gaps (gateway changes)

| # | Gap | Impact on the app | Proposed fix | Required? |
|---|---|---|---|---|
| P1 | `request.cf` is dropped. The perimeter rebuilds the request as `new Request(request.url, {method, headers, body})` (`packages/perimeter/src/gateway.ts:495`). | No country, region, city, coordinates, timezone, `isEUCountry`, ASN, colo or bot signals. EU mode (`smart` tracking intensity) and ASN, country and region blocking stop working. The geo dashboards go empty. | Forward `cf` on the service-binding call, then check live that it arrives as `request.cf` in the app. If it doesn't, the gateway should inject a trusted `x-everyapp-cf` JSON header (stripped inbound like other `x-everyapp-*` headers), possibly only for apps that opt in through the manifest. Dispatch never has `cf`, which is one more reason this app targets service-binding tiers. | **Yes** |
| P2 | No custom or second hostname. Policy refuses `domains` and routes, and each app has one hostname. | No first-party tracking domain such as `stats.customer.com`. Customers can still put their own reverse proxy in front of `/script.js` and `/collect`. InsightFlare doesn't document a first-party domain either, so this isn't a parity loss. | None for v1. A later "app aliases" feature would help ad-block resistance. | No |
| P3 | No members API. Apps can't list org users (`app-gateway-entrypoint.ts:280-291`), and the identity token has no display name (`protocol.ts:89-104`). | Member pickers, notification recipients and invites only see users who have already opened the app. | Mirror users as they're seen, the way OpenCRM does. A gateway `GET /api/members` would be better later. | No (workaround) |
| P4 | Analytics Engine is refused (`policy.ts:45-58`). | The admin Request Observation page loses its data source. Nothing else reads Analytics Engine. | Reimplement Request Observation on a sampled D1 table with short retention (see below). Brokering Analytics Engine through the gateway isn't worth it. | No |
| P5 | Cron publishing for app Workers hasn't been checked live (`TODO.md:423`). Neither has Durable Object data surviving a redeploy (`TODO.md:413`). | Rollups, notifications, maintenance and the alarm sweep all run from the cron. | Check both on the first live deploy. | Verify |
| P6 | No edge caching in the gateway. Each `/script.js` load costs a gateway invocation plus an app invocation. | Cost and latency only. The script is `private, no-store` upstream anyway, because the collect token is minted per IP. | None. | No |
| P7 | Email budgets are 100 per address per day self-hosted and 20 on hosted, and hosted refuses app senders. | Notification emails for large teams could hit the cap. | Use gateway `sendEmail` and document the limits. Keep Resend as an optional setting if needed. | No |

Things that work on the gateway as it is today, per the platform audit:
- **IP:** `CF-Connecting-IP` survives (`headers.test.ts:42-53`), so the IP-bound collect token and the visitor hash work.
- **WebSockets:** upgrades pass through. A cookie-authenticated upgrade needs `Origin` equal to the app host, which the dashboard's own socket meets.
- **Public routes:**
  - `:name` and `**` patterns are supported, so `/:locale/share/**` works.
  - A cross-site POST to a public route is downgraded to anonymous rather than refused, so beacons work.
  - Public routes forward `Authorization` (unless it is a gateway token), so `/api/v1` keys work.
- **Bindings:** crons through `everyAppWorker({ crons })`, D1 migrations from a plain SQL dir (`engine: "d1-sql"`), KV, R2 and Durable Objects are all allowed.

## App changes by area

### 1. Build and toolchain

- **New gateway files:**
  - Add `everyapp.config.ts` (the manifest, drafted below).
  - Add `cloudflare.config.ts` using `everyAppWorker({ manifest, entrypoint, ctx, crons: ["*/30 * * * *"], secrets: ["MAIN_SECRET"], compatibilityFlags: ["global_fetch_strictly_public"] })`.
  - Wrap the Worker's default export in `everyApp(handler, { tools })`, keeping the `scheduled` export and the `IngestDurableObject` export.
- **Toolchain:** move from wrangler and `@cloudflare/vite-plugin` 1.55 to `cf` and vite-plugin 2.0 beta, as the template pins them. InsightFlare is on Vite 8 and Start 1.168.49; Vite 8 already works on the platform (RepoLens, and Postiz under vinext).
- **Delete wrangler config:**
  - `wrangler.toml` and `[env.ravelloh]`
  - `wrangler.demo.toml`
  - the Durable Object migration tags `v2`/`v3` (fresh installs only need `IngestDurableObject`)
- **Keep `scripts/build-tracker-sdk.ts`** before `vite build`, because the tracker bundles are generated and gitignored. Wire it into the manifest `build` command.
- **Delete the self-deploy and release machinery:**
  - `prebuild.ts`'s wrangler rewrite and its `d1 migrations apply --remote`
  - `deploy.ts`, `publish.ts`, `ops.ts`, `db.ts`, `preview.ts`, `wrangler-env-overrides.ts`
  - `release.yml`, the release index, and the "InsightFlare Sync" GitHub App flow
  - Upgrades become `git pull` then `everyapp deploy`.
- **Bundle:** `well-known.ts:5` statically imports `docs/openapi.json` (2.1 MB). Serve it as a static asset instead, to stay under the 1 s startup check and the roughly 64 MB heap budget. Measure the built Worker before the first deploy; `scripts/measure-db-bundle.ts` exists for that.

### 2. Bindings and infrastructure

| Upstream | On the gateway |
|---|---|
| `DB` (D1) | `resources.d1: ["DB"]`, migrations through `engine: "d1-sql"`, `dir: "migrations"` |
| `INGEST_DO` | `resources.durableObjects: [{ name: "INGEST_DO", className: "IngestDurableObject" }]` |
| `SITE_SETTINGS_KV` | `resources.kv: ["SITE_SETTINGS_KV"]` |
| `ARCHIVE_BUCKET` (optional; read-only today) | `resources.r2`, but only if we build the archive writer (see "Data and retention") |
| 3 Analytics Engine datasets | Remove. Set `INSIGHTFLARE_ANALYTICS_ENGINE_DISABLED=1`, then delete the writers and their tests. |
| `MAIN_SECRET` | `everyapp secret set MAIN_SECRET`. It still drives the visitor salt, collect tokens, cursors, API key hashes and stored-secret encryption. |
| `BOOTSTRAP_ADMIN_PASSWORD`, `ADMIN_WS_TOKEN`, `PARQUET_WASM_URL`, `INSIGHTFLARE_EDGE_URL` | Delete. Some are identity-only; the others are never read at runtime. |
| Cron `*/30` | `everyAppWorker({ crons })`. The cron runs with no user, so `scheduled()` must not expect a session. |

Migrations: the 43 upstream files include `PRAGMA foreign_keys = OFF` (0008), which D1 ignores, plus triggers. With a hard fork and no existing installs to upgrade, **squash them into one baseline** that `cf d1 migrations apply` runs cleanly. Then add our own migrations on top: `teams.org_id`, the user mirror columns, the retention state, and request observation.

### 3. Identity and tenancy (the largest work item)

**Delete:**
- **Login and password flows:** the login, logout, invite self-registration and reset-password pages and APIs (`/api/public/{session,login-security,account-links/*}`, `src/routes/$locale.{login,invite,reset-password}.tsx`, `src/components/auth/*`).
- **Credentials and anti-bot:** Argon2 hashing, the bootstrap admin (it falls back to the password `"insightflare"`), and Turnstile (config, runtime, settings panel, siteverify).
- **The `if_session` cookie** and all four copies of the session verification code:
  - `src/lib/session.ts`
  - `edge/auth/session-auth.ts`
  - `edge/admin/ws.ts`
  - `edge/auth/legacy-auth.ts`
- **Middleware:** the `/app` → login redirect and the internal Bearer-session profile fetch in `src/middleware.ts`.

**Replace:**
- **Who the request is from:** one `getActor(request, env)` that reads `getEveryAppUser()` and upserts the user mirror. The upsert keys on gateway `id`, refreshes `email` on every request, and stores no password or username.
  - Everything that today calls `requireActor`, `requireSession` or `resolvePrivate*ForSession` uses it.
  - It re-reads roles from the database on each call. Upstream reads `systemRole` from a 30-day cookie, so a demoted admin keeps access; that bug goes away.
- **`system_role`:** org `owner`/`admin` counts as system admin for this deployment. With org-scoped Workers there is no cross-org admin.
- **Teams:** keep teams, `team_members` roles and `site_ids_json` restrictions, and add `org_id`.
- **Invites:** keep invite links for already-signed-in gateway users only. Drop the `allowRegistration` path. Optionally add "add by email" for mirrored users.
- **Users admin page:** becomes a read-only list of mirrored users. Creating users, changing roles and passwords happen in the gateway.
- **Profile page:** keeps display name (stored locally, because the token has none), timezone, locale and notification prefs. Email is read-only, and username and password go.
- **Sign out:** link to the gateway home, as OpenSEO does. The gateway has no sign-out API yet.
- **Realtime WebSocket:** authenticate through the gateway identity on the upgrade instead of `if_session`. The gateway checks identity only at the handshake, so cap socket lifetime at about 15 minutes like OpenSEO does.

**Cookies:** the gateway strips **all inbound `Cookie` headers** for apps. Besides the session, InsightFlare reads three cookies:
- `if_locale`: use the URL locale, plus a stored user preference.
- `insightflare-reporting-time-zone`: move to the user's preference.
- the dashboard query-preferences cookie: move to localStorage or the URL.

**Offboarding:** a user removed from the org can no longer reach the app, but their `team_members` rows and notification emails remain. Prune them lazily: skip or remove members whose mirror row hasn't been seen for N days. Revisit when the gateway has a members API.

**Upstream permission bugs to fix while we're in there:**
- A team admin can add any existing user without that user's consent (`POST /api/private/admin/members`).
- The notification `users` recipient mode doesn't check team membership.
- Site-scoped notifications to `all_team_members` ignore members' site restrictions.

### 4. Public surface and manifest routes

Everything public has to be declared. Methods default to GET only.

| Path | Methods | Notes |
|---|---|---|
| `/script.js` | GET, HEAD | Cross-origin `<script>`. HEAD returns 405 upstream; add it or leave it out. |
| `/collect` | POST, OPTIONS | Upstream sends JSON, so the browser preflights. **Recommended:** switch the tracker to a `text/plain` body (OpenCRM's choice), which avoids preflights, halves invocations, and lets OPTIONS stay private. Keep the echoed `ACAO` and the `Cross-Origin-Resource-Policy: cross-origin` header that Chrome's beacon needs. |
| `/.well-known/{skills.json,openapi.json,security.txt,health}`, `/healthz` | GET, HEAD | Agents and monitors |
| `/api/v1`, `/api/v1/**` | GET, POST, PATCH, DELETE | Bearer API keys reach the app on public routes. Requests without a key are already 401'd by the app. |
| `/:locale/share/**`, `/share/**` | GET | Anonymous share pages |
| `/api/public/share/**` | GET, HEAD | Same-origin share data |
| `/api/public/resources/**` | GET | Map, countries and wiki relays for share pages. Only needed if the share pages render maps. |
| `/assets/**`, favicons, `/site.webmanifest`, `/images/**` | GET | Only if the gateway doesn't already serve app static assets publicly. Check this. |

The share pages need two fixes:
- **SSR self-fetch.** The share loader `loadShareSite` makes a real HTTP request to the app's own public origin from inside the Worker, with a spoofed Chrome user-agent (`fetchEdgeJson`, `src/lib/dashboard-api/client/edge.ts`). Change it to call `apiApp.fetch` in-process, as the middleware already does.
- **Client-side navigation.** Between share tabs, navigation calls `/_serverFn/*`, which the gateway guards and won't serve to an anonymous visitor. Load share data from the public `/api/public/share/*` routes in the browser instead. Don't make `/_serverFn/**` public.

Other public-surface notes:
- **Origin checks keep working.** The app sees the original URL host, so `publicApiGate` and `requireSameOrigin` (which compare against `request.url`) still pass.
- **Framing.** Upstream sends `X-Frame-Options: DENY` and `frame-ancestors 'none'`, and the gateway does the same. The gateway doesn't iframe apps, and embeds exist only in the upstream demo, so nothing is lost.

### 5. Ingest and geo

- **The IP-bound collect token works** because `CF-Connecting-IP` survives the gateway. Add a test that checks the token round-trips through the dev gateway.
- **Geo depends on P1.** Until P1 lands, `record-normalize.ts` can fall back to `CF-IPCountry`, so country-level geo keeps working. Treat that as a stopgap, not the fix.
- **Bot protection** uses `cf.botManagement` (Enterprise only) and `cf.verifiedBotCategory`. Those are absent on most plans anyway; the user-agent, ASN and fetch-metadata signals carry the load. ASN signals need P1.
- **Lost events.** `/collect` hands events to the Durable Object through `ctx.waitUntil`, so an event is lost if the Worker is cut off first. The gateway hop doesn't change that. Leave it as upstream does.

### 6. Data and retention

- **No retention exists.** One `visits` row is written per pageview, with about 55 columns and 8 indexes; rough cost is 1–2 KB per row. A single D1 database (10 GB) fills at roughly 5–10 M pageviews, and nothing deletes old rows.
- **Add a retention task** to the existing scheduled-task dispatcher:
  - Delete `visits` and `custom_events` rows older than N months, in batches.
  - Keep `visit_hourly_rollups` so long-range trends survive. That matches the README's "compressed, viewable but not filterable" promise.
  - Make N configurable per deployment in system settings.
- **R2 archive (the README's "detailed queries older than 1 year"):** only the reader exists, `/api/private/archive/*` plus the `archive_objects` table. Add a writer that exports expired months to `resources.r2` as Parquet before deleting them, or drop the archive feature and its reader. Recommend deferring it to v2 and removing the dead reader for now. Upstream never shipped it, so this doesn't break parity with the running product.
- **Site and team deletion** run one unbatched `DELETE` across all of a site's visits. Batch it, or a large site will time out.

### 7. External services and branding

The upstream app calls the upstream author's own servers at runtime. A self-hosted open-source fork shouldn't depend on them.

| Call | Side | Action |
|---|---|---|
| `maprelay.ravelloh.com` (map style, tiles, fonts, sprites; sends the host and version upstream) | Server | Switch to a public open tile source (for example OpenFreeMap or Protomaps on R2) through `MAP_RELAY_BASE_URL`. |
| `raw.githubusercontent.com` world-countries GeoJSON | Server | Bundle it as a static asset. |
| `locale.ravelloh.com` (place-name translations for non-English locales) | Browser | Bundle the data or host it on our own R2. Without this, translated geo labels regress. |
| `meta.ravelloh.com/?url=<referrer>` | Browser | **Remove.** It sends customers' tracked referrer URLs to a third party. Replace with a server-side fetch of the referrer's metadata, or drop the radar card. |
| `caniuse.ravelloh.com` | Browser | Bundle a caniuse snapshot, or drop the card. |
| `www.wikidata.org` / `*.wikipedia.org` | Server | Keep. Self-hosted gateways don't restrict egress. |
| `api.github.com` and `raw.githubusercontent.com` release checks | Both | Delete, along with the Version Updates page. |
| `api.resend.com` | Server | Replace with gateway `sendEmail` (see "Notifications and email"). |
| `challenges.cloudflare.com` (Turnstile) | Both | Delete with login. |
| `api.cloudflare.com` (Analytics Engine SQL API) | Server | Delete with Analytics Engine. |
| `insight.ravelloh.com/script.js` (upstream's demo tracker) | Browser | Delete with demo mode. |

**Rebrand:**
- Product name.
- `window.insightflare`, `data-insightflare-*`, `__insightflare_*` storage keys.
- `ifk_live_` key prefix, cookie names, `insightflare:*` key-derivation labels.
- **Don't** change the visitor-salt label: that would break visitor continuity.
- Keep RavelloH's MIT copyright notice in `LICENSE`.

### 8. Notifications and email

- **Sending:** swap the Resend client for `sendEmail({ env, for: { background: true }, message })`, and declare `capabilities.email: { access: "write", why }`. That removes the Resend settings panel and its encrypted key.
- **Recipients:** they already resolve to app user rows, which become mirrored gateway users with gateway emails.
- **Limits:** gateway budgets are 100 per address per day self-hosted and 5,000 per gateway. Document them in the notifications UI.
- **No other change needed:** in-app inbox messages are stored in D1 and stay as they are.

### 9. Agent API and MCP

- **Keep `/api/v1` and API keys** for parity. That's 76 operations and 7 scopes; keys are team-owned, site-scopable and HMAC-hashed.
- **Add gateway MCP tools** with `defineTools()`, so agents connected to the gateway reach the analytics with no key to paste. The operation IDs are already tool-shaped:
  - **read** (64 operations): the site and team analytics queries, sites, funnels, goals and settings reads. Group them into a smaller tool set, for example one `query_site_analytics` with a `report` enum, rather than 64 tools.
  - **write**: creating and updating sites, funnels and goals; updating tracking and privacy settings.
  - **destructive**: `sites.delete`, `funnels.delete`, `goals.delete`. The gateway hides destructive tools until approvals exist, which is fine.
  - **`settings.sharing.update`**: mark it destructive or leave it out, because it can make a site's analytics public.
  - Each tool call gets an identity, so tools reuse the same `getActor` and team and site checks as the dashboard.
- **Limits:** 30 s and 1 MB per tool call. Cap the row counts the tools return.
- **`skills.json`:** keep it, rewriting the "create an API key" guidance to mention the MCP option first.

### 10. Admin and system pages

| Page | Action |
|---|---|
| Users | Read-only list of mirrored users. |
| Teams | Keep, scoped to the org. |
| System settings | Drop the Turnstile, Resend and Analytics Engine reader panels. Keep scheduled-task retention, and add analytics retention. |
| Scheduled tasks, System performance | Keep. They are D1-backed. |
| Request Observation | Rebuild on D1: `/collect` writes a sampled row (accepted or blocked, reason, country, ASN, user-agent class) to a `request_observations` table with 7-day retention, and the page queries D1. This keeps parity without Analytics Engine. |
| Version updates | Delete. The gateway CLI owns upgrades. |

### 11. Removals

- **Demo mode:** `src/lib/demo/**` (about 1.4 MB), `wrangler.demo.toml`, `/embeds/landing`, and the demo branches in `server.ts`, `middleware.ts` and `__root.tsx`. That also removes about 53 demo tests.
- **`/ui` gallery**, and npm packing of `packages/ui` and `packages/product-ui`. Keep both packages as workspace libraries.
- **`/__e2e__` control routes:** keep them for our e2e suite, but never declare them public.

### 12. Tests and CI

- **Unit tests:** 418 Vitest files, with coverage thresholds of 95/88/98/96%. The database tests run real SQL on SQLite (`src/lib/db/__tests__/sqlite-d1.ts`), which fits the repo's guidance against mocking query builders. Keep them.
  - Thresholds will drop as auth, demo and Analytics Engine code goes; re-baseline once after the removals.
- **Rewrite tests coupled to removed infrastructure:** Analytics Engine (13 files), the archive (5), demo (about 53), wrangler overrides and the release compare.
- **Playwright e2e:** `scripts/e2e.ts` starts Vite dev with mock GitHub, Resend, Cloudflare and Turnstile servers. Point it at `everyapp dev` instead. That way it runs behind the real perimeter with the seeded `dev-user`, and anonymous visitors via `x-everyapp-dev-anon: 1`.
- **New tests worth having** (behaviour that can actually break in the port):
  - `/script.js` → `/collect` round trip as an anonymous cross-origin visitor through the dev gateway.
  - A share page loaded and navigated anonymously.
  - Actor mapping: an org admin counts as system admin; a member sees only their sites.
  - The retention job keeps rollups.

## Draft manifest

```ts
export default {
  id: "analytics",
  name: "OpenAnalytics",
  description: "Privacy-friendly web analytics for your sites.",
  resources: {
    d1: ["DB"],
    kv: ["SITE_SETTINGS_KV"],
    durableObjects: [{ name: "INGEST_DO", className: "IngestDurableObject" }],
  },
  migrations: { engine: "d1-sql" as const, dir: "migrations", binding: "DB" },
  capabilities: {
    email: { access: "write", why: "Scheduled and conditional analytics reports to team members." },
  },
  access: "everyone",
  public: [
    { path: "/script.js", methods: ["GET", "HEAD"] },
    { path: "/collect", methods: ["POST"] }, // + "OPTIONS" if the tracker keeps JSON bodies
    { path: "/.well-known/**", methods: ["GET", "HEAD"] },
    { path: "/healthz", methods: ["GET", "HEAD"] },
    { path: "/api/v1", methods: ["GET"] },
    { path: "/api/v1/**", methods: ["GET", "POST", "PATCH", "DELETE"] },
    { path: "/share/**", methods: ["GET"] },
    { path: "/:locale/share/**", methods: ["GET"] },
    { path: "/api/public/share/**", methods: ["GET", "HEAD"] },
    { path: "/api/public/resources/**", methods: ["GET"] },
  ],
} as const;
```

This is a sketch. Check the field names against `packages/perimeter/src/manifest/manifest.ts`, and check whether `/.well-known/**` collides with the gateway's own `/.well-known/oauth-protected-resource*` handling.

## Suggested order of work

1. **Gateway: forward `request.cf` (P1)**, with a live check. This is in `private-every-app` and can run in parallel with everything below.
2. **Skeleton on the gateway.** Add the manifest and `cloudflare.config.ts`, switch to the `cf` toolchain, squash migrations, delete Analytics Engine, demo and the self-deploy scripts. Done when `everyapp dev` serves the dashboard behind the dev gateway.
3. **Identity.** Gateway actor and user mirror, `org_id` on teams, delete auth and Turnstile, move cookies to preferences, invites for signed-in users, WebSocket auth.
4. **Public surface.** Declare the manifest routes, switch `/collect` to `text/plain`, fix the share-page in-process loader and client fetches, add tests for the anonymous tracker and share pages.
5. **Externals and rebrand.** Tiles, GeoJSON, place-name data, remove the referrer leak, rename.
6. **Operability.** Retention job, batched deletes, D1-backed Request Observation, email through the gateway.
7. **MCP tools**, and the `skills.json` rewrite.
8. **First live deploy** on a real gateway. Check the cron, Durable Object alarms, `request.cf`, the WebSocket, email, and Durable Object data surviving a redeploy. Measure Worker size and startup time.

Steps 3 and 4 touch overlapping files, so do them in sequence. Steps 5, 6 and 7 can run in parallel after step 4.

## Feature parity checklist

| Feature | Status after the port |
|---|---|
| Pageviews, sessions, visitors, referrers, UTM, pages, devices, browsers, retention, return visits | Kept, unchanged |
| Geo (country, region, city, map) | Kept, **needs P1** (country-only fallback until then) |
| Realtime visitors (WebSocket) | Kept; auth moves to the gateway |
| Custom events, JSON event analysis, funnels, goals, saved filters | Kept |
| Web Vitals / performance | Kept |
| Tracking intensity (EU mode) | Kept, **needs P1** for `isEUCountry` |
| Bot protection and blocking rules (domain, path, query, referrer, UA, IP, ASN, country, region) | Kept; ASN, country and region rules **need P1** |
| Public share links | Kept (loader fix) |
| Teams, roles, per-member site access, invites | Kept, on gateway identity |
| Login, passwords, reset links, Turnstile, user creation | Replaced by the gateway |
| API v1 and API keys | Kept |
| Agent skills (`skills.json`) | Kept, plus gateway MCP tools |
| Notifications (in-app plus email) | Kept; email through the gateway |
| Scheduled tasks and system performance pages | Kept |
| Request Observation | Rebuilt on D1 |
| Multilingual UI and place names | Kept; place-name data self-hosted |
| One-click update (GitHub App), version page | Replaced by `everyapp deploy` |
| Long-term retention, compression, R2 archive | **Not in upstream code.** Retention added; archive deferred |
| Demo mode, UI gallery, marketing embeds | Dropped (not product features) |
