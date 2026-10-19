import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  InfoIcon,
  LoaderCircleIcon,
} from "lucide-react";
import {
  Toaster as Sonner,
  type ToasterProps as SonnerToasterProps,
} from "sonner";

import { cn } from "../../lib/utils";

export type ToasterProps = Omit<SonnerToasterProps, "theme"> & {
  theme?: SonnerToasterProps["theme"];
};
export type InsightFlareToasterProps = ToasterProps;

const Toaster = ({
  className,
  style,
  theme = "system",
  toastOptions,
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      className={cn(
        "toaster group pointer-events-auto rounded-none",
        className,
      )}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <CircleAlertIcon className="size-4" />,
        error: <CircleXIcon className="size-4" />,
        loading: <LoaderCircleIcon className="size-4 animate-spin" />,
      }}
      style={
        {
          ...(theme === "system"
            ? {
                "--normal-bg": "var(--popover)",
                "--normal-text": "var(--popover-foreground)",
                "--normal-border": "var(--border)",
              }
            : {}),
          "--border-radius": "0px",
          pointerEvents: "auto",
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: {
          ...toastOptions?.classNames,
          toast: cn(
            "cn-toast pointer-events-auto",
            toastOptions?.classNames?.toast,
          ),
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
