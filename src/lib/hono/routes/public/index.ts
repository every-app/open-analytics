import { Hono } from "hono";

import { publicApiGate } from "@/lib/hono/middleware/public-api-gate";
import type { AppEnv } from "@/lib/hono/types";

import { publicQueryRoutes } from "./query";
import { publicResourceRoutes } from "./resources";

export const publicRoutes = new Hono<AppEnv>();

publicRoutes.use("/share/*", publicApiGate());
publicRoutes.route("/share", publicQueryRoutes);
publicRoutes.use("/resources/*", publicApiGate({ allowImageDest: true }));
publicRoutes.route("/resources", publicResourceRoutes);
