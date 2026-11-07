import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import {
  AnalyticsTooltipProvider as ProductAnalyticsTooltipProvider,
  AnalyticsTooltipTarget as ProductAnalyticsTooltipTarget,
} from "@insightflare/product-ui/analytics-tooltip";
import { Badge } from "@insightflare/ui/badge";
import { Clickable } from "@insightflare/ui/clickable";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";

import type { Locale } from "@/lib/i18n/config";
import type { AppMessages } from "@/lib/i18n/messages";

export type AnalyticsTooltipLocale = Locale;

export interface AnalyticsTooltipMessages {
  copyValue: string;
}

export interface AnalyticsTooltipDetail {
  label: string;
  value: ReactNode;
  copyValue?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface AnalyticsDetailsTooltipRequest {
  kind: "details";
  key: string;
  locale: AnalyticsTooltipLocale;
  items: readonly AnalyticsTooltipDetail[];
}

export interface AnalyticsCustomTooltipRequest {
  kind: "custom";
  key: string;
  content: ReactNode;
}

const DEFAULT_MESSAGES: AnalyticsTooltipMessages = {
  copyValue: "Copy value",
};

interface AnalyticsTooltipAppContextValue {
  messages: AnalyticsTooltipMessages;
  onCopyResult?: (success: boolean) => void;
}

const AnalyticsTooltipAppContext =
  createContext<AnalyticsTooltipAppContextValue | null>(null);

async function copyAnalyticsValue(
  value: string,
  onCopyResult?: (success: boolean) => void,
) {
  try {
    await navigator.clipboard.writeText(value);
    onCopyResult?.(true);
  } catch {
    onCopyResult?.(false);
  }
}

function AnalyticsDetailsTooltipContent({
  request,
  appContext,
}: {
  request: Pick<AnalyticsDetailsTooltipRequest, "items">;
  appContext: AnalyticsTooltipAppContextValue;
}) {
  return (
    <div className="grid w-max grid-cols-[max-content_max-content] items-center gap-x-2 gap-y-1.5 whitespace-nowrap">
      {request.items.map((item) => {
        const copyValue = item.copyValue;

        return (
          <div key={item.label} className="contents">
            {copyValue !== undefined ? (
              <Badge
                asChild
                variant="link"
                className="h-5 min-w-max cursor-copy px-1 text-[10px]"
              >
                <button
                  type="button"
                  aria-label={`${appContext.messages.copyValue}: ${copyValue}`}
                  onClick={() =>
                    void copyAnalyticsValue(copyValue, appContext.onCopyResult)
                  }
                >
                  {item.label}
                </button>
              </Badge>
            ) : (
              <span className="text-xs leading-5 text-background/70">
                {item.label}
              </span>
            )}
            <div className="inline-flex min-w-0 items-center gap-1 leading-5">
              <span>{item.value}</span>
              {item.action ? (
                <Clickable
                  className="shrink-0 text-background/70 transition-colors hover:text-background"
                  onClick={item.action.onClick}
                  aria-label={item.action.label}
                >
                  <SearchIcon size="1.2em" />
                </Clickable>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsTimeTooltipProvider({
  children,
  messages,
  retentionMode = "table-column",
}: {
  children: ReactNode;
  messages?: AppMessages;
  retentionMode?: "table-column" | "target";
}) {
  const tooltipMessages = messages
    ? { copyValue: messages.events.copyValue }
    : DEFAULT_MESSAGES;
  const onCopyResult = messages
    ? (success: boolean) => {
        if (success) toast.success(messages.events.copiedValue);
        else toast.error(messages.events.copyValueFailed);
      }
    : undefined;

  return (
    <AnalyticsTooltipAppContext.Provider
      value={{ messages: tooltipMessages, onCopyResult }}
    >
      <ProductAnalyticsTooltipProvider retentionMode={retentionMode}>
        {children}
      </ProductAnalyticsTooltipProvider>
    </AnalyticsTooltipAppContext.Provider>
  );
}

export function AnalyticsDetailsTooltipTarget({
  children,
  className,
  locale,
  request,
}: {
  children: ReactNode;
  className?: string;
  locale: AnalyticsTooltipLocale;
  request: Omit<AnalyticsDetailsTooltipRequest, "kind" | "locale">;
}) {
  const appContext = useContext(AnalyticsTooltipAppContext);
  if (!appContext) return <>{children}</>;

  return (
    <ProductAnalyticsTooltipTarget
      className={className}
      contentKey={`details:${locale}:${request.key}`}
      content={
        <AnalyticsDetailsTooltipContent
          request={request}
          appContext={appContext}
        />
      }
    >
      {children}
    </ProductAnalyticsTooltipTarget>
  );
}

export function AnalyticsTooltipTarget({
  children,
  className,
  request,
}: {
  children: ReactNode;
  className?: string;
  request: Omit<AnalyticsCustomTooltipRequest, "kind">;
}) {
  return (
    <ProductAnalyticsTooltipTarget
      className={className}
      contentKey={`custom:${request.key}`}
      content={request.content}
    >
      {children}
    </ProductAnalyticsTooltipTarget>
  );
}
