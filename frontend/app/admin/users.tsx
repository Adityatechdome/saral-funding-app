import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, Download, User, MapPin, Shield, CheckCircle2, Clock } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiGet, getToken, API_BASE } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import EmptyState from "@/src/components/EmptyState";

function RolePill({ role }: { role: string }) {
  if (role === "user") return null;
  const cfg: Record<string, { bg: string; text: string }> = {
    super_admin: { bg: "#FEF3C7", text: "#92400E" },
    manager: { bg: "#DBEAFE", text: "#1D4ED8" },
    expert: { bg: "#EDE9FE", text: "#5B21B6" },
    sales_executive: { bg: colors.primarySoft, text: colors.primaryDark },
    support_executive: { bg: "#FEE2E2", text: "#DC2626" },
  };
  const { bg, text } = cfg[role] ?? { bg: colors.surfaceAlt, text: colors.textMuted };
  return (
    <View style={[roleStyles.pill, { backgroundColor: bg }]}>
      <Text style={[roleStyles.text, { color: text }]}>{role.replace(/_/g, " ")}</Text>
    </View>
  );
}
const roleStyles = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  text: { fontSize: 9, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.3 },
});

function StepPill({ step }: { step: string }) {
  const isDone = step === "done";
  return (
    <View style={[stepStyles.pill, isDone && stepStyles.pillDone]}>
      {isDone
        ? <CheckCircle2 size={10} color={colors.primaryDark} strokeWidth={2.5} />
        : <Clock size={10} color={colors.textDim} strokeWidth={2} />}
      <Text style={[stepStyles.text, isDone && stepStyles.textDone]}>
        {isDone ? "Complete" : step}
      </Text>
    </View>
  );
}
const stepStyles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  pillDone: { backgroundColor: colors.primarySoft },
  text: { fontSize: 10, fontFamily: fonts.medium, color: colors.textDim, textTransform: "capitalize" },
  textDone: { color: colors.primaryDark, fontFamily: fonts.semiBold },
});

export default function AdminUsers() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/admin/users?limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`);
      // Handle both paginated {items, total} and legacy array response
      if (Array.isArray(res)) {
        setItems(res);
        setTotal(res.length);
      } else {
        setItems(res.items || []);
        setTotal(res.total || 0);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(""); }, [load]);

  const onSearch = (text: string) => {
    setQ(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(text), 320);
  };

  const exportCsv = async () => {
    const token = await getToken();
    const url = `${API_BASE}/admin/exports/users.csv`;
    if (typeof window !== "undefined") {
      try {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const text = await r.text();
        const blob = new Blob([text], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "saral-users.csv";
        a.click();
      } catch {
        Alert.alert("Export Error", "Could not export users. This feature works on web only.");
      }
    } else {
      Alert.alert("Export", "CSV export is available on the web version.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-users">
      <BackBar title="Users" onBack={() => router.back()} />

      {/* Search bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={15} color={colors.textDim} strokeWidth={2} />
          <TextInput
            testID="admin-users-search"
            placeholder="Search by name or mobile…"
            placeholderTextColor={colors.textPlaceholder}
            style={styles.searchInput}
            value={q}
            onChangeText={onSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          testID="export-users"
          style={styles.exportBtn}
          onPress={exportCsv}
          activeOpacity={0.8}
        >
          <Download size={16} color={colors.primaryDark} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {!loading && (
        <Text style={styles.countLabel}>
          {total} user{total !== 1 ? "s" : ""}{q ? ` matching "${q}"` : ""}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <EmptyState
          Icon={User}
          title="No users found"
          subtitle={q ? `No users matching "${q}"` : "No users have registered yet."}
          ctaLabel={q ? "Clear search" : undefined}
          onCta={q ? () => onSearch("") : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userCard}
              testID={`admin-user-${item.id}`}
              onPress={() => router.push(`/admin/user/${item.id}`)}
              activeOpacity={0.8}
            >
              {/* Avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.full_name || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName} numberOfLines={1}>{item.full_name || "Unnamed"}</Text>
                  <RolePill role={item.role} />
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.mobile}>+91 {item.mobile}</Text>
                  {item.state && (
                    <View style={styles.stateMeta}>
                      <MapPin size={10} color={colors.textDim} strokeWidth={2} />
                      <Text style={styles.stateText}>{item.state}</Text>
                    </View>
                  )}
                </View>
                <View style={{ marginTop: 6 }}>
                  <StepPill step={item.onboarding_step} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchSection: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 12,
    backgroundColor: "#FFF",
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
  },
  exportBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
    paddingHorizontal: spacing.md,
    paddingBottom: 6,
  },
  userCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  userName: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mobile: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  stateMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  stateText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
  },
});
