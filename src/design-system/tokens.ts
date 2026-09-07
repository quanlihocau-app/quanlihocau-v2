/**
 * Design System Tokens: Modern Google / Material 3 (Pixel UI)
 * Clean, minimal, soft surface styling tailored for mobile touch POS & operations.
 */

export const colors = {
  primary: {
    DEFAULT: "#4F9D5A",
    dark: "#246B38",
    light: "#E8F3E5",
    hover: "#3D8547",
    subtle: "#F2F8F0",
  },
  surface: {
    background: "#FFFFFF",
    DEFAULT: "#F7F9F5",
    secondary: "#EEF3EB",
    container: "#FFFFFF",
    variant: "#E8EFE6",
  },
  text: {
    primary: "#17201A",
    secondary: "#66716A",
    muted: "#8A938D",
    inverse: "#FFFFFF",
  },
  border: {
    DEFAULT: "#E3E8E3",
    subtle: "#EDF2EC",
    strong: "#D0D8CF",
    focus: "#4F9D5A",
  },
  status: {
    success: "#3E9B4F",
    successBg: "#EBF6ED",
    warning: "#D99A32",
    warningBg: "#FDF6E9",
    error: "#D9534F",
    errorBg: "#FCEEED",
    info: "#2A7BB7",
    infoBg: "#EBF4FA",
  },
} as const;

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(23, 32, 26, 0.04)",
  md: "0 4px 12px rgba(23, 32, 26, 0.05)",
  lg: "0 8px 24px rgba(23, 32, 26, 0.08)",
  sheet: "0 -8px 30px rgba(23, 32, 26, 0.12)",
  none: "none",
} as const;

export const typography = {
  fontFamily: "var(--font-be-vietnam-pro), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "text-2xl font-bold tracking-tight",
  screenTitle: "text-xl font-bold tracking-tight",
  sectionTitle: "text-base font-semibold tracking-tight",
  body: "text-sm font-normal leading-relaxed",
  bodyMedium: "text-sm font-medium leading-relaxed",
  caption: "text-xs font-normal text-[#66716A]",
  captionMedium: "text-xs font-medium text-[#66716A]",
} as const;

export const spacing = {
  touchTarget: "min-h-[48px] min-w-[48px]",
  tapArea: "min-h-[44px]",
} as const;
