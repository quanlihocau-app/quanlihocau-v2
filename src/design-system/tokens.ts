/**
 * Design System Tokens: Classic Editorial / Mobile Ledger
 * Minimalist, crisp, financial journal aesthetics tailored for mobile touch POS & operations.
 * Font: Times New Roman, Safe Stack 3+1 Colors (#2C4C3B, #FAFAF7, #1A1A1A, #E0E0E0).
 */

export const colors = {
  primary: {
    DEFAULT: "#16A34A",
    dark: "#15803D",
    light: "#DCFCE7",
    hover: "#15803D",
    subtle: "#F0FDF4",
  },
  surface: {
    background: "#F8FAFC",
    DEFAULT: "#FFFFFF",
    secondary: "#F1F5F9",
    container: "#FFFFFF",
    variant: "#E2E8F0",
  },
  text: {
    primary: "#0F172A",
    secondary: "#475569",
    muted: "#64748B",
    inverse: "#FFFFFF",
  },
  border: {
    DEFAULT: "#E2E8F0",
    subtle: "#F1F5F9",
    strong: "#CBD5E1",
    focus: "#16A34A",
  },
  status: {
    success: "#16A34A",
    successBg: "#F0FDF4",
    warning: "#D97706",
    warningBg: "#FFFBEB",
    error: "#DC2626",
    errorBg: "#FEF2F2",
    info: "#0284C7",
    infoBg: "#F0F9FF",
  },
} as const;

export const radii = {
  none: "0px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "28px",
  full: "9999px",
} as const;

export const shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 12px -2px rgba(0, 0, 0, 0.08)",
  lg: "0 10px 25px -3px rgba(0, 0, 0, 0.1)",
  sheet: "0 -10px 30px rgba(0, 0, 0, 0.12)",
} as const;

export const typography = {
  fontFamily: "'Times New Roman', Times, 'Liberation Serif', serif",
  display: "text-2xl font-bold tracking-tight font-serif",
  screenTitle: "text-xl font-bold tracking-tight font-serif",
  sectionTitle: "text-base font-bold tracking-tight font-serif",
  body: "text-sm font-normal leading-relaxed font-serif",
  bodyMedium: "text-sm font-semibold leading-relaxed font-serif",
  caption: "text-xs font-normal text-[#64748B] font-serif",
  captionMedium: "text-xs font-semibold text-[#64748B] font-serif",
} as const;

export const spacing = {
  touchTarget: "min-h-[48px] min-w-[48px]",
  tapArea: "min-h-[44px]",
} as const;
