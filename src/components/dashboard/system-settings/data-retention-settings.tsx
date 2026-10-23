import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@insightflare/ui/alert-dialog";
import { Input } from "@insightflare/ui/input";
import { toast } from "sonner";

import { LabelWithInfo } from "@/components/settings/info-tooltip";
import { SaveButton } from "@/components/settings/save-button";
import {
  SettingsCard,
  SettingsCardFooter,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";
import type { SystemSettingsInitialData } from "@/lib/dashboard/management-data";
import { requestAdminService } from "@/lib/dashboard-api/client/admin-service";
import type { AppMessages } from "@/lib/i18n/messages";
import { formatI18nTemplate } from "@/lib/i18n/template";
import {
  DEFAULT_RETENTION_CONFIG,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
} from "@/lib/retention";
import type {
  ScheduledTaskRetentionConfig,
  ScheduledTasksData,
} from "@/lib/scheduled-tasks";

const FIELDS: ReadonlyArray<keyof ScheduledTaskRetentionConfig> = [
  "analyticsDetailDays",
  "scheduledTaskLogsDays",
  "notificationTestDays",
  "notificationAttentionDays",
  "notificationDefaultDays",
];

function sameConfig(
  left: ScheduledTaskRetentionConfig,
  right: ScheduledTaskRetentionConfig,
): boolean {
  return FIELDS.every((key) => left[key] === right[key]);
}

function validDays(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_RETENTION_DAYS &&
    value <= MAX_RETENTION_DAYS
  );
}

/**
 * How long the instance keeps task runs, notifications and detailed
 * analytics. Lowering analytics retention deletes data on the next daily
 * run, so it asks first.
 */
export function DataRetentionSettings({
  messages,
  initialData,
}: {
  messages: AppMessages;
  initialData: SystemSettingsInitialData | null;
}) {
  const copy = messages.systemSettings;
  const [saved, setSaved] = useState<ScheduledTaskRetentionConfig>(
    initialData?.scheduledTaskRetention ?? DEFAULT_RETENTION_CONFIG,
  );
  const [config, setConfig] = useState<ScheduledTaskRetentionConfig>(saved);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const labels: Record<keyof ScheduledTaskRetentionConfig, string> = {
    analyticsDetailDays: copy.analyticsDetailDaysLabel,
    scheduledTaskLogsDays: copy.scheduledTaskLogsDaysLabel,
    notificationTestDays: copy.notificationTestDaysLabel,
    notificationAttentionDays: copy.notificationAttentionDaysLabel,
    notificationDefaultDays: copy.notificationDefaultDaysLabel,
  };
  const hasInvalidValue = useMemo(
    () => FIELDS.some((key) => !validDays(config[key])),
    [config],
  );

  async function save() {
    setSaving(true);
    try {
      const data = await requestAdminService<ScheduledTasksData>(
        "scheduled-tasks",
        { method: "PATCH", body: { retention: config } },
      );
      setSaved(data.retention);
      setConfig(data.retention);
      setConfirmOpen(false);
      toast.success(copy.retentionSaved);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : copy.retentionSaveFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasInvalidValue || saving) return;
    if (config.analyticsDetailDays < saved.analyticsDetailDays) {
      setConfirmOpen(true);
      return;
    }
    void save();
  }

  return (
    <SettingsSection
      title={
        <LabelWithInfo
          label={copy.retentionTitle}
          info={copy.retentionDescription}
        />
      }
    >
      <form onSubmit={handleSubmit}>
        <SettingsCard>
          {FIELDS.map((key) => (
            <SettingsRow
              key={key}
              label={labels[key]}
              htmlFor={`retention-${key}`}
            >
              <Input
                id={`retention-${key}`}
                className="sm:w-28"
                type="number"
                min={MIN_RETENTION_DAYS}
                max={MAX_RETENTION_DAYS}
                step={1}
                value={config[key]}
                aria-invalid={!validDays(config[key])}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    [key]: Number(event.target.value),
                  }))
                }
              />
            </SettingsRow>
          ))}
          <SettingsCardFooter note={copy.retentionRangeHint}>
            <SaveButton
              label={copy.retentionSave}
              savingLabel={copy.retentionSaving}
              saving={saving}
              disabled={hasInvalidValue || sameConfig(config, saved)}
            />
          </SettingsCardFooter>
        </SettingsCard>
      </form>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!saving) setConfirmOpen(open);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.retentionLowerTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {formatI18nTemplate(copy.retentionLowerDescription, {
                days: config.analyticsDetailDays,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>
              {copy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              {saving ? copy.retentionSaving : copy.retentionLowerConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
