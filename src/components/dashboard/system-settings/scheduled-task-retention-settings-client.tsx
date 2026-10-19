import { useMemo, useState } from "react";
import { Input } from "@insightflare/ui/input";
import { toast } from "sonner";

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
import type {
  ScheduledTaskRetentionConfig,
  ScheduledTasksData,
} from "@/lib/scheduled-tasks";

interface ScheduledTaskRetentionSettingsClientProps {
  messages: AppMessages;
  initialData?: SystemSettingsInitialData | null;
}
const FIELDS: Array<{
  key: keyof ScheduledTaskRetentionConfig;
  label: keyof AppMessages["systemSettings"];
}> = [
  { key: "analyticsDetailDays", label: "analyticsDetailDaysLabel" },
  { key: "scheduledTaskLogsDays", label: "scheduledTaskLogsDaysLabel" },
  { key: "notificationTestDays", label: "notificationTestDaysLabel" },
  {
    key: "notificationAttentionDays",
    label: "notificationAttentionDaysLabel",
  },
  {
    key: "notificationDefaultDays",
    label: "notificationDefaultDaysLabel",
  },
];
const DEFAULTS: ScheduledTaskRetentionConfig = {
  scheduledTaskLogsDays: 30,
  notificationTestDays: 30,
  notificationAttentionDays: 180,
  notificationDefaultDays: 120,
  analyticsDetailDays: 396,
};

function sameConfig(
  left: ScheduledTaskRetentionConfig,
  right: ScheduledTaskRetentionConfig,
): boolean {
  return FIELDS.every(({ key }) => left[key] === right[key]);
}

export function ScheduledTaskRetentionSettingsClient({
  messages,
  initialData = null,
}: ScheduledTaskRetentionSettingsClientProps) {
  const copy = messages.systemSettings;
  const [saved, setSaved] = useState<ScheduledTaskRetentionConfig>(
    initialData?.scheduledTaskRetention ?? DEFAULTS,
  );
  const [config, setConfig] = useState<ScheduledTaskRetentionConfig>(saved);
  const [saving, setSaving] = useState(false);
  const hasInvalidValue = useMemo(
    () =>
      FIELDS.some(({ key }) => {
        const value = config[key];
        return !Number.isInteger(value) || value < 1 || value > 3650;
      }),
    [config],
  );

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasInvalidValue || saving) return;
    setSaving(true);
    try {
      const data = await requestAdminService<ScheduledTasksData>(
        "scheduled-tasks",
        { method: "PATCH", body: { retention: config } },
      );
      setSaved(data.retention);
      setConfig(data.retention);
      toast.success(copy.retentionSaved);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : copy.retentionSaveFailed,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title={copy.retentionTitle}
      description={copy.retentionDescription}
    >
      <form onSubmit={handleSave}>
        <SettingsCard>
          {FIELDS.map(({ key, label }) => (
            <SettingsRow
              key={key}
              label={copy[label] as string}
              htmlFor={`retention-${key}`}
            >
              <Input
                id={`retention-${key}`}
                className="sm:w-28"
                type="number"
                min={1}
                max={3650}
                step={1}
                value={config[key]}
                aria-invalid={
                  !Number.isInteger(config[key]) ||
                  config[key] < 1 ||
                  config[key] > 3650
                }
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
    </SettingsSection>
  );
}
