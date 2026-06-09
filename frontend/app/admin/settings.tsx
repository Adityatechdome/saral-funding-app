import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Link2, Phone, CheckCircle2 } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

type AdminConfig = {
  calendly_url?: string;
  whatsapp_number?: string;
  consultation_duration_min?: number;
};

export default function AdminSettings() {
  const router = useRouter();
  const [config, setConfig] = useState<AdminConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiGet<AdminConfig>("/admin/config")
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await apiPost("/admin/config", config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-settings">
      <BackBar title="App Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Calendly */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Link2 size={14} color={colors.primaryDark} strokeWidth={2} />
                </View>
                <Text style={styles.sectionTitle}>Calendly Integration</Text>
              </View>

              <Text style={styles.fieldLabel}>Calendly URL</Text>
              <TextInput
                style={styles.input}
                value={config.calendly_url || ""}
                onChangeText={(v) => setConfig((c) => ({ ...c, calendly_url: v }))}
                placeholder="https://calendly.com/your-org/consultation"
                placeholderTextColor={colors.textPlaceholder}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.fieldLabel}>Consultation Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={String(config.consultation_duration_min ?? 30)}
                onChangeText={(v) => setConfig((c) => ({ ...c, consultation_duration_min: parseInt(v) || 30 }))}
                keyboardType="number-pad"
                placeholder="30"
                placeholderTextColor={colors.textPlaceholder}
              />
            </View>

            {/* WhatsApp */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: "#DCFCE7" }]}>
                  <Phone size={14} color="#15803D" strokeWidth={2} />
                </View>
                <Text style={styles.sectionTitle}>WhatsApp Support</Text>
              </View>

              <Text style={styles.fieldLabel}>WhatsApp Number (with country code)</Text>
              <TextInput
                style={styles.input}
                value={config.whatsapp_number || ""}
                onChangeText={(v) => setConfig((c) => ({ ...c, whatsapp_number: v }))}
                placeholder="919876543210"
                placeholderTextColor={colors.textPlaceholder}
                keyboardType="phone-pad"
              />
              <Text style={styles.hint}>Enter number without + sign, e.g. 919876543210</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || saved) && { opacity: 0.85 }]}
          onPress={save}
          disabled={saving || loading}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : saved ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={16} color="#FFF" strokeWidth={2} />
              <Text style={styles.saveBtnText}>Saved!</Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFF", borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionIcon: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.text },
  fieldLabel: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 14, fontFamily: fonts.regular,
    color: colors.text, backgroundColor: colors.surface2, marginBottom: 14,
  },
  hint: {
    fontSize: 11, fontFamily: fonts.regular, color: colors.textDim,
    marginTop: -10, marginBottom: 4,
  },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: spacing.md, backgroundColor: "#FFF",
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingVertical: 14, alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontFamily: fonts.displayBold, color: "#FFF" },
});
