import type { ReactNode } from "react";
import { Button } from "@insightflare/ui/button";

import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/settings-section";

/** A settings page's last section: its destructive actions, a row each. */
export function DangerZone({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <SettingsSection title={title}>
      <SettingsCard>{children}</SettingsCard>
    </SettingsSection>
  );
}

/** One destructive action: what it does, and the button that starts it. */
export function DangerRow({
  label,
  description,
  action,
  disabled = false,
  onClick,
}: {
  label: ReactNode;
  description: ReactNode;
  /** The button's label, the verb of the confirmation that follows. */
  action: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <SettingsRow label={label} description={description}>
      <Button
        type="button"
        variant="outline"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={disabled}
        onClick={onClick}
      >
        {action}
      </Button>
    </SettingsRow>
  );
}
