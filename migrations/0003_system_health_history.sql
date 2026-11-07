-- Settings > System no longer shows scheduled-task runs, their logs or the
-- blocked-request log, so nothing records them. Blocking itself is unchanged.
DROP TABLE request_observations;
DROP TABLE scheduled_task_run_logs;
DROP TABLE scheduled_task_runs;

-- Scheduled tasks always run. Dropping the flag also restarts a task someone
-- turned off: its next_run_at stayed in the past, so the next tick runs it.
DROP INDEX idx_scheduled_task_schedule_due;
ALTER TABLE scheduled_task_schedule_state DROP COLUMN enabled;

-- Notification messages pointed at the task run that created them.
DROP INDEX idx_notification_messages_run;
ALTER TABLE notification_messages DROP COLUMN run_id;
