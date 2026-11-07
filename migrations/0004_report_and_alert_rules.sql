-- Notification rules come down to two, as Plausible has them: a weekly or
-- monthly report and a traffic spike or drop alert, each for one site and
-- sent to the member who created it.

-- Milestone, threshold, health and test rules are gone, and so is a rule
-- without a site. Their past messages go too, so no inbox holds a kind of
-- message the app no longer shows.
DELETE FROM notification_rules
WHERE type NOT IN ('report', 'change') OR site_id IS NULL;
DELETE FROM notification_messages
WHERE type NOT IN ('report', 'change');

-- A report on a removed schedule moves to the nearest kept one at the same
-- time and in the same time zone: interval and daily become weekly on
-- Mondays, quarterly and yearly become monthly on the same day of the month.
-- SQLite has no time zones, so its next run is left empty: the next
-- notification tick schedules it in the rule's own zone without sending
-- (scheduleUnscheduledReports). The report period now follows the schedule,
-- so the condition empties.
UPDATE notification_rules
SET next_run_at = NULL
WHERE type = 'report'
  AND COALESCE(json_extract(schedule_json, '$.kind'), '')
    NOT IN ('weekly', 'monthly');

UPDATE notification_rules
SET
  schedule_json = CASE
    WHEN json_extract(schedule_json, '$.kind') IN ('monthly', 'quarterly', 'yearly')
      THEN json_object(
        'kind', 'monthly',
        'dayOfMonth', COALESCE(json_extract(schedule_json, '$.dayOfMonth'), 1),
        'time', COALESCE(json_extract(schedule_json, '$.time'), '08:00'),
        'timezone', COALESCE(json_extract(schedule_json, '$.timezone'), 'UTC'))
    ELSE json_object(
      'kind', 'weekly',
      'dayOfWeek', CASE
        WHEN json_extract(schedule_json, '$.kind') = 'weekly'
          THEN COALESCE(json_extract(schedule_json, '$.dayOfWeek'), 1)
        ELSE 1
      END,
      'time', COALESCE(json_extract(schedule_json, '$.time'), '08:00'),
      'timezone', COALESCE(json_extract(schedule_json, '$.timezone'), 'UTC'))
  END,
  condition_json = '{}'
WHERE type = 'report';

-- An alert compares visitors with the window before, in the last hour or the
-- last 24 hours (yesterday becomes the last 24 hours), and fires on a rise
-- (spike) or a fall (drop) of at least a percentage. It keeps its first
-- condition: a fall when that condition was below (< or <=), else a rise.
-- A percentage change keeps its size; an absolute one becomes 50%. Alerts
-- have no schedule: every notification tick checks them. A cooldown the
-- member chose becomes the fixed 12-hour quiet period after the last alert.
UPDATE notification_rules
SET
  condition_json = (
    WITH first(item) AS (
      SELECT COALESCE(
        json_extract(condition_json, '$.all[0]'),
        json_extract(condition_json, '$.any[0]'),
        json_extract(condition_json, '$.conditions[0]'),
        condition_json)
    )
    SELECT json_object(
      'direction', CASE
        WHEN json_extract(item, '$.operator') IN ('<', '<=') THEN 'drop'
        ELSE 'spike'
      END,
      'window', CASE
        WHEN json_extract(item, '$.window') = 'last_1h' THEN 'last_1h'
        ELSE 'last_24h'
      END,
      'percent', CASE
        WHEN json_extract(item, '$.mode') = 'percent'
          AND abs(json_extract(item, '$.value')) >= 1
          AND abs(json_extract(item, '$.value')) <= 1000
          THEN CAST(abs(json_extract(item, '$.value')) AS INTEGER)
        ELSE 50
      END)
    FROM first
  ),
  schedule_json = '{}',
  next_run_at = unixepoch(),
  cooldown_until = CASE
    WHEN last_triggered_at IS NULL THEN NULL
    ELSE last_triggered_at + 43200
  END
WHERE type = 'change';

-- Recipients, rule state and descriptions are gone: a rule goes to its
-- creator, keeps no state between checks and has only a name.
ALTER TABLE notification_rules DROP COLUMN recipient_json;
ALTER TABLE notification_rules DROP COLUMN state_json;
ALTER TABLE notification_rules DROP COLUMN description;
