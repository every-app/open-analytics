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
import { Switch } from "@insightflare/ui/switch";
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
  MIN_RETENTION_DAYS,
  type RetentionConfig,
  shortensAnalyticsRetention,
  validRetentionDays,
} from "@/lib/retention";

const FIELDS: ReadonlyArray<keyof RetentionConfig> = [
  "analyticsDetailDays",
  "notificationAttentionDays",
  "notificationDefaultDays",
];

function sameConfig(left: RetentionConfig, right: RetentionConfig): boolean {
  return FIELDS.every((key) => left[key] === right[key]);
}

/** A number of days, or forever (`null`, page views and events only). */
function validDays(value: number | null): boolean {
  return value === null || validRetentionDays(value);
}

/**
 * How long the instance keeps notifications and detailed analytics, which
 * can be kept forever. Shortening analytics retention deletes data within
 * the hour, so it asks first.
 */
export function DataRetentionSettings({
  messages,
  initialData,
}: {
  messages: AppMessages;
  initialData: SystemSettingsInitialData | null;
}) {
  const copy = messages.systemSettings;
  const [saved, setSaved] = useState<RetentionConfig>(
    initialData?.retention ?? DEFAULT_RETENTION_CONFIG,
  );
  const [config, setConfig] = useState<RetentionConfig>(saved);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const labels: Record<keyof RetentionConfig, string> = {
    analyticsDetailDays: copy.analyticsDetailDaysLabel,
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
      const data = await requestAdminService<RetentionConfig>("retention", {
        method: "PATCH",
        body: { retention: config },
      });
      setSaved(data);
      setConfig(data);
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
    if (shortensAnalyticsRetention(saved, config)) {
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
              <div className="flex items-center gap-4">
                {key === "analyticsDetailDays" ? (
                  <label className="flex cursor-pointer items-center gap-2 text-sm whitespace-nowrap">
                    <Switch
                      checked={config.analyticsDetailDays === null}
                      onCheckedChange={(forever) =>
                        setConfig((current) => ({
                          ...current,
                          analyticsDetailDays: forever
                            ? null
                            : (saved.analyticsDetailDays ??
                              DEFAULT_RETENTION_CONFIG.analyticsDetailDays),
                        }))
                      }
                    />
                    {copy.analyticsKeepForever}
                  </label>
                ) : null}
                <Input
                  id={`retention-${key}`}
                  className="sm:w-28"
                  type="number"
                  min={MIN_RETENTION_DAYS}
                  step={1}
                  value={config[key] ?? ""}
                  disabled={config[key] === null}
                  aria-invalid={!validDays(config[key])}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      [key]: Number(event.target.value),
                    }))
                  }
                />
              </div>
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
                days: String(config.analyticsDetailDays),
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
