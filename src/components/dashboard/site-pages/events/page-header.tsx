import { memo } from "react";
import { Button } from "@insightflare/ui/button";
import { PageHeading } from "@insightflare/ui/page-heading";
import { ArrowLeftIcon } from "lucide-react";

import type { AppMessages } from "@/lib/i18n/messages";
import { useRouter } from "@/lib/router";

export const EventPageHeader = memo(function EventPageHeader({
  messages,
  title,
  subtitle,
  backHref,
  backLabel,
  onBack,
}: {
  messages: AppMessages;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
}) {
  const router = useRouter();
  const handleBack = onBack
    ? onBack
    : backHref
      ? () => void router.push(backHref)
      : null;

  return (
    <PageHeading
      title={title}
      subtitle={subtitle}
      actions={
        handleBack ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            {backLabel || messages.common.backToTeam}
          </Button>
        ) : null
      }
    />
  );
});
