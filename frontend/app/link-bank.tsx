import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { CheckCircle2, ShieldCheck, ChevronRight, Link as LinkIcon, RefreshCw } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost, apiGet } from "@/src/api";
import Saathi from "@/src/components/Saathi";
import { BackBar } from "@/src/components/StepBar";

type Step = "intro" | "webview" | "polling" | "success" | "error";

const BENEFITS = [
  "Auto-fill your annual turnover",
  "Stronger readiness score",
  "Faster bank recommendations",
  "No manual document entry",
];

export default function LinkBank() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [consentId, setConsentId] = useState<string | null>(null);
  const [consentUrl, setConsentUrl] = useState<string | null>(null);
  const [financialProfile, setFinancialProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startConsent = async () => {
    try {
      setStep("webview");
      // Get user's mobile from /auth/me for the consent VPA
      const me = await apiGet<any>("/auth/me");
      const result = await apiPost<{ consent_id: string; consent_url: string }>("/setu/aa/consent", {
        mobile: me.mobile,
      });
      setConsentId(result.consent_id);
      setConsentUrl(result.consent_url);
    } catch (e: any) {
      setError(e?.message || "Failed to start consent");
      setStep("error");
    }
  };

  const onWebViewNavigationStateChange = (navState: { url: string }) => {
    // Deep link redirect from mock or real Setu
    const url = navState.url;
    if (url.includes("setu-redirect") || url.includes("consent_id")) {
      beginPolling();
    }
  };

  const beginPolling = () => {
    setStep("polling");
    if (!consentId) return;
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const status = await apiGet<{ status: string }>(`/setu/aa/consent/${consentId}/status`);
        if (status.status === "ACTIVE") {
          clearInterval(pollRef.current!);
          await fetchFIData();
        } else if (status.status === "REJECTED" || status.status === "EXPIRED" || attempts > 20) {
          clearInterval(pollRef.current!);
          setError("Bank linking was cancelled or timed out.");
          setStep("error");
        }
      } catch {
        if (attempts > 20) {
          clearInterval(pollRef.current!);
          setError("Could not verify consent status.");
          setStep("error");
        }
      }
    }, 1500);
  };

  const fetchFIData = async () => {
    try {
      const data = await apiGet<any>(`/setu/aa/data/${consentId}`);
      setFinancialProfile(data.financial_profile);
      setStep("success");
    } catch (e: any) {
      setError(e?.message || "Failed to fetch bank data");
      setStep("error");
    }
  };

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
        <BackBar title="Link Bank Account" onBack={() => router.back()} />
        <View style={s.introWrap}>
          <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center", marginBottom: 8 }}>
            <Saathi expression="explaining" size={100} animate message="RBI ke AA framework se bank data safely fetch karein!" />
          </Animated.View>

          <Animated.View entering={SlideInUp.delay(200).duration(400)} style={s.benefitsCard}>
            <Text style={s.benefitsTitle}>Linking your bank helps you</Text>
            {BENEFITS.map((b, i) => (
              <View key={i} style={s.benefitRow}>
                <CheckCircle2 size={15} color={colors.primary} strokeWidth={2.5} />
                <Text style={s.benefitText}>{b}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={SlideInUp.delay(350).duration(400)} style={s.securityNote}>
            <ShieldCheck size={16} color="#6D28D9" strokeWidth={2} />
            <Text style={s.securityText}>
              Secured by <Text style={{ fontFamily: fonts.bold }}>RBI Account Aggregator</Text> framework.
              Your data is encrypted and you can revoke access anytime.
            </Text>
          </Animated.View>

          <TouchableOpacity style={s.ctaBtn} onPress={startConsent} activeOpacity={0.85}>
            <LinkIcon size={18} color="#FFF" strokeWidth={2.5} />
            <Text style={s.ctaBtnText}>Link Bank Account</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={s.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── WebView — Setu AA consent flow ──────────────────────────────────────────
  if (step === "webview" && consentUrl) {
    return (
      <SafeAreaView style={s.screen} edges={["top"]}>
        <BackBar title="Authorize Bank Access" onBack={() => setStep("intro")} />
        <WebView
          source={{ uri: consentUrl }}
          style={{ flex: 1 }}
          onNavigationStateChange={onWebViewNavigationStateChange}
          startInLoadingState
          renderLoading={() => (
            <View style={s.centerWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={s.loadingText}>Loading bank authorization…</Text>
            </View>
          )}
        />
      </SafeAreaView>
    );
  }

  // ── Loading — waiting for WebView but URL not ready yet ──────────────────────
  if (step === "webview" && !consentUrl) {
    return (
      <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
        <BackBar title="Link Bank Account" onBack={() => router.back()} />
        <View style={s.centerWrap}>
          <Saathi expression="thinking" size={100} animate message="Connecting to bank gateway…" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Polling ──────────────────────────────────────────────────────────────────
  if (step === "polling") {
    return (
      <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
        <BackBar title="Verifying Consent" onBack={() => router.back()} />
        <View style={s.centerWrap}>
          <Saathi expression="reviewing_documents" size={100} animate message="Fetching your bank data securely…" />
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (step === "success" && financialProfile) {
    const turnover = financialProfile.estimated_annual_turnover;
    const balance = financialProfile.monthly_avg_balance;
    const credits = financialProfile.avg_monthly_credits;

    return (
      <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
        <BackBar title="Bank Linked" onBack={() => router.replace("/(tabs)")} />
        <View style={s.successWrap}>
          <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: "center", marginBottom: 8 }}>
            <Saathi expression="celebrating" size={110} animate />
          </Animated.View>

          <Animated.View entering={SlideInUp.delay(200).duration(400)} style={{ alignItems: "center", marginBottom: spacing.lg }}>
            <Text style={s.successTitle}>Bank Linked!</Text>
            <Text style={s.successSubtitle}>Your financial profile has been updated automatically.</Text>
          </Animated.View>

          <Animated.View entering={SlideInUp.delay(350).duration(400)} style={s.statsCard}>
            <Text style={s.statsTitle}>Fetched from Your Bank</Text>
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statVal}>₹{(turnover / 100000).toFixed(1)}L</Text>
                <Text style={s.statKey}>Annual Turnover</Text>
              </View>
              <View style={[s.statBox, s.statBorder]}>
                <Text style={s.statVal}>₹{(balance / 1000).toFixed(0)}K</Text>
                <Text style={s.statKey}>Avg Balance</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statVal}>₹{(credits / 1000).toFixed(0)}K</Text>
                <Text style={s.statKey}>Monthly Credits</Text>
              </View>
            </View>
            <View style={s.accountCount}>
              <Text style={s.accountCountText}>
                {financialProfile.num_accounts} account{financialProfile.num_accounts !== 1 ? "s" : ""} linked
                • {financialProfile.data_months} months of data
              </Text>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={s.ctaBtn}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnText}>Back to Dashboard</Text>
            <ChevronRight size={18} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <BackBar title="Link Bank Account" onBack={() => router.back()} />
      <View style={s.centerWrap}>
        <Saathi expression="happy" size={100} animate message="Koi problem nahi — baad mein try kar sakte hain!" />
        <Text style={s.errorText}>{error || "Something went wrong"}</Text>
        <TouchableOpacity style={[s.ctaBtn, { marginTop: 24, paddingHorizontal: 32 }]} onPress={() => setStep("intro")} activeOpacity={0.85}>
          <RefreshCw size={16} color="#FFF" strokeWidth={2.5} />
          <Text style={s.ctaBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF" },

  introWrap: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: "center",
  },

  benefitsCard: {
    width: "100%",
    backgroundColor: colors.surface2,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 10,
  },
  benefitsTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitText: { fontSize: 14, fontFamily: fonts.medium, color: colors.text, flex: 1 },

  securityNote: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#EDE9FE",
    borderRadius: radius.xl,
    padding: spacing.sm2,
    marginBottom: spacing.xl,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "#5B21B6",
    lineHeight: 18,
  },

  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 15,
    width: "100%",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaBtnText: { fontSize: 16, fontFamily: fonts.displayBold, color: "#FFF" },
  skipText: { fontSize: 14, fontFamily: fonts.medium, color: colors.textMuted },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: fonts.medium, color: colors.textMuted },
  errorText: { marginTop: 16, fontSize: 14, fontFamily: fonts.medium, color: "#EF4444", textAlign: "center" },

  successWrap: { flex: 1, alignItems: "center", padding: spacing.md, paddingTop: 24 },
  successTitle: { fontSize: 24, fontFamily: fonts.displayBold, color: colors.text, marginBottom: 8 },
  successSubtitle: { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center", lineHeight: 20 },

  statsCard: {
    width: "100%",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.primary + "40",
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  statsTitle: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: spacing.sm2 },
  statsRow: { flexDirection: "row" },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 8 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.primary + "30" },
  statVal: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.primaryDark },
  statKey: { fontSize: 10, fontFamily: fonts.medium, color: colors.primaryDark, opacity: 0.7, marginTop: 2 },
  accountCount: { marginTop: 10, alignItems: "center" },
  accountCountText: { fontSize: 12, fontFamily: fonts.medium, color: colors.primaryDark, opacity: 0.8 },
});
