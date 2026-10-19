import type { EdgeSessionClaims } from "@/lib/edge/auth/session-auth";
import type { InvocationLogger } from "@/lib/edge/observability/logger";
import type { Env as EdgeEnv } from "@/lib/edge/types";

export type HonoBindings = EdgeEnv;

export interface HonoSite {
  id: string;
  name?: string;
  domain?: string;
  canManage?: boolean;
}

export interface HonoPublicSite extends HonoSite {
  slug?: string;
}

export type HonoVariables = {
  requestId: string;
  observabilityLogger?: InvocationLogger;
  requestUrl?: URL;
  session?: EdgeSessionClaims;
  privateSite?: HonoSite;
  site?: HonoSite;
  publicSite?: HonoPublicSite;
};

export type AppEnv = {
  Bindings: HonoBindings;
  Variables: HonoVariables;
};
