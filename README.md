# OpenAnalytics

> **Web analytics on your own Cloudflare account. No cookies.**
>
> Add a 3 KB tag to a site and see its pages, referrers, campaigns, funnels and goals, with a live view. It stores no IP addresses; Cloudflare resolves location at the edge.

## Features

- No cookies and no stored IP addresses.
- A 3 KB tracker with custom events, user identification and Web Vitals.
- Dashboards for pages, referrers, campaigns, sessions, funnels, goals, retention and devices, with a live view.
- Read-only public share links for any site.
- Scheduled and threshold email reports.
- Bot filtering, with a page that shows what was blocked.
- MCP tools so your agents can query reports and manage sites.
- English, Chinese and Japanese.

## Install on EveryApp

```bash
pnpm everyapp install https://github.com/every-app/open-analytics
pnpm everyapp configure analytics
```

Needs one secret of its own (32 or more random characters). No API keys, no R2. Details: [everyapp.com/docs/apps/analytics](https://everyapp.com/docs/apps/analytics)

Development: [docs/development.md](docs/development.md). Self-hosting: [docs/self-hosting.md](docs/self-hosting.md). Tracking API: [docs/tracking.md](docs/tracking.md).

## Thanks

OpenAnalytics is a fork of [InsightFlare](https://github.com/RavelloH/InsightFlare) by [RavelloH](https://github.com/RavelloH) (MIT). Thank you for building it. The original copyright and license are kept in [LICENSE](LICENSE).
