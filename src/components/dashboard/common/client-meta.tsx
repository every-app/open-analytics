import { type ComponentType, memo, type ReactNode } from "react";
import {
  MonitorIcon,
  MonitorSmartphoneIcon,
  SmartphoneIcon,
  TabletIcon,
} from "lucide-react";

import { decodeUrlDisplayValue } from "@/lib/dashboard/url-display";
import { cn } from "@/lib/utils";

type DeviceTypeIcon = ComponentType<{ className?: string }>;
export function resolveDeviceTypeMeta(
  deviceType: string,
  deviceLabels: { desktop: string; mobile: string; tablet: string },
  unknownLabel: string,
  missingLabel = unknownLabel,
): { label: string; Icon: DeviceTypeIcon } {
  const normalized = deviceType.trim();
  const lowered = normalized.toLocaleLowerCase();
  const isMissing = normalized.length === 0;
  const isUnknown =
    lowered === "unknown" || lowered === "undefined" || lowered === "null";
  const isTablet = lowered.includes("tablet");
  const isMobile =
    lowered.includes("mobile") ||
    lowered.includes("phone") ||
    lowered.includes("cellphone");
  const isDesktop =
    lowered.includes("desktop") ||
    lowered.includes("computer") ||
    lowered === "pc";
  const Icon = isTablet
    ? TabletIcon
    : isMobile
      ? SmartphoneIcon
      : isDesktop
        ? MonitorIcon
        : MonitorSmartphoneIcon;
  const label = isMissing
    ? missingLabel
    : isUnknown
      ? unknownLabel
      : isTablet
        ? deviceLabels.tablet
        : isMobile
          ? deviceLabels.mobile
          : isDesktop
            ? deviceLabels.desktop
            : normalized;

  return { label, Icon };
}

export const DeviceMeta = memo(function DeviceMeta({
  deviceType,
  deviceLabels,
  unknownLabel,
  missingLabel = unknownLabel,
  className,
}: {
  deviceType: string;
  deviceLabels: { desktop: string; mobile: string; tablet: string };
  unknownLabel: string;
  missingLabel?: string;
  className?: string;
}) {
  const { Icon: DeviceIcon, label } = resolveDeviceTypeMeta(
    deviceType,
    deviceLabels,
    unknownLabel,
    missingLabel,
  );
  return (
    <InlineMeta
      icon={<DeviceIcon className="size-4 text-muted-foreground" />}
      label={label}
      className={className}
    />
  );
});

export const InlineMeta = memo(function InlineMeta({
  icon,
  label,
  className,
}: {
  icon: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5 min-w-0 max-w-full items-center gap-1.5 align-middle leading-5",
        className,
      )}
    >
      <span className="inline-flex size-4 shrink-0 items-center justify-center self-center [&>svg]:block">
        {icon}
      </span>
      <span className="truncate leading-5">{label}</span>
    </span>
  );
});

function formatPath(pathname: string): string {
  return decodeUrlDisplayValue(pathname.trim() || "/");
}

export function formatPathWithHash(
  pathname: string,
  hash: string | null | undefined,
): string {
  const path = formatPath(pathname);
  const trimmedHash = (hash ?? "").trim();
  if (!trimmedHash) return path;
  const normalized = trimmedHash.startsWith("#")
    ? trimmedHash
    : `#${trimmedHash}`;
  return `${path}${decodeUrlDisplayValue(normalized)}`;
}
