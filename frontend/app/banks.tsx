import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Building2, Shield, CheckCircle2, XCircle, GitCompare, ArrowRight } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import { SchemesSkeleton } from "@/src/components/SkeletonLoader";

type Rec = {
  bank_id: string; name: string; short_name: string; type: string; score: number;
  interest_range: string; suggested_amount: number; collateral_required: boolean;
  supports: string[]; why: string; description: string;
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? colors.primary : score >= 60 ? "#F59E0B" : "#9CA3AF";
  return (
    <View style={[ringStyles.wrap, { borderColor: color }]}>
      <Text style={[ringStyles.score, { color }]}>{score}</Text>
      <Text style={ringStyles.pct}>%</Text>
    </View>
  );
}
const ringStyles = StyleSheet.create({
  wrap: { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" },
  score: { fontSize: 15, fontFamily: fonts.displayBold, lineHeight: 17 },
  pct: { fontSize: 9, fontFamily: fonts.medium, color: colors.textDim, marginTop: -2 },
});

export default function BanksScreen() {
  const router = useRouter();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      apiGet<{ recommendations: Rec[] }>("/banks/recommend/me")
        .then((d) => { setRecs(d.recommendations || []); setLoading(false); })
        .catch(() => setLoading(false));
    }, [])
  );

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= 3
        ? cur
        : [...cur, id]
    );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]}>
        <BackBar title="Recommended Banks" onBack={() => router.back()} />
        <SchemesSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="banks-screen">
      <BackBar title="Recommended Banks" onBack={() => router.back()} />

      <View style={styles.subheaderWrap}>
        <Text style={styles.subheader}>Personalised for your business profile</Text>
        {selected.length > 0 && (
          <Text style={styles.compareCount}>{selected.length} selected</Text>
        )}
      </View>

      <FlatList
        data={recs}
        keyExtractor={(x) => x.bank_id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSel = selected.includes(item.bank_id);
          const isPublic = item.type === "Public";
          return (
            <View style={[styles.card, isSel && styles.cardSelected]}>
              {/* Card header */}
              <TouchableOpacity
                testID={`bank-card-${item.bank_id}`}
                onPress={() => router.push({ pathname: "/bank/[id]", params: { id: item.bank_id } })}
                activeOpacity={0.85}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.bankIcon, isPublic && styles.bankIconPublic]}>
                    <Building2 size={18} color={isPublic ? colors.primaryDark : "#1D4ED8"} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.bankName}>{item.name}</Text>
                      <View style={[styles.typePill, isPublic ? styles.typePillPublic : styles.typePillPrivate]}>
                        <Text style={[styles.typePillText, isPublic ? styles.typePillTextPublic : styles.typePillTextPrivate]}>
                          {item.type}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.interestRate}>{item.interest_range} p.a.</Text>
                  </View>
                  <ScoreRing score={item.score} />
                </View>

                <Text style={styles.whyText} numberOfLines={2}>{item.why}</Text>

                {/* Stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statKey}>Suggested Amount</Text>
                    <Text style={styles.statVal}>{formatINR(item.suggested_amount)}</Text>
                  </View>
                  <View style={[styles.statBox, styles.statBoxBorder]}>
                    <Text style={styles.statKey}>Collateral</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      {item.collateral_required
                        ? <XCircle size={13} color={colors.warning} strokeWidth={2} />
                        : <CheckCircle2 size={13} color={colors.primary} strokeWidth={2} />}
                      <Text style={[styles.statVal, { color: item.collateral_required ? colors.warning : colors.primary }]}>
                        {item.collateral_required ? "Required" : "Not required"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Supported schemes pills */}
                {(item.supports || []).length > 0 && (
                  <View style={styles.supportsRow}>
                    {item.supports.slice(0, 3).map((s: string) => (
                      <View key={s} style={styles.supportPill}>
                        <Text style={styles.supportPillText}>{s}</Text>
                      </View>
                    ))}
                    {item.supports.length > 3 && (
                      <Text style={styles.moreText}>+{item.supports.length - 3}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  testID={`bank-compare-${item.bank_id}`}
                  style={[styles.compareBtn, isSel && styles.compareBtnActive]}
                  onPress={() => toggle(item.bank_id)}
                >
                  <GitCompare size={13} color={isSel ? colors.primaryDark : colors.textMuted} strokeWidth={2} />
                  <Text style={[styles.compareBtnText, isSel && styles.compareBtnTextActive]}>
                    {isSel ? "Added" : "Compare"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID={`bank-apply-${item.bank_id}`}
                  style={styles.applyBtn}
                  onPress={() => Alert.alert("Apply Now", `Opening application for ${item.name}.\n\nOur advisor will contact you with the next steps.`, [{ text: "Got it", style: "default" }])}
                  activeOpacity={0.85}
                >
                  <Text style={styles.applyBtnText}>Apply Now</Text>
                  <ArrowRight size={13} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {selected.length >= 2 && (
        <View style={styles.footer}>
          <TouchableOpacity
            testID="compare-go"
            style={styles.compareFooterBtn}
            onPress={() => router.push({ pathname: "/banks-compare", params: { ids: selected.join(",") } })}
            activeOpacity={0.85}
          >
            <GitCompare size={16} color="#FFF" strokeWidth={2} />
            <Text style={styles.compareFooterText}>Compare {selected.length} banks</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  subheaderWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  subheader: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  compareCount: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  bankIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bankIconPublic: {
    backgroundColor: colors.primarySoft,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  bankName: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  typePillPublic: { backgroundColor: colors.primarySoft },
  typePillPrivate: { backgroundColor: "#DBEAFE" },
  typePillText: { fontSize: 10, fontFamily: fonts.bold },
  typePillTextPublic: { color: colors.primaryDark },
  typePillTextPrivate: { color: "#1D4ED8" },
  interestRate: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    marginTop: 3,
  },
  whyText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    padding: 10,
  },
  statBoxBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  statKey: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statVal: {
    fontSize: 13,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 4,
  },
  supportsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  supportPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  supportPillText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  moreText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
    alignSelf: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  compareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  compareBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  compareBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  compareBtnTextActive: {
    color: colors.primaryDark,
  },
  applyBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  compareFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 14,
  },
  compareFooterText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
});
