import { TableActionButton } from "@insightflare/ui/table-action-button";
import { SettingsIcon } from "lucide-react";

import { navigateWithTransition } from "@/lib/page-transition";
import { useRouter } from "@/lib/router";

interface PublicLinkSettingsButtonProps {
  href: string;
  label: string;
}

export function PublicLinkSettingsButton({
  href,
  label,
}: PublicLinkSettingsButtonProps) {
  const router = useRouter();

  return (
    <TableActionButton
      label={label}
      onClick={() => navigateWithTransition(router, href)}
    >
      <SettingsIcon className="size-4" />
    </TableActionButton>
  );
}
