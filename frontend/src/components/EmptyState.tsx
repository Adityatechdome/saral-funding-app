import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LucideIcon } from "lucide-react-native";

import { colors, fonts, radius, spacing } from "@/src/theme";

interface EmptyStateProps {
  Icon?: LucideIcon;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ Icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      {Icon && (
        <View style={styles.iconWrap}>
          <Icon size={32} color={colors.textDim} strokeWidth={1.5} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {ctaLabel && onCta && (
        <TouchableOpacity style={styles.cta} onPress={onCta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  cta: {
    marginTop: spacing.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
});
