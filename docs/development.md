# Developing OpenAnalytics

Contributors work from a clone of this repository. It needs Node.js 22.18 or newer and pnpm 10; the Every App SDK and CLI it builds with are the published packages `@every-app/sdk` and `everyapp`, pinned to one exact version in `package.json`, so it installs and runs on its own:

```bash
cp .dev.vars.example .dev.vars
pnpm install
pnpm run dev
```

`pnpm run dev` runs the app behind a local Every App gateway at `http://analytics.localhost:8787`, signed in as a development user who owns the dev organization.

To use the app as a member (read-only dashboards, their own rules), call the app port the ready block prints (`App port`) with a member identity; the local gateway always signs in its owner. In a browser, send the same header on every request (Playwright's `extraHTTPHeaders`, for one).

```bash
curl -H "x-everyapp-identity: $(pnpm everyapp dev token --role member)" \
  http://127.0.0.1:<app port>/api/private/session
```

| Command                 | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `pnpm run dev`          | Local gateway and app                                       |
| `pnpm run deploy`       | `everyapp deploy`; see [self-hosting.md](self-hosting.md#deploy) for deploying your own changes |
| `pnpm run check`        | Format, lint, translations, typecheck, tests and build      |
| `pnpm run test`         | Unit tests                                                  |
| `pnpm run typecheck`    | TypeScript                                                  |
| `pnpm run check:i18n`   | Message keys used in code exist in `src/i18n/en.yaml`       |
| `pnpm run generate:schema` | Regenerate `docs/schema.sql` and the typed schema from `migrations/` |

See [CONTRIBUTING.md](../CONTRIBUTING.md) before opening a pull request.

## Tech stack

| Layer    | Technologies                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------- |
| Frontend | TanStack Start, TanStack Router, React 19, Vite 8, Tailwind CSS 4, shadcn, Recharts, deck.gl, MapLibre |
| Backend  | Cloudflare Workers, Durable Objects, D1, KV, Hono, the Every App SDK                           |
