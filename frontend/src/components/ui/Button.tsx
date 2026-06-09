/**
 * Button component — all variants used throughout Saral Funding.
 *
 * Usage:
 *   <Button label="Continue" onPress={fn} />
 *   <Button variant="secondary" label="Cancel" onPress={fn} />
 *   <Button variant="ghost" label="Skip" size="sm" onPress={fn} />
 */
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, radius } from "@/src/theme";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "outline";
type Size = "lg" | "md" | "sm";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  Icon?: LucideIcon;
  iconPosition?: "left" | "right";
  testID?: string;
  fullWidth?: boolean;
}

const HEIGHT: Record<Size, number> = { lg: 52, md: 44, sm: 36 };
const FONT_SIZE: Record<Size, number> = { lg: 16, md: 15, sm: 13 };
const ICON_SIZE: Record<Size, number> = { lg: 18, md: 16, sm: 14 };
const H_PAD: Record<Size, number> = { lg: 20, md: 18, sm: 14 };
const RADIUS: Record<Size, number> = { lg: 14, md: 12, sm: 10 };

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string; disabledBg: string; disabledText: string }> = {
  primary: { bg: colors.primary, text: "#FFF", disabledBg: "#A7F3D0", disabledText: "rgba(255,255,255,0.6)" },
  secondary: { bg: "#FFF", text: colors.primaryDark, border: colors.primary, disabledBg: "#FFF", disabledText: colors.textPlaceholder },
  tertiary: { bg: colors.primarySoft, text: colors.primaryDark, disabledBg: colors.primarySoft, disabledText: colors.textPlaceholder },
  ghost: { bg: "transparent", text: colors.primary, disabledBg: "transparent", disabledText: colors.textPlaceholder },
  danger: { bg: colors.danger, text: "#FFF", disabledBg: "#FECACA", disabledText: "rgba(255,255,255,0.6)" },
  outline: { bg: "#FFF", text: colors.text, border: colors.border, disabledBg: colors.surfaceAlt, disabledText: colors.textPlaceholder },
};

export default function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  Icon,
  iconPosition = "right",
  testID,
  fullWidth = true,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: H_PAD[size],
          borderRadius: RADIUS[size],
          backgroundColor: isDisabled ? v.disabledBg : v.bg,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: isDisabled ? (v.border ? colors.border : "transparent") : (v.border || "transparent"),
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        variant === "primary" && !isDisabled && styles.primaryShadow,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isDisabled ? v.disabledText : v.text}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {Icon && iconPosition === "left" && (
            <Icon size={ICON_SIZE[size]} color={isDisabled ? v.disabledText : v.text} strokeWidth={2} />
          )}
          <Text
            style={[
              styles.label,
              {
                fontSize: FONT_SIZE[size],
                color: isDisabled ? v.disabledText : v.text,
                fontFamily: size === "lg" ? fonts.displayBold : fonts.semiBold,
              },
            ]}
          >
            {label}
          </Text>
          {Icon && iconPosition === "right" && (
            <Icon size={ICON_SIZE[size]} color={isDisabled ? v.disabledText : v.text} strokeWidth={2.2} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryShadow: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    letterSpacing: 0.1,
  },
});
