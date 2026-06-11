/**
 * Funding Case tab — user's active funding file.
 * Shows readiness score + action items, scheme matches, bank recommendations.
 * Replaces the Schemes tab as the second tab in navigation.
 */
import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ChevronRight, TrendingUp, Building2, AlertCircle,
  CheckCircle2, Circle, Zap, FileText, Clock, Star,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, elevation } from "@/src/theme";
import { apiGet } from "@/src/api";
import { FundingCaseSkeleton } from "@/src/components/SkeletonLoader";
import ReadinessRing from "@/src/components/ReadinessRing";

type Match = { scheme_id: string; name: string; score: number; funding_estimate: number; subsidy_estimate: number; reason: string };
type BankRec = { bank_id: string; name: string; short_name: string; score: number; interest_range: string; why: string; processing_time_days?: number };
type ReadinessAction = { title: string; detail: string; weight: string };
type Readiness = { score: number; max: number; actions: ReadinessAction[]; breakdown?: { label: string; score: number; max: number }[] };

export default function FundingCase() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [banks, setBanks] = useState<BankRec[]>([]);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [funding, setFunding] = useState({ total: 0, subsidy: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [adminRec, setAdminRec] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [m, b, r, d, rec] = await Promise.all([
        apiGet<{ matches: Match[]; funding_estimate: number; subsidy_estimate: number }>("/match/me"),
        apiGet<{ recommendations: BankRec[] }>("/banks/recommend/me").catch(() => ({ recommendations: [] })),
        apiGet<Readiness>("/readiness/me").catch(() => null),
        apiGet<any[]>("/documents/me").catch(() => []),
        apiGet<any>("/recommendations/me").catch(() => null),
      ]);
      setMatches(m.matches || []);
      setFunding({ total: m.funding_estimate || 0, subsidy: m.subsidy_estimate || 0 });
      setBanks((b.recommendations || []).slice(0, 3));
      setReadiness(r);
      setDocs(Array.isArray(d) ? d : []);
      setAdminRec(rec);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const score = readiness?.score ?? 0;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]}>
        <FundingCaseSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="funding-case-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.title}>My Funding Case</Text>
          <Text style={s.sub}>Your personalised funding file</Text>
        </View>

        {/* ── Admin Recommendation Banner ── */}
        {adminRec && (
          <View style={s.adminRecCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <View style={s.adminRecIconWrap}>
                <Star size={14} color="#065F46" strokeWidth={2.5} />
              </View>
              <Text style={s.adminRecTitle}>Advisor Recommendation</Text>
            </View>
            <Text style={s.adminRecBody}>
              Your advisor has reviewed your documents and recommended:
            </Text>
            {adminRec.schemes && adminRec.schemes.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={s.adminRecSubLabel}>Schemes</Text>
                {adminRec.schemes.map((name: string, i: number) => (
                  <Text key={i} style={s.adminRecItem}>• {name}</Text>
                ))}
              </View>
            )}
            {adminRec.banks && adminRec.banks.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={s.adminRecSubLabel}>Banks</Text>
                {adminRec.banks.map((name: string, i: number) => (
                  <Text key={i} style={s.adminRecItem}>• {name}</Text>
                ))}
              </View>
            )}
            {adminRec.note ? (
              <Text style={s.adminRecNote}>"{adminRec.note}"</Text>
            ) : null}
            <Text style={s.adminRecDate}>
              Recommended on{" "}
              {adminRec.created_at
                ? new Date(adminRec.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </Text>
          </View>
        )}

        {/* ── Readiness + Estimates ── */}
        <TouchableOpacity
          style={s.readinessCard}
          onPress={() => router.push("/readiness")}
          activeOpacity={0.92}
          testID="readiness-link"
        >
          <View style={s.readinessInner}>
            <ReadinessRing score={score} size={110} />
            <View style={s.readinessStats}>
              <View style={s.statRow}>
                <TrendingUp size={13} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                <View>
                  <Text style={s.statVal}>{formatINR(funding.total)}</Text>
                  <Text style={s.statKey}>Eligible</Text>
                </View>
              </View>
              <View style={[s.statRow, { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", marginTop: 8, paddingTop: 10 }]}>
                <Zap size={13} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                <View>
                  <Text style={s.statVal}>{formatINR(funding.subsidy)}</Text>
                  <Text style={s.statKey}>Subsidy</Text>
                </View>
              </View>
            </View>
          </View>
          {readiness && readiness.actions.length > 0 && (
            <View style={s.readinessCta}>
              <AlertCircle size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <Text style={s.readinessCtaText}>
                {readiness.actions.length} action{readiness.actions.length !== 1 ? "s" : ""} to improve score
              </Text>
              <ChevronRight size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} style={{ marginLeft: "auto" }} />
            </View>
          )}
        </TouchableOpacity>

        <View style={{ paddingHorizontal: spacing.md }}>

          {/* ── Documents Section ── */}
          {(() => {
            const pendingCount = docs.filter((d) => d.status === "pending").length;
            return (
              <View style={s.card} testID="documents-section">
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <Text style={s.sectionLabel}>Documents</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <View style={s.docCountPill}>
                      <Text style={s.docCountText}>{docs.length} uploaded</Text>
                    </View>
                    {pendingCount > 0 && (
                      <View style={[s.docCountPill, { backgroundColor: "#FEF3C7" }]}>
                        <Clock size={10} color="#92400E" strokeWidth={2.5} />
                        <Text style={[s.docCountText, { color: "#92400E" }]}>{pendingCount} pending</Text>
                      </View>
                    )}
                  </View>
                </View>
                {docs.length > 0 && (
                  <View style={s.docChips}>
                    {docs.slice(0, 5).map((d) => {
                      const bgMap: Record<string, string> = {
                        verified: colors.primarySoft,
                        rejected: "#FEE2E2",
                        pending: "#FEF3C7",
                      };
                      const textMap: Record<string, string> = {
                        verified: colors.primaryDark,
                        rejected: "#DC2626",
                        pending: "#92400E",
                      };
                      return (
                        <View
                          key={d.id}
                          style={[s.docChip, { backgroundColor: bgMap[d.status] || "#FEF3C7" }]}
                        >
                          <FileText size={10} color={textMap[d.status] || "#92400E"} strokeWidth={2.5} />
                          <Text
                            style={[s.docChipText, { color: textMap[d.status] || "#92400E" }]}
                            numberOfLines={1}
                          >
                            {d.doc_type}
                          </Text>
                        </View>
                      );
                    })}
                    {docs.length > 5 && (
                      <View style={[s.docChip, { backgroundColor: colors.surface2 }]}>
                        <Text style={[s.docChipText, { color: colors.textMuted }]}>+{docs.length - 5} more</Text>
                      </View>
                    )}
                  </View>
                )}
                <TouchableOpacity
                  style={s.uploadDocBtn}
                  onPress={() => router.push("/documents")}
                  activeOpacity={0.85}
                >
                  <FileText size={14} color={colors.primaryDark} strokeWidth={2} />
                  <Text style={s.uploadDocBtnText}>Upload Documents</Text>
                  <ChevronRight size={14} color={colors.primaryDark} strokeWidth={2} style={{ marginLeft: "auto" }} />
                </TouchableOpacity>
              </View>
            );
          })()}

          {/* ── Action Items ── */}
          {readiness && readiness.actions.length > 0 && (
            <View style={s.card} testID="action-items">
              <Text style={s.sectionLabel}>Improve Your Score</Text>
              {readiness.actions.slice(0, 4).map((a, i) => (
                <View key={i} style={[s.actionRow, i < Math.min(readiness.actions.length, 4) - 1 && s.actionBorder]}>
                  <View style={[s.actionNum, a.weight === "High" && s.actionNumHigh]}>
                    <Text style={[s.actionNumText, a.weight === "High" && s.actionNumTextHigh]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.actionTitle}>{a.title}</Text>
                    <Text style={s.actionDetail} numberOfLines={2}>{a.detail}</Text>
                  </View>
                  <View style={[s.weightPill, a.weight === "High" && s.weightHigh]}>
                    <Text style={[s.weightText, a.weight === "High" && s.weightTextHigh]}>{a.weight}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Scheme Matches ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Scheme Matches</Text>
            <Text style={s.sectionCount}>{matches.length} found</Text>
          </View>

          {matches.map((m) => (
            <TouchableOpacity
              key={m.scheme_id}
              testID={`scheme-${m.scheme_id}`}
              style={s.schemeCard}
              onPress={() => router.push({ pathname: "/scheme/[id]", params: { id: m.scheme_id } })}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.schemeName} numberOfLines={1}>{m.name}</Text>
                <Text style={s.schemeReason} numberOfLines={2}>{m.reason}</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <Text style={s.schemeAmount}>Up to {formatINR(m.funding_estimate)}</Text>
                  {m.subsidy_estimate > 0 && (
                    <Text style={s.schemeSub}>Subsidy {formatINR(m.subsidy_estimate)}</Text>
                  )}
                </View>
              </View>
              <View style={s.scoreBadge}>
                <Text style={s.scoreVal}>{m.score}%</Text>
                <Text style={s.scoreKey}>match</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* ── Bank Recommendations ── */}
          <View style={[s.sectionHeader, { marginTop: 8 }]}>
            <Text style={s.sectionTitle}>Bank Recommendations</Text>
            <TouchableOpacity onPress={() => router.push("/banks")}>
              <Text style={s.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          {banks.map((b) => (
            <TouchableOpacity
              key={b.bank_id}
              testID={`bank-${b.bank_id}`}
              style={s.bankCard}
              onPress={() => router.push({ pathname: "/bank/[id]", params: { id: b.bank_id } })}
              activeOpacity={0.85}
            >
              <View style={s.bankBadge}>
                <Building2 size={16} color={colors.primaryDark} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.bankName}>{b.name}</Text>
                <Text style={s.bankMeta}>{b.interest_range}  •  {b.score}% match</Text>
                {b.processing_time_days && (
                  <Text style={s.bankProcess}>~{b.processing_time_days} day processing</Text>
                )}
              </View>
              <ChevronRight size={16} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          ))}

          {/* ── Book Consultation CTA ── */}
          <TouchableOpacity
            style={s.bookCta}
            onPress={() => router.push("/booking")}
            activeOpacity={0.85}
            testID="book-consult-cta"
          >
            <Text style={s.bookCtaTitle}>Ready to apply?</Text>
            <Text style={s.bookCtaSub}>Book a free 30-min advisor call to prepare your application</Text>
            <View style={s.bookCtaBtn}>
              <Text style={s.bookCtaBtnText}>Book Free Consultation</Text>
              <ChevronRight size={16} color={colors.primaryDark} strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm2,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  sub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Readiness card
  readinessCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm2,
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: spacing.md,
    ...elevation.l1,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  readinessInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  readinessStats: { flex: 1, gap: 0 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statVal: { fontSize: 17, fontFamily: fonts.displayBold, color: "#FFF" },
  statKey: { fontSize: 10, fontFamily: fonts.medium, color: "rgba(255,255,255,0.65)", marginTop: 1 },
  readinessCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  readinessCtaText: { fontSize: 12, fontFamily: fonts.medium, color: "rgba(255,255,255,0.8)" },

  // Cards
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text },
  sectionCount: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  viewAll: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary },

  // Action items
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  actionBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  actionNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionNumHigh: { backgroundColor: "#FEE2E2" },
  actionNumText: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted },
  actionNumTextHigh: { color: "#DC2626" },
  actionTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  actionDetail: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  weightPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
  },
  weightHigh: { backgroundColor: "#FEE2E2" },
  weightText: { fontSize: 10, fontFamily: fonts.bold, color: colors.textMuted },
  weightTextHigh: { color: "#DC2626" },

  // Scheme cards
  schemeCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  schemeName: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.text },
  schemeReason: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  schemeAmount: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primary },
  schemeSub: { fontSize: 12, fontFamily: fonts.medium, color: "#F59E0B" },
  scoreBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 50,
    flexShrink: 0,
  },
  scoreVal: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.primaryDark },
  scoreKey: { fontSize: 9, fontFamily: fonts.medium, color: colors.primaryDark, opacity: 0.7 },

  // Bank cards
  bankCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    padding: spacing.md,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bankBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  bankMeta: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 2 },
  bankProcess: { fontSize: 11, fontFamily: fonts.medium, color: colors.primary, marginTop: 2 },

  // Admin recommendation
  adminRecCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm2,
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    padding: spacing.md,
  },
  adminRecIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  adminRecTitle: { fontSize: 14, fontFamily: fonts.displayBold, color: "#065F46" },
  adminRecBody: { fontSize: 13, fontFamily: fonts.regular, color: "#065F46", lineHeight: 18 },
  adminRecSubLabel: { fontSize: 10, fontFamily: fonts.bold, color: "#065F46", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  adminRecItem: { fontSize: 13, fontFamily: fonts.medium, color: "#065F46", lineHeight: 20 },
  adminRecNote: { fontSize: 13, fontFamily: fonts.regular, color: "#065F46", fontStyle: "italic", marginTop: 8, lineHeight: 18 },
  adminRecDate: { fontSize: 11, fontFamily: fonts.regular, color: "#6EE7B7", marginTop: 8 },

  // Documents
  docCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  docCountText: { fontSize: 10, fontFamily: fonts.bold, color: colors.primaryDark },
  docChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  docChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  docChipText: { fontSize: 11, fontFamily: fonts.medium },
  uploadDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  uploadDocBtnText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primaryDark },

  // Book CTA
  bookCta: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.primary + "40",
    padding: spacing.md,
    marginTop: 8,
    marginBottom: spacing.md,
  },
  bookCtaTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.primaryDark },
  bookCtaSub: { fontSize: 13, fontFamily: fonts.regular, color: colors.primaryDark, opacity: 0.8, marginTop: 4, lineHeight: 18 },
  bookCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  bookCtaBtnText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.primaryDark },
});
