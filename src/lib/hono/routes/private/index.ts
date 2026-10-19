import { Hono } from "hono";

import { requireSessionMiddleware } from "@/lib/hono/middleware/session";
import type { AppEnv } from "@/lib/hono/types";

import { privateAdminRoutes } from "./admin";
import { privateNotificationRoutes } from "./notifications";
import { privateQueryRoutes } from "./query";
import { privateRealtimeRoutes } from "./realtime";
import { privateSavedFilterRoutes } from "./saved-filters";
import { privateSessionRoutes } from "./session";

export const privateRoutes = new Hono<AppEnv>();

privateRoutes.use("/*", requireSessionMiddleware());
privateRoutes.route("/session", privateSessionRoutes);
privateRoutes.route("/admin", privateAdminRoutes);
privateRoutes.route("/notifications", privateNotificationRoutes);
privateRoutes.route("/realtime", privateRealtimeRoutes);
privateRoutes.route("/saved-filters", privateSavedFilterRoutes);
privateRoutes.route("/", privateQueryRoutes);
