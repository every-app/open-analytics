import "@tanstack/react-start/server-only";

import { getRequest } from "@tanstack/react-start/server";

import type { PublicSiteData } from "@/lib/dashboard-api/client/edge";
import { readSiteHasData } from "@/lib/edge/admin/setup/get-started";
import { fetchPublicSite } from "@/lib/edge/auth/site-access";
import { resolveEdgeRuntime } from "@/lib/edge/runtime";

/** The shared site behind a public link, read in-process while rendering. */
export async function readShareSite(
  slug: string,
): Promise<PublicSiteData | null> {
  const runtime = await resolveEdgeRuntime(getRequest());
  const site = await fetchPublicSite(
    runtime.env,
    new URL(`/share/${encodeURIComponent(slug)}`, runtime.url),
  );
  if (site instanceof Response) return null;
  return {
    id: site.id,
    slug,
    name: site.name,
    domain: site.domain,
    hasData: await readSiteHasData(runtime.env, site.id),
  };
}
