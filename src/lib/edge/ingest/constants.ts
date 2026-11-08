import { MAX_CLIENT_EVENT_LAG_MS } from "./normalize";

/** A session ends after 30 minutes without a page view, as in Plausible. */
export const SESSION_WINDOW_MS = 30 * 60 * 1000;
/** How far back the realtime view lists what happened. */
export const RECENT_EVENT_RETENTION_MS = 30 * 60 * 1000;
export const HIDDEN_LEAVE_GRACE_MS = 30 * 60 * 1000;
export const ACTIVE_NOW_WINDOW_MS = 5 * 60 * 1000;
export const VISIT_TIMEOUT_MS = 12 * 60 * 60 * 1000;
export const ORPHAN_CUSTOM_EVENT_TIMEOUT_MS = VISIT_TIMEOUT_MS;
export const WS_PRESENCE_LEAVE_EVENT = "__presence_leave";
/**
 * How long a change waits in the buffer before the alarm writes it to D1,
 * with everything else that changed meanwhile.
 */
export const D1_FLUSH_INTERVAL_MS = 60 * 1000;
/** Page views written to D1 in one batch. */
export const D1_FLUSH_BATCH_SIZE = 100;
/**
 * How long a finished page view stays in the buffer: the session window,
 * plus the most a page view's start may lag its arrival. A page view that
 * can still join a session finds the session's page views here, so ingest
 * never asks D1 for them.
 */
export const FLUSHED_BUFFER_RETENTION_MS =
  SESSION_WINDOW_MS + MAX_CLIENT_EVENT_LAG_MS;
