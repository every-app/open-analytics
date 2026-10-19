import { Hono } from "hono";

import { apiNoCacheMiddleware } from "./middleware/api-cache";
import { handleHonoError } from "./middleware/error-boundary";
import { observabilityMiddleware } from "./middleware/observability";
import { requestIdMiddleware } from "./middleware/request-id";
import { collectRoutes } from "./routes/collect";
import { healthRoutes } from "./routes/health";
import { privateRoutes } from "./routes/private";
import { publicRoutes } from "./routes/public";
import { scriptRoutes } from "./routes/tracker-script";
import type { AppEnv } from "./types";

export const apiApp = new Hono<AppEnv>();

apiApp.onError(handleHonoError);
apiApp.use("*", requestIdMiddleware());
apiApp.use("*", observabilityMiddleware());
apiApp.use("*", apiNoCacheMiddleware());

apiApp.route("/", healthRoutes);
apiApp.route("/", collectRoutes);
apiApp.route("/", scriptRoutes);
apiApp.route("/api/private", privateRoutes);
apiApp.route("/api/public", publicRoutes);

export default apiApp;
