import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckCircle2, XCircle, Landmark } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import EmptyState from "@/src/components/EmptyState";

export default function AdminSchemes() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await apiGet("/admin/schemes"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (s: any) => {
    setToggling(s.id);
    try {
      if (s.disabled) await apiPost(`/admin/schemes/${s.id}/enable`);
      else await apiPost(`/admin/schemes/${s.id}/disable`);
      await load();
    } finally {
      setToggling(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-schemes">
      <BackBar title="Schemes" onBack={() => router.back()} />

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {items.filter((s) => !s.disabled).length} active  ·  {items.filter((s) => s.disabled).length} disabled
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <EmptyState Icon={Landmark} title="No schemes found" subtitle="Schemes will appear here after seeding." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.card, item.disabled && styles.cardDisabled]} testID={`admin-scheme-${item.id}`}>
              <View style={styles.cardLeft}>
                <View style={[styles.schemeIcon, item.disabled && styles.schemeIconDisabled]}>
                  <Landmark size={16} color={item.disabled ? colors.textDim : colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.schemeName, item.disabled && styles.schemeNameDisabled]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.schemeMeta} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.schemeStats}>
                    <Text style={styles.schemeAmt}>Up to {formatINR(item.max_funding)}</Text>
                    {item.max_subsidy_percent > 0 && (
                      <Text style={styles.schemeSub}>{item.max_subsidy_percent}% subsidy</Text>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                testID={`toggle-${item.id}`}
                style={[
                  styles.toggleBtn,
                  item.disabled ? styles.toggleBtnOff : styles.toggleBtnOn,
                ]}
                onPress={() => toggle(item)}
                disabled={toggling === item.id}
                activeOpacity={0.8}
              >
                {item.disabled
                  ? <XCircle size={13} color={colors.danger} strokeWidth={2} />
                  : <CheckCircle2 size={13} color={colors.primaryDark} strokeWidth={2} />}
                <Text style={[styles.toggleText, item.disabled ? styles.toggleTextOff : styles.toggleTextOn]}>
                  {toggling === item.id ? "…" : item.disabled ? "Off" : "On"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  statsBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFF",
  },
  statsText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: colors.surface2,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  schemeIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  schemeIconDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  schemeName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 3,
  },
  schemeNameDisabled: {
    color: colors.textMuted,
  },
  schemeMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: 6,
  },
  schemeStats: {
    flexDirection: "row",
    gap: 8,
  },
  schemeAmt: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  schemeSub: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  toggleBtnOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  toggleBtnOff: {
    borderColor: colors.danger,
    backgroundColor: "#FEE2E2",
  },
  toggleText: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  toggleTextOn: { color: colors.primaryDark },
  toggleTextOff: { color: colors.danger },
});
