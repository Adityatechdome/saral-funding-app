import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Users, ChevronRight, TrendingUp } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiGet } from "@/src/api";
import MyApplications from "../my-applications";

const FUNNEL_STAGES = [
  { key: "call_done",            label: "Call Done" },
  { key: "documents_submitted",  label: "Documents Submitted" },
  { key: "scheme_identified",    label: "Scheme Identified" },
  { key: "application_filed",    label: "Application Filed" },
  { key: "under_review",         label: "Under Review" },
  { key: "approved",             label: "Approved" },
  { key: "disbursed",            label: "Disbursed" },
];

function AdminUserFunnel() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<any>("/admin/users?limit=200");
      const list = Array.isArray(res) ? res : (res.items || []);
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // Count users by their onboarding step as a proxy for funnel stage
  const stageCounts: Record<string, number> = {};
  users.forEach((u) => {
    const step = u.onboarding_step || "registered";
    stageCounts[step] = (stageCounts[step] || 0) + 1;
  });

  const totalUsers = users.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
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
        <View style={s.header}>
          <Text style={s.title}>User Funnel</Text>
          <View style={s.totalBadge}>
            <Users size={13} color={colors.primaryDark} strokeWidth={2} />
            <Text style={s.totalText}>{totalUsers} users</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : totalUsers === 0 ? (
          <View style={s.emptyBox}>
            <Users size={40} color={colors.textDim} strokeWidth={1.5} />
            <Text style={s.emptyTitle}>No users yet</Text>
            <Text style={s.emptySub}>Users will appear here once they register.</Text>
          </View>
        ) : (
          <>
            {/* Overall summary card */}
            <View style={s.summaryCard}>
              <View style={s.summaryRow}>
                <View style={s.summaryItem}>
                  <Text style={s.summaryVal}>{totalUsers}</Text>
                  <Text style={s.summaryKey}>Total Users</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryVal}>{stageCounts["done"] || 0}</Text>
                  <Text style={s.summaryKey}>Profile Complete</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryItem}>
                  <Text style={s.summaryVal}>
                    {totalUsers > 0 ? Math.round(((stageCounts["done"] || 0) / totalUsers) * 100) : 0}%
                  </Text>
                  <Text style={s.summaryKey}>Completion</Text>
                </View>
              </View>
            </View>

            {/* Funnel stages */}
            <Text style={s.sectionLabel}>Onboarding Steps</Text>
            {Object.entries(stageCounts).map(([step, count], index) => {
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
              return (
                <View key={step} style={s.funnelRow}>
                  <View style={s.funnelLeft}>
                    <View style={s.stepNumWrap}>
                      <Text style={s.stepNum}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.stepLabel}>{step.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</Text>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  </View>
                  <View style={s.funnelRight}>
                    <Text style={s.funnelCount}>{count}</Text>
                    <Text style={s.funnelPct}>{pct}%</Text>
                  </View>
                </View>
              );
            })}

            {/* View all users link */}
            <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push("/admin/users")} activeOpacity={0.8}>
              <Users size={15} color={colors.primaryDark} strokeWidth={2} />
              <Text style={s.viewAllText}>View All Users</Text>
              <ChevronRight size={15} color={colors.primaryDark} strokeWidth={2} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ApplicationsTab() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    apiGet<any>("/auth/me")
      .then((me) => setIsAdmin(me?.role && me.role !== "user"))
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) return null;
  if (isAdmin) return <AdminUserFunnel />;
  return <MyApplications />;
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  totalText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  emptyBox: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryVal: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  summaryKey: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  funnelRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  funnelLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepNumWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNum: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 6,
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  funnelRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  funnelCount: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  funnelPct: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: 8,
    justifyContent: "center",
  },
  viewAllText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    textAlign: "center",
  },
});
