import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ShieldCheck, RefreshCw } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost, setTokens } from "@/src/api";
import { getLang } from "@/src/i18n";
import Button from "@/src/components/ui/Button";
import { BackBar } from "@/src/components/StepBar";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function Otp() {
  const router = useRouter();
  const { mobile } = useLocalSearchParams<{ mobile: string }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const code = digits.join("");
  const isComplete = code.length === OTP_LENGTH;

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setErr("");

    if (cleaned && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  // Handle paste (user pastes full OTP)
  const handlePaste = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (cleaned.length > 1) {
      const next = Array(OTP_LENGTH).fill("");
      cleaned.split("").forEach((c, i) => { next[i] = c; });
      setDigits(next);
      inputs.current[Math.min(cleaned.length, OTP_LENGTH - 1)]?.focus();
    } else {
      handleChange(text, index);
    }
  };

  const onVerify = async () => {
    if (!isComplete) return;
    setErr("");
    setLoading(true);
    try {
      const r = await apiPost<{ token: string; refresh_token: string; user: { onboarding_step: string } }>(
        "/auth/verify-otp",
        { mobile, code, language: getLang() },
      );
      await setTokens(r.token, r.refresh_token);
      const step = r.user.onboarding_step;
      if (step === "profile") router.replace("/onboarding/profile");
      else if (step === "business") router.replace("/onboarding/business");
      else if (step === "assessment") router.replace("/onboarding/business");
      else router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e.message || "Invalid OTP. Please try again.");
      setDigits(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!canResend) return;
    try {
      await apiPost("/auth/send-otp", { mobile });
      setCanResend(false);
      setCountdown(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      setErr("");
      inputs.current[0]?.focus();
    } catch (e: any) {
      setErr(e.message || "Failed to resend. Please try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="otp-screen">
      <BackBar title="" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.body}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <ShieldCheck size={32} color={colors.primaryDark} strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>Verify your number</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{"\n"}
            <Text style={styles.mobile}>+91 {mobile}</Text>
          </Text>

          {/* OTP boxes */}
          <View style={styles.boxRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputs.current[i] = r; }}
                testID={i === 0 ? "otp-input" : `otp-digit-${i}`}
                style={[
                  styles.box,
                  digit && styles.boxFilled,
                  err && styles.boxError,
                ]}
                value={digit}
                onChangeText={(t) => {
                  if (t.length > 1) {
                    handlePaste(t, i);
                  } else {
                    handleChange(t, i);
                  }
                }}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                caretHidden
              />
            ))}
          </View>

          {err ? (
            <Text style={styles.err}>{err}</Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          {/* Resend */}
          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={onResend} style={styles.resendBtn} testID="resend-otp">
                <RefreshCw size={13} color={colors.primaryDark} strokeWidth={2} />
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Resend in <Text style={{ fontFamily: fonts.bold }}>{countdown}s</Text>
              </Text>
            )}
          </View>

          <Button
            testID="verify-btn"
            label={loading ? "Verifying…" : "Verify & Continue"}
            onPress={onVerify}
            disabled={!isComplete}
            loading={loading}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const BOX_SIZE = 52;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 32,
  },
  mobile: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  boxRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 8,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    textAlign: "center",
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  boxError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  err: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.danger,
    textAlign: "center",
    height: 20,
  },
  resendRow: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 28,
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  resendText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  resendTimer: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
});
