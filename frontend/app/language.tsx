import { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { LANGUAGES, setLang, loadLang, getLang } from "@/src/i18n";
import Button from "@/src/components/ui/Button";

export default function LanguageScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState("en");

  useEffect(() => { loadLang().then(() => setSelected(getLang())); }, []);

  const onContinue = async () => {
    await setLang(selected);
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="language-screen">
      {/* Brand header */}
      <View style={styles.header}>
        <Image source={require("../assets/images/logo-icon.png")} style={styles.logoMark} resizeMode="contain" />
        <View>
          <Text style={styles.brandName}>Saral Funding</Text>
          <Text style={styles.brandTagline}>Government funding, simplified</Text>
        </View>
      </View>

      <View style={styles.titleSection}>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.subtitle}>अपनी भाषा चुनें  ·  ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ</Text>
      </View>

      <FlatList
        data={LANGUAGES}
        keyExtractor={(x) => x.code}
        contentContainerStyle={styles.grid}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm2 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm2 }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = item.code === selected;
          return (
            <TouchableOpacity
              testID={`lang-${item.code}`}
              activeOpacity={0.82}
              onPress={() => setSelected(item.code)}
              style={[styles.card, active && styles.cardActive]}
            >
              {active && (
                <View style={styles.checkBadge}>
                  <CheckCircle2 size={14} color={colors.primaryDark} strokeWidth={2.5} />
                </View>
              )}
              <Text style={[styles.nativeText, active && styles.nativeTextActive]}>
                {item.native}
              </Text>
              <Text style={[styles.langLabel, active && styles.langLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Button
          testID="lang-continue"
          label="Continue"
          onPress={onContinue}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  logoMark: {
    width: 40,
    height: 40,
  },
  brandName: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  brandTagline: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 1,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    minHeight: 90,
    justifyContent: "flex-end",
    position: "relative",
  },
  cardActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  nativeText: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 2,
  },
  nativeTextActive: {
    color: colors.primaryDark,
  },
  langLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  langLabelActive: {
    color: colors.primaryDark,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm2,
    paddingBottom: Platform.OS === "ios" ? 36 : spacing.md,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
