import { everyApp, type EveryAppUser } from "@every-app/sdk/server";
import handler from "@tanstack/react-start/server-entry";

import { sweepIngestAlarms } from "@/lib/edge/ingest/alarm-sweep";
import { IngestDurableObject as BaseIngestDurableObject } from "@/lib/edge/ingest/durable-object";
import { instrumentEnv } from "@/lib/edge/observability/bindings";
import {
  createInvocationLogger,
  errorLogData,
  runWithInvocationLogger,
} from "@/lib/edge/observability/logger";
import { dispatchInternalScheduledTasks } from "@/lib/edge/scheduled-tasks/dispatcher";
import type { Env } from "@/lib/edge/types";
import apiApp from "@/lib/hono/app";
import { shouldUseHono } from "@/lib/hono/path-match";
import { resolvePageRequest } from "@/middleware";
export interface AppServerContext {
  env: Env;
  executionCtx: ExecutionContext;
}
declare module "@tanstack/react-router" {
  interface Register {
    server: {
      requestContext: AppServerContext;
    };
  }
}
export class IngestDurableObject extends BaseIngestDurableObject {}
function withPageHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-pathname", pathname);
  // The gateway strips every cookie before a request reaches the app, so
  // nothing set here could be read back (and must not shadow the gateway's).
  headers.delete("set-cookie");
  headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  const connectSources = ["'self'", "https:", "wss:"];
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "script-src-elem 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSources.join(" ")}`,
      "worker-src 'self' blob:",
      "frame-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
function shouldSkipScheduledTasks(env: Env): boolean {
  return env.DISABLE_CRON_TASKS === "1";
}
function isServerFunctionRequest(pathname: string): boolean {
  return pathname === "/_serverFn" || pathname.startsWith("/_serverFn/");
}
function pageRouteForLog(pathname: string): string {
  return isServerFunctionRequest(pathname) ? "server_function" : "page";
}
/**
 * Pages a visitor without a gateway identity may load: share links, the
 * locale redirects in front of them, and the setup error. Everything else
 * the gateway only forwards with a signed-in member (everyapp.config.ts).
 */
function isPublicPage(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return true;
  if (segments[0] === "share") return true;
  return segments[1] === "share" || segments[1] === "runtime-config-error";
}
async function serveRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  user: EveryAppUser | null,
): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  // The tracker, the collector and the API answer for themselves: private
  // API routes check the gateway identity (session-auth.ts).
  if (shouldUseHono(pathname)) {
    return apiApp.fetch(request, env, ctx);
  }
  if (!user && !isPublicPage(pathname)) {
    return new Response("Not found", { status: 404 });
  }

  const logger = createInvocationLogger({
    source: "worker",
    trigger: "request",
  });
  logger.info("request.started");
  const instrumentedEnv = instrumentEnv(env, logger);

  try {
    return await runWithInvocationLogger(logger, async () => {
      // Server functions are protocol requests, not localized page navigations.
      // Let Start see the original /_serverFn path before page middleware can
      // redirect it beneath a locale segment.
      if (isServerFunctionRequest(pathname)) {
        const response = await logger.measure(
          "server_function.handler",
          async () =>
            handler.fetch(request, {
              context: { env: instrumentedEnv, executionCtx: ctx },
            }),
        );
        const result = withPageHeaders(response, pathname);
        logger.setRequest({
          route: pageRouteForLog(pathname),
          method: request.method,
          status: result.status,
          outcome: result.status >= 400 ? "error" : "ok",
        });
        return result;
      }

      const decision = resolvePageRequest(request, env);
      const result = decision.response
        ? withPageHeaders(
            decision.response,
            new URL(decision.response.headers.get("location") || request.url)
              .pathname,
          )
        : withPageHeaders(
            await logger.measure("page.handler", async () =>
              handler.fetch(request, {
                context: { env: instrumentedEnv, executionCtx: ctx },
              }),
            ),
            pathname,
          );
      logger.setRequest({
        route: pageRouteForLog(pathname),
        method: request.method,
        status: result.status,
        outcome: result.status >= 400 ? "error" : "ok",
      });
      return result;
    });
  } catch (error) {
    logger.error("request.unhandled_error", errorLogData(error));
    logger.setRequest({
      route: pageRouteForLog(pathname),
      method: request.method,
      status: 500,
      outcome: "error",
    });
    throw error;
  } finally {
    logger.info("request.completed");
    logger.emit();
  }
}

// everyApp() verifies the identity the Every App gateway signs onto every
// request before any app code runs (`user` is null only on a route
// everyapp.config.ts declares public), and answers the gateway's tool calls.
const app = everyApp<Env>((request, env, ctx, user) =>
  serveRequest(request, env, ctx, user),
);

export default {
  fetch: app.fetch,

  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const logger = createInvocationLogger({
      source: "worker",
      trigger: "alarm",
    });
    logger.info("scheduled.started");
    const instrumentedEnv = instrumentEnv(env, logger);
    if (shouldSkipScheduledTasks(env)) {
      logger.info("scheduled.skipped");
      logger.emit();
      return;
    }
    ctx.waitUntil(
      runWithInvocationLogger(logger, () =>
        Promise.all([
          dispatchInternalScheduledTasks(
            instrumentedEnv,
            controller.scheduledTime,
            logger,
          ),
          sweepIngestAlarms(instrumentedEnv, logger),
        ])
          .then(() => logger.info("scheduled.completed"))
          .catch((error) => {
            void error;
            logger.error("scheduled.failed");
            throw error;
          })
          .finally(() => logger.emit()),
      ),
    );
  },
};
