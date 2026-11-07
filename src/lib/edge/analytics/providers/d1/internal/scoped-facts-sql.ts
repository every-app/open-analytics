interface ScopedFactsSqlOptions {
  readonly visitsRelation: string;
  readonly eventsRelation: string;
}

/**
 * Shared session fact relations used by scoped filtering.  The raw relations
 * are already site- and time-window constrained, so keeping the aggregation
 * here makes the fact predicates use the same duration/views/events/bounce
 * semantics as the funnel and filter session scope.
 */
export function buildSessionFactsSql(options: ScopedFactsSqlOptions): string {
  const visits = options.visitsRelation;
  const events = options.eventsRelation;
  return `
scope_session_visit_facts AS (
  SELECT
    site_pk,
    site_id,
    session_id,
    SUM(COALESCE(duration_ms, 0)) AS session_duration_ms,
    COUNT(*) AS session_views
  FROM ${visits}
  WHERE TRIM(COALESCE(session_id, '')) != ''
  GROUP BY site_pk, site_id, session_id
),
scope_session_event_facts AS (
  SELECT site_pk, site_id, session_id, COUNT(*) AS session_events
  FROM ${events}
  WHERE TRIM(COALESCE(session_id, '')) != ''
  GROUP BY site_pk, site_id, session_id
),
scope_session_facts AS (
  SELECT
    entities.site_pk,
    entities.site_id,
    entities.session_id,
    COALESCE(visit_facts.session_duration_ms, 0) AS session_duration_ms,
    COALESCE(visit_facts.session_views, 0) AS session_views,
    COALESCE(event_facts.session_events, 0) AS session_events,
    CASE WHEN COALESCE(visit_facts.session_views, 0) = 1 THEN 1 ELSE 0 END AS session_bounce
  FROM (
    SELECT DISTINCT site_pk, site_id, session_id
    FROM ${visits}
    WHERE TRIM(COALESCE(session_id, '')) != ''
    UNION
    SELECT DISTINCT site_pk, site_id, session_id
    FROM ${events}
    WHERE TRIM(COALESCE(session_id, '')) != ''
  ) entities
  LEFT JOIN scope_session_visit_facts visit_facts
    ON visit_facts.site_pk = entities.site_pk
   AND visit_facts.site_id = entities.site_id
   AND visit_facts.session_id = entities.session_id
  LEFT JOIN scope_session_event_facts event_facts
    ON event_facts.site_pk = entities.site_pk
   AND event_facts.site_id = entities.site_id
   AND event_facts.session_id = entities.session_id
)`;
}

/**
 * Shared visitor facts for scoped membership.  Visitor sessions include
 * sessions represented only by an in-window event, matching the existing
 * event-only journey expansion.
 */
export function buildVisitorFactsSql(options: ScopedFactsSqlOptions): string {
  const visits = options.visitsRelation;
  const events = options.eventsRelation;
  return `
scope_visitor_visit_facts AS (
  SELECT site_pk, site_id, visitor_id, COUNT(*) AS visitor_views
  FROM ${visits}
  WHERE TRIM(COALESCE(visitor_id, '')) != ''
  GROUP BY site_pk, site_id, visitor_id
),
scope_visitor_event_facts AS (
  SELECT site_pk, site_id, visitor_id, COUNT(*) AS visitor_events
  FROM ${events}
  WHERE TRIM(COALESCE(visitor_id, '')) != ''
  GROUP BY site_pk, site_id, visitor_id
),
scope_visitor_session_facts AS (
  SELECT site_pk, site_id, visitor_id, COUNT(DISTINCT session_id) AS visitor_sessions
  FROM (
    SELECT site_pk, site_id, visitor_id, session_id
    FROM ${visits}
    WHERE TRIM(COALESCE(visitor_id, '')) != ''
      AND TRIM(COALESCE(session_id, '')) != ''
    UNION
    SELECT site_pk, site_id, visitor_id, session_id
    FROM ${events}
    WHERE TRIM(COALESCE(visitor_id, '')) != ''
      AND TRIM(COALESCE(session_id, '')) != ''
  ) sessions
  GROUP BY site_pk, site_id, visitor_id
),
scope_visitor_facts AS (
  SELECT
    entities.site_pk,
    entities.site_id,
    entities.visitor_id,
    COALESCE(session_facts.visitor_sessions, 0) AS visitor_sessions,
    COALESCE(visit_facts.visitor_views, 0) AS visitor_views,
    COALESCE(event_facts.visitor_events, 0) AS visitor_events
  FROM (
    SELECT DISTINCT site_pk, site_id, visitor_id
    FROM ${visits}
    WHERE TRIM(COALESCE(visitor_id, '')) != ''
    UNION
    SELECT DISTINCT site_pk, site_id, visitor_id
    FROM ${events}
    WHERE TRIM(COALESCE(visitor_id, '')) != ''
  ) entities
  LEFT JOIN scope_visitor_session_facts session_facts
    ON session_facts.site_pk = entities.site_pk
   AND session_facts.site_id = entities.site_id
   AND session_facts.visitor_id = entities.visitor_id
  LEFT JOIN scope_visitor_visit_facts visit_facts
    ON visit_facts.site_pk = entities.site_pk
   AND visit_facts.site_id = entities.site_id
   AND visit_facts.visitor_id = entities.visitor_id
  LEFT JOIN scope_visitor_event_facts event_facts
    ON event_facts.site_pk = entities.site_pk
   AND event_facts.site_id = entities.site_id
   AND event_facts.visitor_id = entities.visitor_id
)`;
}
