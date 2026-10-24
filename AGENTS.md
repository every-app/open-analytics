# Agent guidance

OpenAnalytics runs as an app on an Every App gateway. The platform is linked by path: clone `every-app/private-every-app` next to this repository and run `pnpm install` there before `pnpm install` here (README, [Deploy](README.md#deploy)). The everyapp skill lives in that checkout at `packages/cli/skills/everyapp/SKILL.md`; read it before running any `everyapp` command.

- Run with `pnpm run dev` (`everyapp dev`): the app behind a local gateway at `http://analytics.localhost:8787`, signed in as a development user. Copy `.dev.vars.example` to `.dev.vars` first; it sets `MAIN_SECRET` for local runs.
- Deploy only with `pnpm run deploy` (`everyapp deploy`), never `wrangler deploy` or `cf deploy`. `cloudflare.config.ts` builds the Worker from `everyapp.config.ts`, and only `everyapp deploy` provisions D1, KV and the Durable Object, migrates and registers the app with the gateway.
- Resources, secrets, capabilities and the public routes are declared in `everyapp.config.ts`. A new secret is listed there first, then set after a deploy with `pnpm everyapp secret set <NAME>` from this directory. Plain settings (`SESSION_WINDOW_MINUTES`, `SCRIPT_CACHE_TTL_SECONDS`) are `bindings.text` values in `cloudflare.config.ts`.
- Migrations are hand-written SQL under `migrations/` (`migrations.engine` is `"d1-sql"`), applied by `everyapp deploy` and locally by `pnpm everyapp db migrate`. There is no `db:generate`. After adding one, run `pnpm run generate:schema` to refresh `docs/schema.sql` and the typed schema.
- Before a pull request, run `pnpm run check` (format, lint, translations, typecheck, tests and build). See [CONTRIBUTING.md](CONTRIBUTING.md).
- `docs/every-app-port-audit.md` is the pre-port plan, kept as history; it does not describe the app as it is.
