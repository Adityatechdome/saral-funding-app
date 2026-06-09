import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { colors, spacing, fonts, radius } from "@/src/theme";

interface StepBarProps {
  step: number;
  total: number;
  labels?: string[];
}

export default function StepBar({ step, total, labels }: StepBarProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.barRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              i < step && styles.segmentDone,
              i === step - 1 && styles.segmentActive,
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Step {step} of {total}{labels ? `  ·  ${labels[step - 1]}` : ""}
      </Text>
    </View>
  );
}

export function BackBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={barStyles.bar}>
      {onBack ? (
        <TouchableOpacity
          testID="back-btn"
          onPress={onBack}
          style={barStyles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
      {title ? (
        <Text style={barStyles.title} numberOfLines={1}>{title}</Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  barRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  segmentDone: {
    backgroundColor: colors.primaryLight,
  },
  segmentActive: {
    backgroundColor: colors.primary,
    height: 5,
    borderRadius: 3,
  },
  stepLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
  },
});

const barStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFF",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
    textAlign: "center",
  },
});
