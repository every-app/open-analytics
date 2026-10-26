# Contributing to OpenAnalytics

Thanks for taking the time to improve OpenAnalytics.

This project is still early, so the most useful contributions are focused bug fixes, tests, documentation improvements, and small feature changes that are easy to review.

## Development Setup

OpenAnalytics uses Node.js 22.18 or newer and pnpm 10. The Every App SDK and CLI are published packages pinned in `package.json`, so a clone of this repository installs on its own (see the README's [Development](README.md#development) section).

```bash
pnpm install --frozen-lockfile
pnpm run dev
```

`pnpm run dev` starts the app behind a local Every App gateway at `http://analytics.localhost:8787`, signed in as a development user. Copy the example environment file first:

```bash
cp .dev.vars.example .dev.vars
```

`MAIN_SECRET` signs collect tokens and derives visitor hashes.

## Quality Checks

Before opening a pull request, run:

```bash
pnpm run check
```

This runs the core checks:

- TypeScript type checking
- ESLint
- Prettier format check
- i18n key validation
- Vitest tests

For build-related changes, also build the bundle:

```bash
pnpm exec vite build --mode development
```

## Pull Requests

Keep pull requests small and focused. A good PR should include:

- A clear description of the problem and solution
- Tests for behavioral changes when practical
- Documentation updates for user-facing behavior
- Screenshots or recordings for UI changes when useful

Avoid mixing unrelated refactors with feature or bug-fix changes.

## Tests

Tests are written with Vitest. Prefer colocated tests under `__tests__` directories near the code being tested.

```bash
pnpm run test
pnpm run test:coverage
```

## Documentation

User-facing behavior should be documented in the README or project docs when it affects installation, deployment, configuration, privacy behavior, MCP tools, or tracking behavior.

## Security Issues

Do not open public issues for security vulnerabilities. Follow the reporting process in [SECURITY.md](SECURITY.md).
