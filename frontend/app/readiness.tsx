import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue, withTiming, useAnimatedStyle, Easing,
} from "react-native-reanimated";
import {
  TrendingUp, CheckCircle2, Circle, ChevronRight,
  Percent, DollarSign, Award, AlertCircle, ArrowRight,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import ReadinessRing from "@/src/components/ReadinessRing";
import { SkeletonBox } from "@/src/components/SkeletonLoader";

type BreakdownItem = { label: string; score: number; max: number };
type Action = { title: string; detail: string; weight: string; cta: string; priority: string };
type Readiness = {
  score: number; max: number; score_label: string;
  funding_capacity: { min: number; max: number };
  approval_probability: number;
  breakdown: BreakdownItem[];
  actions: Action[];
};

// Animated fill bar for breakdown factors
function FactorBar({ item, index }: { item: BreakdownItem; index: number }) {
  const pct = item.max > 0 ? item.score / item.max : 0;
  const progress = useSharedValue(0);
  const complete = pct === 1;

  useEffect(() => {
    const delay = index * 80;
    const timeout = setTimeout(() => {
      progress.value = withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) });
    }, delay);
    return () => clearTimeout(timeout);
  }, [pct, index]);

  const animStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={bar.row}>
      <View style={bar.left}>
        {complete
          ? <CheckCircle2 size={14} color={colors.primary} strokeWidth={2.5} />
          : <Circle size={14} color={colors.textDim} strokeWidth={2} />
        }
        <Text style={bar.label}>{item.label}</Text>
      </View>
      <View style={bar.right}>
        <View style={bar.track}>
          <Animated.View style={[bar.fill, animStyle, { backgroundColor: complete ? colors.primary : colors.warning }]} />
        </View>
        <Text style={[bar.pts, { color: complete ? colors.primaryDark : colors.textMuted }]}>
          {item.score}/{item.max}
        </Text>
      </View>
    </View>
  );
}
const bar = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  left: { flexDirection: "row", alignItems: "center", gap: 8, width: 170 },
  label: { fontSize: 13, fontFamily: fonts.medium, color: colors.text, flex: 1 },
  right: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1, height: 7, backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  pts: { fontSize: 11, fontFamily: fonts.bold, width: 32, textAlign: "right" },
});

// CTA route mapping
const ctaRoutes: Record<string, string> = {
  profile: "/onboarding/profile",
  business: "/onboarding/business",
  assessment: "/onboarding/business",
  gst: "/onboarding/business",
  udyam: "/onboarding/business",
  documents: "/documents",
};

function ActionCard({ item, index }: { item: Action; index: number }) {
  const router = useRouter();
  const isHigh = item.priority === "high";
  return (
    <View style={[ac.card, isHigh && ac.cardHigh]}>
      <View style={ac.header}>
        <View style={[ac.numBadge, isHigh && ac.numBadgeHigh]}>
          <Text style={[ac.num, isHigh && ac.numHigh]}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ac.title}>{item.title}</Text>
        </View>
        <View style={[ac.weightBadge, isHigh && ac.weightBadgeHigh]}>
          <Text style={[ac.weight, isHigh && ac.weightHigh]}>{item.weight}</Text>
        </View>
      </View>
      <Text style={ac.detail}>{item.detail}</Text>
      {ctaRoutes[item.cta] && (
        <TouchableOpacity
          style={ac.ctaBtn}
          onPress={() => router.push(ctaRoutes[item.cta] as any)}
        >
          <Text style={ac.ctaText}>Fix now</Text>
          <ArrowRight size={12} color={colors.primaryDark} strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}
const ac = StyleSheet.create({
  card: {
    backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginBottom: 10,
  },
  cardHigh: { borderColor: colors.primarySoft, backgroundColor: "#FAFFF8" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  numBadge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceAlt,
    alignItems: "center", justifyContent: "center",
  },
  numBadgeHigh: { backgroundColor: colors.primarySoft },
  num: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  numHigh: { color: colors.primaryDark },
  title: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text, lineHeight: 19 },
  weightBadge: {
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: radius.pill,
  },
  weightBadgeHigh: { backgroundColor: "#DCFCE7" },
  weight: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted },
  weightHigh: { color: colors.primaryDark },
  detail: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 18, marginBottom: 8 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: colors.primarySoft, paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: radius.pill,
  },
  ctaText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },
});

// Stat pill for capacity / probability
function StatPill({ icon, label, value, sub, color: c = colors.primary }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <View style={sp.wrap}>
      <View style={[sp.icon, { backgroundColor: c + "22" }]}>{icon}</View>
      <View>
        <Text style={sp.label}>{label}</Text>
        <Text style={[sp.value, { color: c }]}>{value}</Text>
        {sub && <Text style={sp.sub}>{sub}</Text>}
      </View>
    </View>
  );
}
const sp = StyleSheet.create({
  wrap: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, padding: 12,
  },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  value: { fontSize: 17, fontFamily: fonts.displayBold, marginTop: 1 },
  sub: { fontSize: 10, fontFamily: fonts.regular, color: colors.textDim, marginTop: 1 },
});

function scoreColor(score: number) {
  if (score >= 70) return colors.primary;
  if (score >= 40) return colors.warning;
  return colors.danger;
}

export default function ReadinessScreen() {
  const router = useRouter();
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Readiness>("/readiness/me")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
        <BackBar title="Funding Readiness" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 12 }}>
          {[180, 120, 300, 200].map((h, i) => (
            <SkeletonBox key={i} width="100%" height={h} borderRadius={radius.xxl} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const color = scoreColor(data.score);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="readiness-screen">
      <BackBar title="Funding Readiness" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Hero score card */}
        <View style={[styles.heroCard, { borderColor: color + "44" }]}>
          <View style={styles.heroRow}>
            <View style={{ alignItems: "center" }}>
              <ReadinessRing score={data.score} size={140} />
              <View style={[styles.labelBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
                <Text style={[styles.labelText, { color }]}>{data.score_label}</Text>
              </View>
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.heroTitle}>Your Score</Text>
              <Text style={[styles.heroScore, { color }]}>{data.score}<Text style={styles.heroMax}>/100</Text></Text>
              <Text style={styles.heroDesc}>
                {data.score >= 70
                  ? "You're in great shape to apply for funding. Most banks will pre-qualify you."
                  : data.score >= 40
                  ? "You're on track. A few improvements will significantly boost your eligibility."
                  : "Let's build your funding profile step by step. Start with the actions below."
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Funding Capacity + Approval Probability */}
        <View style={styles.pillRow}>
          <StatPill
            icon={<DollarSign size={16} color={colors.primaryDark} strokeWidth={2} />}
            label="Funding Capacity"
            value={`${formatINR(data.funding_capacity.min)}–${formatINR(data.funding_capacity.max)}`}
            sub="estimated range"
            color={colors.primaryDark}
          />
          <StatPill
            icon={<Percent size={16} color="#7C3AED" strokeWidth={2} />}
            label="Approval Odds"
            value={`${data.approval_probability}%`}
            sub="based on profile"
            color="#7C3AED"
          />
        </View>

        {/* Score Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Award size={14} color={colors.primaryDark} strokeWidth={2} />
            </View>
            <Text style={styles.sectionTitle}>Score Breakdown</Text>
          </View>
          {data.breakdown.map((item, i) => (
            <FactorBar key={item.label} item={item} index={i} />
          ))}
        </View>

        {/* Improvement Actions */}
        {data.actions.length > 0 && (
          <View>
            <View style={styles.sectionHeader2}>
              <AlertCircle size={14} color={colors.warning} strokeWidth={2} />
              <Text style={styles.sectionTitle2}>
                {data.actions.length} action{data.actions.length !== 1 ? "s" : ""} to improve your score
              </Text>
            </View>
            {data.actions.map((a, i) => (
              <ActionCard key={i} item={a} index={i} />
            ))}
          </View>
        )}

        {/* All good */}
        {data.actions.length === 0 && (
          <View style={styles.perfectCard}>
            <CheckCircle2 size={32} color={colors.primary} strokeWidth={2} />
            <Text style={styles.perfectTitle}>Profile Complete!</Text>
            <Text style={styles.perfectSub}>Your profile is fully optimised. Book a consultation to start your funding journey.</Text>
          </View>
        )}

        {/* Book Consultation CTA */}
        <TouchableOpacity style={styles.bookBtn} onPress={() => router.push("/booking")} activeOpacity={0.85}>
          <TrendingUp size={16} color="#FFF" strokeWidth={2} />
          <Text style={styles.bookBtnText}>Book Free Consultation</Text>
          <ChevronRight size={16} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#FFF", borderRadius: radius.xxl,
    borderWidth: 1.5, padding: spacing.md, marginBottom: 12,
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  labelBadge: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1,
  },
  labelText: { fontSize: 12, fontFamily: fonts.bold },
  heroRight: { flex: 1, paddingTop: 4 },
  heroTitle: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  heroScore: { fontSize: 52, fontFamily: fonts.displayBold, lineHeight: 60, letterSpacing: -2 },
  heroMax: { fontSize: 20, color: colors.textDim, fontFamily: fonts.regular },
  heroDesc: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 18, marginTop: 6 },

  pillRow: { flexDirection: "row", gap: 10, marginBottom: 12 },

  section: {
    backgroundColor: "#FFF", borderRadius: radius.xxl, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginBottom: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionIcon: {
    width: 28, height: 28, borderRadius: radius.md,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },

  sectionHeader2: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle2: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },

  perfectCard: {
    alignItems: "center", backgroundColor: "#FFF", borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.primarySoft, padding: spacing.lg, marginBottom: 12, gap: 8,
  },
  perfectTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.text },
  perfectSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center", lineHeight: 18 },

  bookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.xl, paddingVertical: 15, marginTop: 4,
  },
  bookBtnText: { fontSize: 15, fontFamily: fonts.displayBold, color: "#FFF" },
});
