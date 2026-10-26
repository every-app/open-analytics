# OpenAnalytics

Privacy-friendly web analytics that runs as an app on an [Every App](https://github.com/every-app) gateway, entirely on Cloudflare.

OpenAnalytics is a fork of [InsightFlare](https://github.com/RavelloH/InsightFlare) by RavelloH. It keeps InsightFlare's tracker, ingest pipeline and dashboards, and replaces its accounts, teams, API keys and email setup with what the gateway already provides: sign-in, organizations, agent tools and email.

- No cookies and no stored IP addresses. Cloudflare resolves location at the edge.
- A tracker of about 3 KB gzipped, with custom events, user identification and Web Vitals.
- Dashboards for pages, referrers, campaigns, sessions, visitors, events, funnels, goals, retention, location, devices, browsers and performance, with a live view.
- Read-only public share links for any site.
- Scheduled and threshold email notifications sent through the gateway.
- Bot filtering, with a Request Observation page for what was blocked.
- Agent tools, served by the gateway to AI clients at its `/mcp` connector (one address for every app you can open) (a token bound to this app works there too), so your organization's agents can query reports and manage sites. Deleting sites, funnels and goals and public sharing stay in the app.
- Dashboard in English, Chinese (Simplified and Traditional) and Japanese.

## How it fits the gateway

Each deployment belongs to one Every App organization. Everyone in the organization opens the dashboards and manages sites, notification rules and system settings; there is no view-only role. The gateway signs people in, so the app has no login page or user management of its own.

Only what visitors and share-link viewers need is public:

| Path                                            | Who uses it                                  |
| ----------------------------------------------- | -------------------------------------------- |
| `GET /script.js`, `POST /collect`               | The tracker on your websites                 |
| `GET /share/**`, `GET /:locale/share/**`        | Anyone with a share link                     |
| `GET /api/public/share/**`, `/api/public/resources/**` | Share pages' data and map styles      |
| `GET /assets/**`, `/images/**` and the icons    | Built assets                                 |

Everything else needs a signed-in member of the organization or a personal access token for the app, `GET /healthz` included (it says whether the Worker and its bindings answer). The gateway's own `https://<your gateway domain>/health` is the public liveness check for uptime monitors. The public routes are declared in [`everyapp.config.ts`](everyapp.config.ts).

## Deploy

You need a running Every App gateway, from a checkout of [every-app/every-app](https://github.com/every-app/every-app) on a Cloudflare account with Workers Paid. Two commands from that checkout put OpenAnalytics on it:

```bash
pnpm everyapp install https://github.com/every-app/open-analytics
pnpm everyapp configure analytics
```

The first installs the latest release, which the Release workflow publishes on every push to the default branch; run it again later to update. The second asks for `MAIN_SECRET`, the one key the app needs, and then the optional ones. No checkout of this repository is needed, and no R2.

To deploy your own changes instead, clone this repository next to the Every App checkout and run that checkout's CLI from this directory: `node ../every-app/packages/cli/bin/everyapp.js deploy` (the CLI installed here runs `dev`, `db migrate` and `release`; a deploy also updates the Gateway, which only a checkout can build).

`MAIN_SECRET` signs collect tokens and derives visitor hashes: 32 or more random characters, for example `openssl rand -base64 32`. Set it once and keep it stable: changing it splits visitor counts. To set it alone: `pnpm everyapp secret set MAIN_SECRET --app analytics`.

Then open `https://analytics.<your gateway domain>`, create a site, and add its tracking snippet to your website.

### Settings

[`everyapp.config.ts`](everyapp.config.ts) declares what the app needs. The gateway doesn't open the app until its required settings are set; `pnpm everyapp status` shows what is missing, and `pnpm everyapp secret list` in this directory lists each setting as required or optional.

| Setting       | Need     | Where            | Set it with                                                                                                                                                  |
| ------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MAIN_SECRET` | required | the app's Worker | `pnpm everyapp configure analytics` asks for it, or `pnpm everyapp secret set MAIN_SECRET --app analytics`: 32 or more random characters                     |
| `members`     | required | the gateway      | Nothing: the gateway lists who can open the app                                                                                                              |
| `email`       | optional | the gateway      | `pnpm everyapp secret set EMAIL_FROM EMAIL_FROM_NAME` after setting up a sending domain. Without it, reports and alerts stay in the inbox and the app says so |

`MAIN_SECRET` is the name to set; the Worker reads `DAILY_SALT_SECRET` (InsightFlare's name for it) only as a legacy fallback.

### Configuration

| Name                       | Meaning                                                | Where                                                          |
| -------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| `SESSION_WINDOW_MINUTES`   | Session window in minutes (default `30`)               | `bindings.text` in `cloudflare.config.ts`                      |
| `SCRIPT_CACHE_TTL_SECONDS` | Cache TTL for `/script.js` (default `600`)             | `bindings.text` in `cloudflare.config.ts`                      |
| `MAP_STYLE_BASE_URL`       | Optional OpenMapTiles style host (default OpenFreeMap) | Not set by default; add it to `cloudflare.config.ts` to use it |

These are plain Worker variables, not secrets: edit `env` in [`cloudflare.config.ts`](cloudflare.config.ts) and deploy your change with the Every App checkout's CLI, as under [Deploy](#deploy). `MAP_STYLE_BASE_URL` is read by the map style relay (`src/lib/edge/resources/map-relay.ts`); to point at another host, add `MAP_STYLE_BASE_URL: bindings.text("https://…")` next to the other two and redeploy.

**System Settings** shows whether the gateway can send email and can send a test message.

Page views and events are kept for 396 days by default, and hourly totals are kept indefinitely. Change this in **System Settings**.

## Tracking

Add the snippet from a site's **Settings** page:

```html
<script defer src="https://analytics.example.com/script.js?siteId=YOUR_SITE_ID"></script>
```

### Custom events

```js
window.openAnalytics.track("signup_click", { plan: "pro", source: "pricing" });
```

- `track(eventName, eventData?)`: report a custom event.
- `trackOnce(eventName, eventData?)`: report an event name at most once per page.
- `setGlobalProperties(props)` / `clearGlobalProperties()`: add or clear properties on later events.

Or declare them in HTML:

```html
<!-- Click trigger -->
<button data-open-analytics-event="signup_click">Sign up</button>

<!-- Extra fields, one attribute each or as JSON -->
<button
  data-open-analytics-event="signup_click"
  data-open-analytics-event-plan="pro"
  data-open-analytics-event-data='{"source":"pricing"}'
>
  Sign up
</button>

<!-- Form submit trigger -->
<form data-open-analytics-event="contact_submit" data-open-analytics-event-trigger="submit">…</form>
```

### Identifying users

```js
window.openAnalytics.identify("user-123", { name: "Alice" });
```

Call `identify` after sign-in so the visit can be analyzed with that user's other visits. On sign-out or before switching accounts, call `reset()` to start a new anonymous visitor.

## Development

Contributors work from a clone of this repository. It needs Node.js 22.18 or newer and pnpm 10; the Every App SDK and CLI it builds with are the published packages `@every-app/sdk` and `everyapp`, pinned to one exact version in `package.json`, so it installs and runs on its own:

```bash
cp .dev.vars.example .dev.vars
pnpm install
pnpm run dev
```

`pnpm run dev` runs the app behind a local Every App gateway at `http://analytics.localhost:8787`, signed in as a development user.

| Command                 | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm run dev`          | Local gateway and app                                       |
| `pnpm run deploy`       | `everyapp deploy`; see [Deploy](#deploy) for deploying your own changes |
| `pnpm run check`        | Format, lint, translations, typecheck, tests and build      |
| `pnpm run test`         | Unit tests                                                  |
| `pnpm run typecheck`    | TypeScript                                                  |
| `pnpm run check:i18n`   | Translation key completeness                                |
| `pnpm run generate:schema` | Regenerate `docs/schema.sql` and the typed schema from `migrations/` |

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Tech stack

| Layer    | Technologies                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------- |
| Frontend | TanStack Start, TanStack Router, React 19, Vite 8, Tailwind CSS 4, shadcn, Recharts, deck.gl, MapLibre |
| Backend  | Cloudflare Workers, Durable Objects, D1, KV, Hono, the Every App SDK                           |

## License

[MIT](LICENSE). OpenAnalytics is based on InsightFlare, Copyright 2026 RavelloH.
