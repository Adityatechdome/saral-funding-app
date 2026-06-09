import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { colors, spacing, radius, fonts } from "@/src/theme";

interface Props {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  testID?: string;
  placeholder?: string;
  error?: string;
}

export default function Picker({ label, value, options, onChange, testID, placeholder, error }: Props) {
  const [open, setOpen] = useState(false);

  const borderColor = error ? colors.danger : open ? colors.primary : colors.border;
  const bgColor = error ? colors.dangerSoft : open ? "#FFF" : colors.surface2;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        testID={testID}
        style={[
          styles.field,
          {
            borderColor,
            backgroundColor: bgColor,
            borderWidth: open ? 1.5 : 1,
          },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || placeholder || `Select ${label}`}
        </Text>
        <ChevronDown
          size={16}
          color={open ? colors.primary : colors.textDim}
          strokeWidth={2}
        />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(x) => x}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    testID={`${testID}-opt-${item}`}
                    style={[styles.opt, selected && styles.optSelected]}
                    onPress={() => { onChange(item); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optText, selected && styles.optTextSelected]}>
                      {item}
                    </Text>
                    {selected && (
                      <Check size={15} color={colors.primaryDark} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  field: {
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 50,
  },
  value: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textPlaceholder,
  },
  errorText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.danger,
    marginTop: 5,
    marginLeft: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "72%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optSelected: {
    backgroundColor: colors.primarySoft,
  },
  optText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.text,
    flex: 1,
  },
  optTextSelected: {
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  sep: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
});
