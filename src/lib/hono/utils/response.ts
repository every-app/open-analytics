import { errorResponse } from "@/lib/response";

/**
 * A 500 that names no internals: the error itself goes to the logs
 * (error-boundary.ts), since public routes answer anonymous callers too.
 */
export function internalServerError(request: Request): Response {
  return errorResponse(
    request,
    500,
    "internal_server_error",
    "Internal Server Error",
  );
}
