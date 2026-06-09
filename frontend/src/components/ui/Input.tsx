/**
 * Input component — consistent text inputs across Saral Funding.
 *
 * Features: icon prefix, error state, focused border, helper text, character count.
 *
 * Usage:
 *   <Input label="Mobile" value={v} onChangeText={fn} keyboardType="number-pad" />
 *   <Input label="Notes" value={v} onChangeText={fn} multiline Icon={StickyNote} error="Required" />
 */
import { useState } from "react";
import { View, Text, TextInput, StyleSheet, type TextInputProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, fonts, radius, spacing } from "@/src/theme";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  helper?: string;
  error?: string;
  Icon?: LucideIcon;
  hint?: string;
  maxLength?: number;
  showCount?: boolean;
  testID?: string;
}

export default function Input({
  label,
  helper,
  error,
  Icon,
  hint,
  maxLength,
  showCount,
  testID,
  value = "",
  multiline,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
    ? colors.primary
    : colors.border;

  const bgColor = error
    ? colors.dangerSoft
    : focused
    ? "#FFF"
    : colors.surface2;

  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrap,
          {
            borderColor,
            backgroundColor: bgColor,
            borderWidth: focused || error ? 1.5 : 1,
          },
          multiline && { minHeight: 100, alignItems: "flex-start" },
          focused && styles.focusShadow,
        ]}
      >
        {Icon && (
          <Icon
            size={16}
            color={focused ? colors.primary : colors.textDim}
            strokeWidth={2}
            style={{ marginLeft: 14, marginRight: 2, marginTop: multiline ? 14 : 0 }}
          />
        )}
        <TextInput
          testID={testID}
          value={String(value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={maxLength}
          multiline={multiline}
          style={[
            styles.input,
            Icon && { paddingLeft: 6 },
            multiline && styles.multilineInput,
          ]}
          placeholderTextColor={colors.textPlaceholder}
          {...rest}
        />
        {showCount && maxLength && (
          <Text style={styles.count}>
            {String(value).length}/{maxLength}
          </Text>
        )}
      </View>
      {(hint || error || helper) && (
        <Text style={[styles.helper, error && styles.errorText]}>
          {error || hint || helper}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  focusShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 50,
  },
  multilineInput: {
    paddingTop: 14,
    paddingBottom: 14,
    textAlignVertical: "top",
  },
  count: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
    marginRight: 12,
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  helper: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
    marginTop: 5,
    marginLeft: 4,
  },
  errorText: {
    color: colors.danger,
  },
});
