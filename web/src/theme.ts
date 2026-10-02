// Copied from frontend/src/theme.ts. No React Native imports.

export const colors = {
  primary: "#1E3A8A",
  primaryHover: "#1E40AF",
  primaryLight: "#EFF6FF",
  secondary: "#3B82F6",
  secondaryHover: "#60A5FA",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  success: "#059669",
  successBg: "#D1FAE5",
  error: "#E11D48",
  errorBg: "#FFE4E6",
  warning: "#D97706",
  warningBg: "#FEF3C7",
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  chip: 24,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const font = {
  h1: { fontSize: 28, fontWeight: 800, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: 700, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: 700 },
  title: { fontSize: 16, fontWeight: 600 },
  body: { fontSize: 14, fontWeight: 400 },
  caption: { fontSize: 12, fontWeight: 500 },
  mono: { fontFamily: "Courier", fontSize: 13 },
};
