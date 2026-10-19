import { Button } from "@insightflare/ui/button";
import { Spinner } from "@insightflare/ui/spinner";

/** A card's Save button: a spinner and its pending label while it saves. */
export function SaveButton({
  label,
  savingLabel,
  saving,
  disabled = false,
  type = "submit",
  onClick,
}: {
  label: string;
  savingLabel: string;
  saving: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <Button type={type} disabled={saving || disabled} onClick={onClick}>
      {saving ? <Spinner data-icon="inline-start" /> : null}
      {saving ? savingLabel : label}
    </Button>
  );
}
