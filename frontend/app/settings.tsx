import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, Globe, Info, Shield, FileText, LogOut, ChevronRight } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost, apiGet, apiLogout } from "@/src/api";
import { LANGUAGES, loadLang, getLang, setLang } from "@/src/i18n";
import { BackBar } from "@/src/components/StepBar";

export default function Settings() {
  const router = useRouter();
  const [lang, setLangState] = useState("en");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadLang().then(() => setLangState(getLang()));
    apiGet<any>("/auth/me").then(setUser).catch(() => {});
  }, []);

  const change = async (code: string) => {
    setLangState(code);
    await setLang(code);
    await apiPost("/language", { language: code }).catch(() => {});
  };

  const logout = async () => {
    const doLogout = async () => {
      await apiLogout();
      if (Platform.OS === "web") {
        window.location.href = "/login";
      } else {
        router.replace("/login");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out of Saral Funding?")) {
        await doLogout();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to log out of Saral Funding?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="settings-screen">
      <BackBar title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Account */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.card}>
              <View style={styles.accountRow}>
                <View style={styles.accountAvatar}>
                  <Text style={styles.accountAvatarText}>
                    {(user.full_name || "U").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{user.full_name || "—"}</Text>
                  <Text style={styles.accountMobile}>{user.mobile?.startsWith("+") ? user.mobile : `+91 ${user.mobile}`}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Language */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Globe size={13} color={colors.textDim} strokeWidth={2} />
            <Text style={styles.sectionLabel}>App Language</Text>
          </View>
          <View style={styles.card}>
            {LANGUAGES.map((l, i) => (
              <TouchableOpacity
                key={l.code}
                testID={`set-lang-${l.code}`}
                style={[
                  styles.langRow,
                  i < LANGUAGES.length - 1 && styles.langRowBorder,
                  lang === l.code && styles.langRowActive,
                ]}
                onPress={() => change(l.code)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.langNative, lang === l.code && styles.langNativeActive]}>
                    {l.native}
                  </Text>
                  <Text style={styles.langLabel}>{l.label}</Text>
                </View>
                {lang === l.code && (
                  <Check size={16} color={colors.primaryDark} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Shield size={13} color={colors.textDim} strokeWidth={2} />
            <Text style={styles.sectionLabel}>Legal</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.legalRow} activeOpacity={0.7}>
              <FileText size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.legalText}>Privacy Policy</Text>
              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.legalDivider} />
            <TouchableOpacity style={styles.legalRow} activeOpacity={0.7}>
              <Shield size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.legalText}>Terms of Service</Text>
              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Info size={13} color={colors.textDim} strokeWidth={2} />
            <Text style={styles.sectionLabel}>About</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.legalDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Build</Text>
              <Text style={styles.aboutValue}>Production</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          testID="settings-logout"
          style={styles.logoutBtn}
          onPress={logout}
          activeOpacity={0.8}
        >
          <LogOut size={16} color={colors.danger} strokeWidth={2} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Saral Funding helps Indian entrepreneurs discover and apply for government funding schemes.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
  },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  accountAvatarText: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  accountName: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  accountMobile: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingHorizontal: spacing.md,
    minHeight: 58,
  },
  langRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  langRowActive: {
    backgroundColor: colors.primarySoft,
  },
  langNative: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  langNativeActive: {
    color: colors.primaryDark,
  },
  langLabel: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    paddingHorizontal: spacing.md,
  },
  legalText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  legalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    paddingHorizontal: spacing.md,
  },
  aboutLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  aboutValue: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: "#FFF",
    marginBottom: 16,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.danger,
  },
  footerNote: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
    textAlign: "center",
    lineHeight: 18,
  },
});
