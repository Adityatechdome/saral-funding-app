import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

import { colors } from "@/src/theme";
import { storage } from "@/src/utils/storage";
import { apiGet } from "@/src/api";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await storage.getItem<string>("auth_token", "");
      if (!token) return router.replace("/login");

      try {
        const me = await apiGet<{ onboarding_step?: string }>("/auth/me");
        if (me.onboarding_step === "profile") router.replace("/onboarding/profile");
        else if (me.onboarding_step === "business") router.replace("/onboarding/business");
        else if (me.onboarding_step === "assessment") router.replace("/onboarding/assessment");
        else router.replace("/(tabs)");
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <View style={styles.logoBadge}><Text style={styles.logoText}>S</Text></View>
      <Text style={styles.title}>Saral Funding</Text>
      <Text style={styles.subtitle}>Discover government schemes you{"'"}re eligible for</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", padding: 24 },
  logoBadge: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logoText: { fontSize: 36, fontWeight: "800", color: "#FFF" },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: "center" },
});
