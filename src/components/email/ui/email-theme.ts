import type * as React from "react";

export const emailTheme = {
  colors: {
    background: "#ffffff",
    foreground: "#171717",
    card: "#ffffff",
    primary: "#3c61a7",
    primaryDark: "#2a4a88",
    primarySoft: "#f0f5ff",
    primaryBorder: "#c8d8f6",
    secondary: "#f4f4f5",
    muted: "#f5f5f5",
    mutedForeground: "#737373",
    border: "rgba(23, 23, 23, 0.10)",
    borderSubtle: "#f0f0f0",
    warning: "#b45309",
    warningSoft: "#fffbeb",
    warningBorder: "#fde68a",
    destructive: "#dc2626",
    destructiveSoft: "#fef2f2",
    destructiveBorder: "#fecaca",
    success: "#047857",
    successSoft: "#ecfdf5",
    successBorder: "#a7f3d0",
    info: "#2a4a88",
    infoSoft: "#f0f5ff",
    infoBorder: "#c8d8f6",
  },
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", monospace',
  radius: "0",
  shadow: "none",
} as const;

export const emailTableResetStyle = {
  borderCollapse: "collapse",
  borderSpacing: "0",
} satisfies React.CSSProperties;

export const emailBreakTextStyle = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  wordWrap: "break-word",
} satisfies React.CSSProperties;

export const emailNoWrapStyle = {
  whiteSpace: "nowrap",
} satisfies React.CSSProperties;

export function createEmailTextStyles(theme: typeof emailTheme = emailTheme) {
  return {
    heading: {
      margin: "0",
      color: theme.colors.foreground,
      fontSize: "24px",
      fontWeight: "600",
      lineHeight: "32px",
      ...emailBreakTextStyle,
    },
    eyebrow: {
      margin: "0 0 8px",
      color: theme.colors.primary,
      fontSize: "11px",
      fontWeight: "600",
      letterSpacing: "0",
      lineHeight: "16px",
      textTransform: "uppercase",
    },
    body: {
      margin: "8px 0 0",
      color: theme.colors.mutedForeground,
      fontSize: "14px",
      lineHeight: "22px",
      ...emailBreakTextStyle,
    },
    sectionTitle: {
      margin: "18px 0 0",
      color: theme.colors.foreground,
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px",
      ...emailBreakTextStyle,
    },
  } satisfies Record<string, React.CSSProperties>;
}

export const emailTextStyles = createEmailTextStyles(emailTheme);
