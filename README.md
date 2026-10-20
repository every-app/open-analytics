# OpenAnalytics

Privacy-friendly web analytics that runs as an app on an [Every App](https://github.com/every-app) gateway, entirely on Cloudflare.

OpenAnalytics is a fork of [InsightFlare](https://github.com/RavelloH/InsightFlare) by RavelloH. It keeps InsightFlare's tracker, ingest pipeline and dashboards, and replaces its accounts, teams, API keys and email setup with what the gateway already provides: sign-in, organizations, agent tools and email.

- No cookies and no stored IP addresses. Cloudflare resolves location at the edge.
- A tracker of about 3 KB gzipped, with custom events, user identification and Web Vitals.
- Dashboards for pages, referrers, campaigns, sessions, visitors, events, funnels, goals, retention, location, devices, browsers and performance, with a live view.
- Read-only public share links for any site.
- Scheduled and threshold email notifications sent through the gateway.
- Bot filtering, with a Request Observation page for what was blocked.
- Agent tools served at `/mcp`, so your organization's agents can query reports and manage sites.
- Dashboard in English, Chinese (Simplified and Traditional) and Japanese.

## How it fits the gateway

Each deployment belongs to one Every App organization. Every member can open the dashboards; owners and admins create and configure sites, notification rules and system settings. The gateway signs people in, so the app has no login page or user management of its own.

Only what visitors and share-link viewers need is public:

| Path                                            | Who uses it                                  |
| ----------------------------------------------- | -------------------------------------------- |
| `GET /script.js`, `POST /collect`               | The tracker on your websites                 |
| `GET /share/**`, `GET /:locale/share/**`        | Anyone with a share link                     |
| `GET /api/public/share/**`, `/api/public/resources/**` | Share pages' data and map styles      |
| `GET /assets/**`, `/images/**` and the icons    | Built assets                                 |
| `GET /healthz`                                  | Uptime checks                                |

Everything else needs a signed-in member of the organization. The public routes are declared in [`everyapp.config.ts`](everyapp.config.ts).

## Deploy

You need a running Every App gateway, Node.js 24 and pnpm 10.

```bash
pnpm install
pnpm run deploy                          # everyapp deploy: builds, provisions D1, KV and the Durable Object, migrates, registers
pnpm exec everyapp secret set MAIN_SECRET
```

`MAIN_SECRET` signs collect tokens and derives visitor hashes. Use a long random value and keep it stable: changing it splits visitor counts.

Then open `https://analytics.<your gateway domain>`, create a site, and add its tracking snippet to your website.

### Configuration

| Name                       | Meaning                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `MAIN_SECRET` (secret)     | Root secret for collect tokens and visitor hashes                        |
| `SESSION_WINDOW_MINUTES`   | Session window in minutes (default `30`)                                 |
| `SCRIPT_CACHE_TTL_SECONDS` | Cache TTL for `/script.js` (default `600`)                               |
| `MAP_STYLE_BASE_URL`       | Optional OpenMapTiles style host (default OpenFreeMap)                   |

Email notifications need the gateway's email integration. **System Settings** shows whether it is ready and can send a test message.

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

```bash
cp .dev.vars.example .dev.vars
pnpm install
pnpm run dev
```

`pnpm run dev` runs the app behind a local Every App gateway at `http://analytics.localhost:8787`, signed in as a development user.

| Command                 | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm run dev`          | Local gateway and app                                       |
| `pnpm run deploy`       | Build and deploy to your gateway                            |
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
