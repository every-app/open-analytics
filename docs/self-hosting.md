# Self-hosting OpenAnalytics

## How it fits the gateway

Each deployment belongs to one Every App organization. The gateway signs people in and tells the app each person's organization role, so the app has no login page or user management of its own. Roles are managed on the gateway (`everyapp workspace role`, or its members page):

- **Owners and admins** do everything a member can, and add, rename and delete sites; change tracking and blocking settings; turn public sharing on or off; create, edit and delete goals and funnels; manage everyone's report and alert rules; and change System settings.
- **Members** read every site's dashboards (all sites, Overview, Pages, Realtime, Goals & funnels) and keep their own Account settings, saved filters and inbox. Reports and alerts go to the person who creates them, so members create, edit and delete their own.

The app checks the role on every request, so a member's change through the API or an MCP tool is refused (`403`, code `owner_or_admin_required`) as it is in the dashboard.

Only what visitors and share-link viewers need is public:

| Path                                            | Who uses it                                  |
| ----------------------------------------------- | -------------------------------------------- |
| `GET /script.js`, `POST /collect`               | The tracker on your websites                 |
| `GET /share/**`, `GET /:locale/share/**`        | Anyone with a share link                     |
| `GET /api/public/share/**`, `/api/public/resources/**` | Share pages' data and map styles      |
| `GET /assets/**`, `/images/**` and the icons    | Built assets                                 |

Everything else needs a signed-in member of the organization or a personal access token for the app, `GET /healthz` included (it says whether the Worker and its bindings answer). The gateway's own `https://<your gateway domain>/health` is the public liveness check for uptime monitors. The public routes are declared in [`everyapp.config.ts`](../everyapp.config.ts).

## Deploy

You need a running Every App gateway, from a checkout of [every-app/every-app](https://github.com/every-app/every-app) on a Cloudflare account with Workers Paid. Two commands from that checkout put OpenAnalytics on it:

```bash
pnpm everyapp install https://github.com/every-app/open-analytics
pnpm everyapp configure analytics
```

The first installs the latest release, which the Release workflow publishes on every push to the default branch; run it again later to update. The install generates `MAIN_SECRET`, the one key the app needs; the second command walks the optional Email reports feature. No checkout of this repository is needed, and no R2.

To deploy your own changes instead, clone this repository next to the Every App checkout and run that checkout's CLI from this directory: `node ../every-app/packages/cli/bin/everyapp.js deploy` (the CLI installed here runs `dev`, `db migrate` and `release`; a deploy also updates the Gateway, which only a checkout can build).

`MAIN_SECRET` signs pagination cursors. The deploy generates it when it's unset and keeps it after that. To set your own (32 or more random characters): `pnpm everyapp secret set MAIN_SECRET --app analytics`.

Then open `https://analytics.<your gateway domain>`, create a site, and add its tracking snippet to your website.

### Settings

[`everyapp.config.ts`](../everyapp.config.ts) declares what the app needs. The gateway doesn't open the app until its required settings are set; `pnpm everyapp status` shows what is missing, and `pnpm everyapp secret list` in this directory lists each setting. Optional ones are grouped into features (`features` in the manifest), each off until it is set up.

| Setting       | Need     | Where            | Set it with                                                                                                                                                  |
| ------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MAIN_SECRET` | required | the app's Worker | Nothing: the deploy generates it. Or `pnpm everyapp secret set MAIN_SECRET --app analytics`: 32 or more random characters                                    |
| `members`     | required | the gateway      | Nothing: the gateway lists who can open the app                                                                                                              |
| `email`       | optional (Email reports feature) | the gateway      | `pnpm everyapp secret set EMAIL_FROM EMAIL_FROM_NAME` after setting up a sending domain. Without it, reports and alerts stay in the inbox and the app says so |

### Configuration

| Name                       | Meaning                                                | Where                                                          |
| -------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| `SESSION_WINDOW_MINUTES`   | Session window in minutes (default `30`)               | `bindings.text` in `cloudflare.config.ts`                      |
| `SCRIPT_CACHE_TTL_SECONDS` | Cache TTL for `/script.js` (default `600`)             | `bindings.text` in `cloudflare.config.ts`                      |
| `MAP_STYLE_BASE_URL`       | Optional OpenMapTiles style host (default OpenFreeMap) | Not set by default; add it to `cloudflare.config.ts` to use it |

These are plain Worker variables, not secrets: edit `env` in [`cloudflare.config.ts`](../cloudflare.config.ts) and deploy your change with the Every App checkout's CLI, as under [Deploy](#deploy). `MAP_STYLE_BASE_URL` is read by the map style relay (`src/lib/edge/resources/map-relay.ts`); to point at another host, add `MAP_STYLE_BASE_URL: bindings.text("https://…")` next to the other two and redeploy.

**System Settings** shows whether the gateway can send email and can send a test message.

Page views and events are kept for 396 days by default, or forever if you turn on **Keep forever**. The Overview's daily totals and breakdowns, rolled up from them, are kept indefinitely, so its unfiltered numbers cover older days too; filtered views, goals and funnels cover the retained days. Change this in **System Settings**.
