import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost } from "@/src/api";

const TRUST_ITEMS = [
  { icon: <ShieldCheck size={13} color={colors.primaryDark} strokeWidth={2} />, label: "Secure & private" },
  { icon: <Sparkles size={13} color={colors.primaryDark} strokeWidth={2} />, label: "AI-powered matching" },
  { icon: <CheckCircle2 size={13} color={colors.primaryDark} strokeWidth={2} />, label: "25+ govt schemes" },
];

export default function Login() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSend = async () => {
    setErr("");
    if (mobile.length < 10) { setErr("Enter a valid 10-digit mobile number"); return; }
    setLoading(true);
    try {
      await apiPost("/auth/send-otp", { mobile });
      router.push({ pathname: "/otp", params: { mobile } });
    } catch (e: any) {
      setErr(e.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isValid = mobile.length === 10;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="login-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.body}>

          {/* Brand */}
          <View style={styles.brandRow}>
            <Image
              source={require("../assets/images/logo-icon.png")}
              style={styles.logoMark}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.brandName}>Saral Funding</Text>
              <Text style={styles.brandTagline}>Government schemes, simplified</Text>
            </View>
          </View>

          {/* Hero */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Find funding{"\n"}you qualify for</Text>
            <Text style={styles.heroSub}>
              Enter your mobile number to discover government schemes, subsidies, and bank loans tailored to your business.
            </Text>
          </View>

          {/* Trust indicators */}
          <View style={styles.trustRow}>
            {TRUST_ITEMS.map((t, i) => (
              <View key={i} style={styles.trustItem}>
                {t.icon}
                <Text style={styles.trustLabel}>{t.label}</Text>
              </View>
            ))}
          </View>

          {/* Mobile input */}
          <View style={styles.inputSection}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <View style={[styles.inputWrap, isValid && styles.inputWrapValid]}>
              <View style={styles.prefixBox}>
                <Text style={styles.prefix}>🇮🇳  +91</Text>
              </View>
              <View style={styles.divider} />
              <TextInput
                testID="mobile-input"
                style={styles.input}
                value={mobile}
                onChangeText={(s) => setMobile(s.replace(/\D/g, "").slice(0, 10))}
                keyboardType="number-pad"
                placeholder="10-digit mobile"
                placeholderTextColor={colors.textPlaceholder}
                maxLength={10}
              />
              {isValid && <CheckCircle2 size={16} color={colors.primary} strokeWidth={2.5} style={{ marginRight: 12 }} />}
            </View>
            {!!err && (
              <View style={styles.errRow}>
                <Text style={styles.err}>{err}</Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <TouchableOpacity
            testID="send-otp-btn"
            style={[styles.cta, !isValid && styles.ctaDisabled]}
            disabled={!isValid || loading}
            onPress={onSend}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{loading ? "Sending OTP…" : "Continue"}</Text>
            {!loading && <ArrowRight size={18} color="#FFF" strokeWidth={2.5} />}
          </TouchableOpacity>

          <Text style={styles.hint}>By continuing you agree to our Terms & Privacy Policy.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, justifyContent: "center" },

  // Brand
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: spacing.xl,
  },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
  },
  logoText: {
    fontSize: 24,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  brandName: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  brandTagline: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 1,
  },

  // Hero
  heroSection: {
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 32,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 21,
  },

  // Trust
  trustRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: spacing.lg,
    flexWrap: "wrap",
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  trustLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },

  // Input
  inputSection: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.surface2,
    overflow: "hidden",
  },
  inputWrapValid: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  prefixBox: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  prefix: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    letterSpacing: 1,
  },
  errRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  err: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.danger,
  },

  // CTA
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 15,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaDisabled: {
    backgroundColor: "#A7F3D0",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  hint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: spacing.md,
    textAlign: "center",
    lineHeight: 18,
  },
});
