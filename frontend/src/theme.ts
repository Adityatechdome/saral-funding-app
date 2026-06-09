export const colors = {
  primary: "#22C55E",
  primaryDark: "#15803D",
  primaryLight: "#4ADE80",
  primarySoft: "#EBFDF0",
  primaryMid: "#DCFCE7",
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  surface2: "#F9FAFB",
  surfaceAlt: "#F3F4F6",
  text: "#111827",
  textMuted: "#374151",
  textDim: "#6B7280",
  textPlaceholder: "#9CA3AF",
  border: "#E5E7EB",
  borderDark: "#D1D5DB",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  warning: "#F59E0B",
  warningSoft: "#FFFBEB",
  success: "#16A34A",
  white: "#FFFFFF",
  black: "#111827",
  overlay: "rgba(0,0,0,0.5)",
  // Stage colours for CRM pipeline
  stageNew: "#DBEAFE",
  stageActive: "#FEF3C7",
  stageWon: "#DCFCE7",
  stageLost: "#FEE2E2",
};

export const spacing = {
  xs: 4,
  xs2: 6,
  sm: 8,
  sm2: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, xxl: 20, pill: 9999 };

// Three elevation levels — Level 0 (flat border), 1 (card), 2 (modal)
export const elevation = {
  l0: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  l1: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  l2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

// Use these font family names after loading via @expo-google-fonts
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  displayRegular: "DMSans_400Regular",
  displayMedium: "DMSans_500Medium",
  displaySemiBold: "DMSans_600SemiBold",
  displayBold: "DMSans_700Bold",
};

export const typo = {
  h1: {
    fontSize: 30,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  h2: {
    fontSize: 24,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 28,
  },
  h4: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 24,
  },
  bodyLg: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 20,
  },
  bodyMd: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.text,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
  micro: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
  },
};

export const formatINR = (n: number): string => {
  if (!n || n <= 0) return "₹0";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

// Colour-code CRM stages
export const stageColor = (stage: string): { bg: string; text: string } => {
  const map: Record<string, { bg: string; text: string }> = {
    new: { bg: "#DBEAFE", text: "#1D4ED8" },
    contacted: { bg: "#FEF3C7", text: "#92400E" },
    interested: { bg: "#FDE8D8", text: "#9A3412" },
    documentation: { bg: "#EDE9FE", text: "#5B21B6" },
    submitted: { bg: "#DBEAFE", text: "#1D4ED8" },
    approved: { bg: "#DCFCE7", text: "#15803D" },
    disbursed: { bg: "#BBF7D0", text: "#14532D" },
    closed: { bg: "#F3F4F6", text: "#374151" },
    called: { bg: "#FEF3C7", text: "#92400E" },
    follow_up: { bg: "#FDE8D8", text: "#9A3412" },
  };
  return map[stage] ?? { bg: "#F3F4F6", text: "#374151" };
};
