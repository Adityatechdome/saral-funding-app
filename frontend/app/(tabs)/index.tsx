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
import { Bell, ChevronRight, Phone, Building2, TrendingUp, AlertCircle, Calendar, Zap } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, elevation } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { DashboardSkeleton } from "@/src/components/SkeletonLoader";
import ReadinessRing from "@/src/components/ReadinessRing";

type Match = { scheme_id: string; name: string; score: number; funding_estimate: number; subsidy_estimate: number; reason: string };
type DashData = { matches: Match[]; funding_estimate: number; subsidy_estimate: number; readiness_score: number };
type BankRec = { bank_id: string; name: string; short_name: string; score: number; interest_range: string; why: string };
type ReadinessAction = { title: string; detail: string; weight: string };
type Readiness = { score: number; max: number; actions: ReadinessAction[] };

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [next, setNext] = useState<any>(null);
  const [bankRec, setBankRec] = useState<BankRec | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [me, m, c, banks, ready] = await Promise.all([
        apiGet<any>("/auth/me"),
        apiGet<DashData>("/match/me"),
        apiGet<any[]>("/consultations/me").catch(() => []),
        apiGet<{ recommendations: BankRec[] }>("/banks/recommend/me").catch(() => ({ recommendations: [] })),
        apiGet<Readiness>("/readiness/me").catch(() => null),
      ]);
      setUser(me);
      setData(m);
      setNext((c || []).find((x: any) => ["new", "confirmed", "called", "follow_up", "interested"].includes(x.status)) || null);
      setBankRec((banks.recommendations || [])[0] || null);
      setReadiness(ready);
      // Evaluate alerts in background
      apiPost<{ new_alerts: any[] }>("/alerts/evaluate", {}).catch(() => {});
      const notif = await apiGet<any[]>("/notifications/me").catch(() => []);
      setAlerts(notif.filter((n: any) => !n.read).slice(0, 3));
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

  const isAdmin = user?.role && user.role !== "user";
  const score = readiness?.score ?? data?.readiness_score ?? 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="dashboard-screen">
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
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name} numberOfLines={1}>{user?.full_name || "Friend"}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            {isAdmin && (
              <TouchableOpacity
                testID="admin-shortcut"
                onPress={() => router.push("/admin")}
                style={[styles.headerBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <Text style={{ fontSize: 13, color: "#FFF", fontFamily: fonts.bold }}>Admin</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              testID="bell-btn"
              onPress={() => router.push("/notifications")}
              style={styles.headerBtn}
            >
              <Bell size={18} color={colors.text} strokeWidth={2} />
              {alerts.length > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Readiness Hero Card ── */}
        <TouchableOpacity
          style={styles.heroCard}
          testID="readiness-card"
          onPress={() => router.push("/readiness")}
          activeOpacity={0.92}
        >
          <Text style={styles.heroLabel}>Funding Readiness Score</Text>

          <View style={styles.heroInner}>
            <ReadinessRing score={score} size={140} />

            <View style={styles.heroStats}>
              <View style={styles.heroStatBox}>
                <TrendingUp size={14} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                <Text style={styles.heroStatVal}>{formatINR(data?.funding_estimate || 0)}</Text>
                <Text style={styles.heroStatKey}>Eligible</Text>
              </View>
              <View style={[styles.heroStatBox, { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)", marginTop: 8, paddingTop: 12 }]}>
                <Zap size={14} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                <Text style={styles.heroStatVal}>{formatINR(data?.subsidy_estimate || 0)}</Text>
                <Text style={styles.heroStatKey}>Subsidy</Text>
              </View>
            </View>
          </View>

          {readiness && readiness.actions.length > 0 && (
            <View style={styles.heroCta}>
              <AlertCircle size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <Text style={styles.heroCtaText}>
                {readiness.actions.length} action{readiness.actions.length > 1 ? "s" : ""} to improve your score
              </Text>
              <ChevronRight size={12} color="rgba(255,255,255,0.7)" strokeWidth={2} style={{ marginLeft: "auto" }} />
            </View>
          )}
        </TouchableOpacity>

        <View style={{ paddingHorizontal: spacing.md }}>

          {/* ── Smart Alerts (max 2) ── */}
          {alerts.length > 0 && (
            <View style={styles.card} testID="alerts-widget">
              <View style={styles.rowBetween}>
                <Text style={styles.sectionLabel}>Smart Alerts</Text>
                <TouchableOpacity onPress={() => router.push("/notifications")}>
                  <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
              </View>
              {alerts.slice(0, 2).map((n: any) => (
                <View key={n.id} style={styles.alertRow}>
                  <View style={styles.alertPulse} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle} numberOfLines={1}>{n.title}</Text>
                    <Text style={styles.alertBody} numberOfLines={2}>{n.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Top Bank Match ── */}
          {bankRec && (
            <TouchableOpacity
              testID="bank-rec-widget"
              style={[styles.card, styles.bankCard]}
              onPress={() => router.push("/banks")}
              activeOpacity={0.85}
            >
              <View style={styles.bankBadge}>
                <Building2 size={16} color={colors.primaryDark} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Top Bank Match</Text>
                <Text style={styles.bankName}>{bankRec.name}</Text>
                <Text style={styles.bankMeta}>{bankRec.interest_range} interest  •  {bankRec.score}% match</Text>
                <Text style={styles.bankWhy} numberOfLines={2}>{bankRec.why}</Text>
              </View>
              <ChevronRight size={18} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* ── Quick Actions ── */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <TouchableOpacity
              testID="book-cta"
              style={[styles.quickAction, { flex: 1.5 }]}
              onPress={() => router.push("/booking")}
              activeOpacity={0.85}
            >
              <Phone size={18} color={colors.primaryDark} strokeWidth={2} />
              <Text style={styles.qaTitle}>Free Consultation</Text>
              <Text style={styles.qaSub}>30-min advisor call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="banks-cta"
              style={styles.quickAction}
              onPress={() => router.push("/banks")}
              activeOpacity={0.85}
            >
              <Building2 size={18} color={colors.primaryDark} strokeWidth={2} />
              <Text style={styles.qaTitle}>All Banks</Text>
              <Text style={styles.qaSub}>Compare offers</Text>
            </TouchableOpacity>
          </View>

          {/* ── Upcoming Consultation ── */}
          {next && (
            <View style={styles.card} testID="upcoming-card">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Calendar size={14} color={colors.primaryDark} strokeWidth={2} />
                <Text style={styles.sectionLabel}>Upcoming Consultation</Text>
              </View>
              <Text style={styles.consultType}>{next.consultation_type}</Text>
              <Text style={styles.consultMeta}>{next.date}  •  {next.time_slot}</Text>
              <View style={styles.consultStatus}>
                <Text style={styles.consultStatusText}>{next.status}</Text>
              </View>
            </View>
          )}

          {/* ── Recommended Schemes ── */}
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Recommended Schemes</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/funding-case")} testID="view-all-btn">
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          {(data?.matches || []).slice(0, 3).map((m) => (
            <TouchableOpacity
              key={m.scheme_id}
              testID={`match-${m.scheme_id}`}
              style={styles.schemeCard}
              onPress={() => router.push({ pathname: "/scheme/[id]", params: { id: m.scheme_id } })}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.schemeName} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.schemeReason} numberOfLines={2}>{m.reason}</Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  <Text style={styles.schemeAmount}>Up to {formatINR(m.funding_estimate)}</Text>
                  {m.subsidy_estimate > 0 && (
                    <Text style={styles.schemeSub}>Subsidy {formatINR(m.subsidy_estimate)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>{m.score}%</Text>
                <Text style={styles.scoreSubText}>match</Text>
              </View>
            </TouchableOpacity>
          ))}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm2,
  },
  greeting: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
  },
  name: {
    fontSize: 21,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginTop: 1,
  },
  headerBtn: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  badgeDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: "#FFF",
  },

  // Hero card
  heroCard: {
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
  heroLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroStats: {
    flex: 1,
  },
  heroStatBox: {
    gap: 4,
  },
  heroStatVal: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroStatKey: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "rgba(255,255,255,0.65)",
  },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  heroCtaText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: "rgba(255,255,255,0.75)",
  },

  // Generic card
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    ...elevation.l1,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Action items
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  actionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  actionNumText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  actionTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 18,
  },
  actionDetail: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  weightPill: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  weightHigh: {
    backgroundColor: "#FEF3C7",
  },
  weightText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  weightTextHigh: {
    color: "#92400E",
  },

  // Alerts
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  viewAll: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alertPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  alertTitle: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 18,
  },
  alertBody: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },

  // AA / Link Bank
  aaBannerCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary + "40",
  },
  aaBannerTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  aaBannerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.primaryDark,
    opacity: 0.75,
    marginTop: 2,
  },
  aaIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  aaLinkedTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  aaLinkedSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Bank card
  bankCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderColor: colors.primarySoft,
  },
  bankBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bankName: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginTop: 2,
  },
  bankMeta: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    marginTop: 3,
  },
  bankWhy: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },

  // Quick actions
  quickAction: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm2,
    gap: 4,
    ...elevation.l1,
  },
  qaTitle: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginTop: 6,
  },
  qaSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 1,
  },

  // Consultation
  consultType: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  consultMeta: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 4,
  },
  consultStatus: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  consultStatusText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    textTransform: "capitalize",
  },

  // Scheme cards
  schemeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    ...elevation.l1,
  },
  schemeName: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  schemeReason: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  schemeAmount: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  schemeSub: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  scoreBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
  },
  scoreSubText: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: colors.primaryDark,
    marginTop: -2,
  },
});
