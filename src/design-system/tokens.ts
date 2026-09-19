/**
 * Design System Tokens: Classic Editorial / Mobile Ledger
 * Minimalist, crisp, financial journal aesthetics tailored for mobile touch POS & operations.
 * Font: Times New Roman, Safe Stack 3+1 Colors (#2C4C3B, #FAFAF7, #1A1A1A, #E0E0E0).
 */

export const colors = {
  primary: {
    DEFAULT: "#2C4C3B",
    dark: "#1B3224",
    light: "#EAEFEA",
    hover: "#233D2F",
    subtle: "#F2F5F2",
  },
  surface: {
    background: "#FAFAF7",
    DEFAULT: "#FFFFFF",
    secondary: "#F2F2F0",
    container: "#FFFFFF",
    variant: "#EAEAE6",
  },
  text: {
    primary: "#1A1A1A",
    secondary: "#555555",
    muted: "#777777",
    inverse: "#FFFFFF",
  },
  border: {
    DEFAULT: "#E0E0E0",
    subtle: "#EEEEEE",
    strong: "#CCCCCC",
    focus: "#2C4C3B",
  },
  status: {
    success: "#2C4C3B",
    successBg: "#EAEFEA",
    warning: "#8C5C00",
    warningBg: "#FDF7EB",
    error: "#9E2A2B",
    errorBg: "#FBEBEB",
    info: "#1F4E79",
    infoBg: "#EDF3F8",
  },
} as const;

export const radii = {
  none: "0px",
  sm: "2px",
  md: "2px",
  lg: "4px",
  xl: "4px",
  "2xl": "4px",
  full: "9999px",
} as const;

export const shadows = {
  none: "none",
  sm: "none",
  md: "none",
  lg: "none",
  sheet: "0 -2px 10px rgba(0, 0, 0, 0.05)",
} as const;

export const typography = {
  fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif",
  display: "text-2xl font-bold tracking-tight font-serif",
  screenTitle: "text-xl font-bold tracking-tight font-serif",
  sectionTitle: "text-base font-bold tracking-tight font-serif",
  body: "text-sm font-normal leading-relaxed font-serif",
  bodyMedium: "text-sm font-semibold leading-relaxed font-serif",
  caption: "text-xs font-normal text-[#555555] font-serif",
  captionMedium: "text-xs font-semibold text-[#555555] font-serif",
} as const;

export const spacing = {
  touchTarget: "min-h-[44px] min-w-[44px]",
  tapArea: "min-h-[40px]",
} as const;
