import { cpus as osCpus } from "node:os";

import path from "path";
import { defineConfig } from "vitest/config";
import { parse } from "yaml";

// Keep the test pool bounded on high-core machines.  V8 coverage writes one
// temporary file per worker; an unbounded pool makes that merge flaky under
// the full check and can also starve the integration tests of CPU.
const VITEST_MAX_WORKERS = Math.min(16, Math.max(1, osCpus().length));

export default defineConfig({
  plugins: [
    {
      name: "yaml-as-json",
      transform(code, id) {
        if (!/\.ya?ml$/.test(id)) return null;
        return {
          code: `export default ${JSON.stringify(parse(code))};`,
          map: null,
        };
      },
    },
  ],
  oxc: false,
  esbuild: {
    jsx: "automatic",
  },
  define: {
    BUILD_PERFORMANCE: true,
  },
  test: {
    environment: "happy-dom",
    environmentOptions: {
      happyDOM: {
        // Keep URL parsing deterministic across local and Linux CI runs. Without
        // an explicit origin, happy-dom may start at about:blank, whose pathname
        // is "blank" and makes history.replaceState-based browser tests flaky.
        url: "http://localhost:3000/",
      },
    },
    globals: true,
    pool: "threads",
    maxWorkers: VITEST_MAX_WORKERS,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "cloudflare:workers": path.resolve(
        __dirname,
        "./src/test/shims/cloudflare-workers.ts",
      ),
      "cloudflare:node": path.resolve(
        __dirname,
        "./src/test/shims/cloudflare-node.ts",
      ),
    },
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.cache/**",
      "**/.tmp/**",
      "**/e2e/**",
    ],
    coverage: {
      // Lowered when the port removed the API v1, demo and e2e suites, which
      // also exercised shared analytics code.
      thresholds: {
        statements: 93,
        branches: 87,
        functions: 96,
        lines: 95,
      },
      include: [
        // The default project measures server/business logic only. UI route
        // modules and the browser SDK are measured by separate coverage
        // projects so their execution model does not distort this aggregate.
        "src/components/dashboard/**/*.ts",
        "src/hooks/**/*.ts",
        "src/lib/**/*.ts",
        "src/schemas/**/*.ts",
        "src/middleware.ts",
      ],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/__tests__/**",
        // Reserve React route/component coverage for a separate UI project;
        // keep browser rendering out of the server/business aggregate.
        "src/routes/**",
        "src/components/**/*.tsx",
        "src/app/.well-known/**",
        "src/**/types.ts",
        "src/**/*types*.ts",
        "src/**/core.ts",
        "src/**/technology.ts",
        "src/**/fact-builder.ts",
        "src/**/analytics.ts",
        "src/**/management.ts",
        "src/lib/i18n/messages.ts",
        "src/tracker/*.min.ts",
        "src/tracker/sdk.no-perf.min.ts",
        "src/lib/dashboard-api/contract/types/**",
        "src/lib/edge/ingest/flush-types.ts",
        "src/lib/edge/ingest/types.ts",
        "src/lib/system-performance.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "cloudflare:workers": path.resolve(
        __dirname,
        "./src/test/shims/cloudflare-workers.ts",
      ),
      "cloudflare:node": path.resolve(
        __dirname,
        "./src/test/shims/cloudflare-node.ts",
      ),
    },
  },
});
