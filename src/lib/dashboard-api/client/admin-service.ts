import {
  adminServicePath,
  type AdminServiceRoute,
} from "@/lib/dashboard-api/contract/admin-service";
import { extractErrorMessage } from "@/lib/response-envelope";

import { fetchEdgeJson } from "./edge";
export type AdminServiceHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export interface AdminServiceClientOptions {
  readonly method?: AdminServiceHttpMethod;
  readonly params?: Record<string, string | number | boolean | undefined>;
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}
interface AdminServiceEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: unknown;
  message?: unknown;
}
function normalizeParams(
  params?: AdminServiceClientOptions["params"],
): Record<string, string | number> | undefined {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, String(value)]],
    ),
  );
}
/**
 * fetchEdgeJson rejects a non-2xx answer with one line: status, method, path
 * and the raw body. When that body is the server's failure envelope, return
 * it so the person reads the server's sentence and not the transport line.
 */
function failedEnvelopeFrom(error: unknown): unknown {
  if (!(error instanceof Error)) return null;
  const match = /^Edge API failed \(\d+ [A-Z]+ [^)]*\): ([\s\S]+)$/.exec(
    error.message,
  );
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[1]);
    return parsed &&
      typeof parsed === "object" &&
      (parsed as { ok?: unknown }).ok === false
      ? parsed
      : null;
  } catch {
    return null;
  }
}
/**
 * Typed client boundary for authenticated management requests. Components do
 * not need to know URL layout, demo dispatch, credentials, or response
 * envelope details. A failure rejects with the server's own message.
 */
export async function requestAdminService<T>(
  route: AdminServiceRoute,
  options: AdminServiceClientOptions = {},
): Promise<T> {
  let response: AdminServiceEnvelope<T>;
  try {
    response = await fetchEdgeJson<AdminServiceEnvelope<T>>({
      method: options.method,
      path: adminServicePath(route),
      params: normalizeParams(options.params),
      body: options.body,
      signal: options.signal,
    });
  } catch (error) {
    const envelope = failedEnvelopeFrom(error);
    if (!envelope) throw error;
    throw new Error(
      extractErrorMessage(envelope, `admin_service_${route}_failed`),
    );
  }
  if (!response.ok) {
    throw new Error(
      extractErrorMessage(response, `admin_service_${route}_failed`),
    );
  }
  return (response.data === undefined ? response : response.data) as T;
}
