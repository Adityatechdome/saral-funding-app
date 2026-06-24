import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell, ChevronRight, Phone, Building2, TrendingUp, AlertCircle, Calendar, Zap, FolderOpen, Landmark,
  Users, Target, BarChart2, FolderOpen as FolderIcon, Settings, Shield, Percent, Eye, MessageSquare,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, elevation } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { DashboardSkeleton, SkeletonBox } from "@/src/components/SkeletonLoader";
import ReadinessRing from "@/src/components/ReadinessRing";

type Match = { scheme_id: string; name: string; score: number; funding_estimate: number; subsidy_estimate: number; reason: string };
type DashData = { matches: Match[]; funding_estimate: number; subsidy_estimate: number; readiness_score: number };
type BankRec = { bank_id: string; name: string; short_name: string; score: number; interest_range: string; why: string };
type ReadinessAction = { title: string; detail: string; weight: string };
type Readiness = { score: number; max: number; actions: ReadinessAction[] };
type Overview = {
  total_users: number; total_admins: number; total_schemes: number;
  total_consultations: number; total_leads: number; total_chats: number;
  daily_active_users: number; conversion_rate: number;
  scheme_views: number; bank_recommendation_views: number;
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["users", "consultations", "leads", "settings"],
  manager: ["users", "consultations", "leads"],
  expert: ["consultations"],
  sales_executive: ["leads"],
  support_executive: ["consultations", "leads"],
};

function canAccess(role: string, module: string): boolean {
  if (role === "super_admin") return true;
  return (ROLE_PERMISSIONS[role] ?? []).includes(module);
}

const ALL_MODULES = [
  { id: "users",         label: "Users",          sub: "Manage & view",         Icon: Users,       color: colors.primarySoft, iconColor: colors.primaryDark },
  { id: "consultations", label: "Consultations",  sub: "Track & update",        Icon: Phone,       color: "#EDE9FE",          iconColor: "#5B21B6" },
  { id: "leads",         label: "CRM / Leads",    sub: "Pipeline & stages",     Icon: Target,      color: "#FEF3C7",          iconColor: "#92400E" },
  { id: "schemes",       label: "Schemes",         sub: "Enable & disable",      Icon: Landmark,    color: "#FFF7ED",          iconColor: "#C2410C" },
  { id: "documents",    label: "Documents",       sub: "Review & approve docs", Icon: FolderIcon,  color: "#F0FDF4",          iconColor: "#15803D" },
  { id: "analytics",    label: "Analytics",       sub: "Charts & trends",       Icon: BarChart2,   color: "#DBEAFE",          iconColor: "#1D4ED8" },
  { id: "notifications",label: "Notifications",   sub: "Broadcast to users",    Icon: Bell,        color: "#FEF3C7",          iconColor: "#B45309" },
  { id: "team",          label: "Team Members",   sub: "Invite & manage roles", Icon: Shield,      color: "#DCFCE7",          iconColor: "#15803D" },
  { id: "settings",     label: "Settings",        sub: "App configuration",     Icon: Settings,    color: "#F5F3FF",          iconColor: "#6D28D9" },
];

function StatCard({ label, value, Icon, color, iconColor }: { label: string; value: string; Icon: any; color: string; iconColor: string }) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.icon, { backgroundColor: color }]}>
        <Icon size={14} color={iconColor} strokeWidth={2} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    width: "31%",
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  icon: { width: 28, height: 28, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  value: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.text, lineHeight: 24 },
  label: { fontSize: 10, fontFamily: fonts.medium, color: colors.textMuted, marginTop: 3, lineHeight: 14 },
});

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [next, setNext] = useState<any>(null);
  const [bankRec, setBankRec] = useState<BankRec | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await apiGet<any>("/auth/me");
      setUser(me);

      if (me?.role && me.role !== "user") {
        // Admin: fetch overview data only
        const ov = await apiGet<Overview>("/admin/overview").catch(() => null);
        setOverview(ov);
      } else {
        // Normal user: fetch full dashboard data
        const [m, c, banks, ready] = await Promise.all([
          apiGet<DashData>("/match/me"),
          apiGet<any[]>("/consultations/me").catch(() => []),
          apiGet<{ recommendations: BankRec[] }>("/banks/recommend/me").catch(() => ({ recommendations: [] })),
          apiGet<Readiness>("/readiness/me").catch(() => null),
        ]);
        setData(m);
        setNext((c || []).find((x: any) => ["new", "confirmed", "called", "follow_up", "interested"].includes(x.status)) || null);
        setBankRec((banks.recommendations || [])[0] || null);
        setReadiness(ready);
        apiPost<{ new_alerts: any[] }>("/alerts/evaluate", {}).catch(() => {});
        const notif = await apiGet<any[]>("/notifications/me").catch(() => []);
        setAlerts(notif.filter((n: any) => !n.read).slice(0, 3));
      }
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

  // ── Admin Console View ──
  if (isAdmin) {
    const visibleModules = ALL_MODULES.filter((m) => canAccess(user.role, m.id));
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="admin-home-tab">
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
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name} numberOfLines={1}>{user?.full_name || "Admin"}</Text>
            </View>
            <TouchableOpacity
              testID="bell-btn"
              onPress={() => router.push("/notifications")}
              style={styles.headerBtn}
            >
              <Bell size={18} color={colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: spacing.md }}>
            {/* Role badge */}
            <View style={{ marginBottom: 14 }}>
              <View style={adStyles.roleBadge}>
                <Text style={adStyles.roleBadgeText}>Role: {user.role.replace(/_/g, " ").toUpperCase()}</Text>
              </View>
            </View>

            {/* Stats grid */}
            <Text style={adStyles.sectionLabel}>Overview</Text>
            <View style={adStyles.statsGrid}>
              <StatCard label="Total Users"    value={String(overview?.total_users ?? 0)}        Icon={Users}        color={colors.primarySoft} iconColor={colors.primaryDark} />
              <StatCard label="Daily Active"   value={String(overview?.daily_active_users ?? 0)} Icon={TrendingUp}   color="#DBEAFE"            iconColor="#1D4ED8" />
              <StatCard label="AI Chats"       value={String(overview?.total_chats ?? 0)}        Icon={MessageSquare} color="#EDE9FE"           iconColor="#5B21B6" />
              <StatCard label="Consultations"  value={String(overview?.total_consultations ?? 0)} Icon={Phone}       color="#FEF3C7"            iconColor="#92400E" />
              <StatCard label="Leads"          value={String(overview?.total_leads ?? 0)}        Icon={Target}       color="#FEE2E2"            iconColor="#DC2626" />
              <StatCard label="Schemes"        value={String(overview?.total_schemes ?? 0)}      Icon={Landmark}     color={colors.surfaceAlt}  iconColor={colors.textMuted} />
              <StatCard label="Conversion"     value={`${overview?.conversion_rate ?? 0}%`}      Icon={Percent}      color="#F0FDF4"            iconColor="#15803D" />
              <StatCard label="Scheme Views"   value={String(overview?.scheme_views ?? 0)}       Icon={Eye}          color="#FFF7ED"            iconColor="#C2410C" />
            </View>

            {/* Modules */}
            <Text style={[adStyles.sectionLabel, { marginTop: 20 }]}>Modules</Text>
            <View style={adStyles.modulesGrid}>
              {visibleModules.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  testID={`admin-nav-${m.id}`}
                  style={adStyles.moduleTile}
                  onPress={() => router.push((m.id === "documents" ? "/(tabs)/documents" : `/admin/${m.id}`) as any)}
                  activeOpacity={0.85}
                >
                  <View style={[adStyles.moduleIcon, { backgroundColor: m.color }]}>
                    <m.Icon size={20} color={m.iconColor} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adStyles.moduleLabel}>{m.label}</Text>
                    <Text style={adStyles.moduleSub}>{m.sub}</Text>
                  </View>
                  <ChevronRight size={15} color={colors.textDim} strokeWidth={2} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Normal User Home View ──
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
          <TouchableOpacity
            testID="bell-btn"
            onPress={() => router.push("/notifications")}
            style={styles.headerBtn}
          >
            <Bell size={18} color={colors.text} strokeWidth={2} />
            {alerts.length > 0 && <View style={styles.badgeDot} />}
          </TouchableOpacity>
        </View>

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

          {/* ── Top Scheme Match ── */}
          {data?.matches?.[0] && (
            <TouchableOpacity
              testID="scheme-rec-widget"
              style={[styles.card, styles.bankCard]}
              onPress={() => router.push("/(tabs)/schemes")}
              activeOpacity={0.85}
            >
              <View style={styles.bankBadge}>
                <Landmark size={16} color={colors.primaryDark} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>Top Scheme Match</Text>
                <Text style={styles.bankName}>{data.matches[0].name}</Text>
                <Text style={styles.bankMeta}>
                  {formatINR(data.matches[0].funding_estimate)} funding  •  {data.matches[0].score}% match
                </Text>
                <Text style={styles.bankWhy} numberOfLines={2}>{data.matches[0].reason}</Text>
              </View>
              <ChevronRight size={18} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {/* ── Quick Actions ── */}
          <TouchableOpacity
            testID="book-cta"
            style={[styles.quickAction, { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingVertical: 14 }]}
            onPress={() => router.push("/booking")}
            activeOpacity={0.85}
          >
            <Phone size={20} color={colors.primaryDark} strokeWidth={2} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.qaTitle}>Free Consultation</Text>
              <Text style={styles.qaSub}>30-min advisor call</Text>
            </View>
            <ChevronRight size={16} color={colors.primaryDark} strokeWidth={2} />
          </TouchableOpacity>

          {/* ── WhatsApp Support ── */}
          <TouchableOpacity
            testID="whatsapp-cta"
            style={styles.waBtn}
            onPress={() => Linking.openURL("https://wa.me/919893869899?text=Hello%2C%20I%20am%20reaching%20out%20from%20the%20Saral%20Funding%20app.%20I%20would%20like%20some%20assistance%20regarding%20my%20funding%20journey.%20Could%20your%20team%20please%20help%20me%3F")}
            activeOpacity={0.85}
          >
            <View style={styles.waIcon}>
              {/* WhatsApp SVG logo */}
              <Text style={{ fontSize: 20, lineHeight: 24 }}>💬</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.waTitle}>WhatsApp Support</Text>
              <Text style={styles.waSub}>Chat with our team instantly</Text>
            </View>
            <ChevronRight size={16} color="#FFF" strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <TouchableOpacity
              testID="banks-cta"
              style={[styles.quickAction, { flex: 1 }]}
              onPress={() => router.push("/banks")}
              activeOpacity={0.85}
            >
              <Building2 size={18} color={colors.primaryDark} strokeWidth={2} />
              <Text style={styles.qaTitle}>All Banks</Text>
              <Text style={styles.qaSub}>Compare offers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="schemes-cta"
              style={[styles.quickAction, { flex: 1 }]}
              onPress={() => router.push("/(tabs)/schemes")}
              activeOpacity={0.85}
            >
              <Landmark size={18} color={colors.primaryDark} strokeWidth={2} />
              <Text style={styles.qaTitle}>All Schemes</Text>
              <Text style={styles.qaSub}>Browse schemes</Text>
            </TouchableOpacity>
          </View>

          {/* ── Document Vault ── */}
          <TouchableOpacity
            style={[styles.quickAction, { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingVertical: 14 }]}
            onPress={() => router.push("/documents")}
            activeOpacity={0.85}
            testID="documents-cta"
          >
            <FolderOpen size={20} color={colors.primaryDark} strokeWidth={2} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.qaTitle}>Document Vault</Text>
              <Text style={styles.qaSub}>Upload & manage your documents</Text>
            </View>
            <ChevronRight size={16} color={colors.primaryDark} strokeWidth={2} />
          </TouchableOpacity>

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

          {/* ── Applications prompt ── */}
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <TrendingUp size={14} color={colors.primaryDark} strokeWidth={2} />
              <Text style={styles.sectionLabel}>Your Applications</Text>
            </View>
            <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textDim, marginBottom: 12, lineHeight: 19 }}>
              After your consultation call, our team will assign the right schemes and track your applications here.
            </Text>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              onPress={() => router.push("/(tabs)/applications")}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, fontFamily: fonts.semiBold, color: colors.primary }}>View My Applications</Text>
              <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const adStyles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    letterSpacing: 0.4,
  },
  modulesGrid: {
    gap: 8,
  },
  moduleTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleLabel: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  moduleSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
});

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
  waBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#25D366",
    borderRadius: radius.xl,
    padding: spacing.sm2,
    paddingVertical: 14,
    marginBottom: 10,
    ...elevation.l1,
    shadowColor: "#25D366",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  waIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  waTitle: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  waSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
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
});
