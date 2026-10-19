import path from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { parse } from "yaml";

// Vite watches the project root. Keep generated state, reports, and repository
// metadata out of chokidar so Cloudflare/TanStack SSR restarts do not traverse
// large local databases and historical test output.
const DEV_WATCH_IGNORED = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.wrangler/**",
  "**/.cloudflare/**",
  "**/.everyapp/**",
  "**/.pnpm-store/**",
  "**/.cache/**",
  "**/.tanstack/**",
  "**/.tmp/**",
  "**/tmp/**",
  "**/coverage/**",
  "**/coverage-resource/**",
  "**/logs/**",
  "**/test-results/**",
  "**/playwright-report/**",
  "**/dist/**",
  "**/plan/**",
  "**/.agents/**",
  "**/.claude/**",
  "**/.github/**",
  "**/.husky/**",
  "**/.vscode/**",
  "**/changelog/**",
  "**/docs/**",
  "**/migrations/**",
];

function ssrMapStubs() {
  const stubPath = path.resolve(
    import.meta.dirname,
    "./src/lib/ssr-map-stubs.tsx",
  );
  const maplibreWorkerSetupPath = path
    .resolve(import.meta.dirname, "./src/lib/dashboard/maplibre-worker")
    .replaceAll("\\", "/");
  const stubs = new Set([
    "react-map-gl/maplibre",
    "@deck.gl/layers",
    "@deck.gl/mapbox",
    "@/lib/dashboard/maplibre-worker",
  ]);

  return {
    name: "insightflare:ssr-map-stubs",
    enforce: "pre" as const,
    resolveId(
      source: string,
      _importer: string | undefined,
      options: { ssr?: boolean },
    ) {
      const normalizedSource = source.replaceAll("\\", "/");
      if (
        options.ssr &&
        (stubs.has(source) ||
          normalizedSource === maplibreWorkerSetupPath ||
          normalizedSource === `${maplibreWorkerSetupPath}.ts`)
      ) {
        return stubPath;
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    // Source maps for the Worker bundle only: "hidden" leaves no
    // sourceMappingURL and keeps maps out of the public assets.
    environments: {
      ssr: { build: { sourcemap: "hidden" as const } },
    },
    plugins: [
      {
        name: "yaml-as-json",
        transform(code: string, id: string) {
          if (!/\.ya?ml$/.test(id)) return null;
          return {
            code: `export default ${JSON.stringify(parse(code))};`,
            map: null,
          };
        },
      },
      ssrMapStubs(),
      // Reads cloudflare.config.ts. Local dev never touches remote resources.
      cloudflare({
        inspectorPort: false,
        viteEnvironment: { name: "ssr" },
        remoteBindings: false,
      }),
      tanstackStart(),
      react(),
      tailwindcss(),
    ],
    server: {
      // `everyapp dev` passes the port in PORT and puts its gateway in front.
      host: "127.0.0.1",
      port: Number(process.env.PORT ?? 3000),
      strictPort: true,
      watch: {
        ignored: DEV_WATCH_IGNORED,
      },
    },
  };
});
