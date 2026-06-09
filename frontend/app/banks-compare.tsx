import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, XCircle, Minus } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import { SkeletonBox } from "@/src/components/SkeletonLoader";

type CompareRow = {
  key: string;
  label: string;
  render: (b: any) => string;
  bestFn?: (values: string[], banks: any[]) => number; // returns index of best value
  bestStyle?: "lower" | "higher" | "none";
};

const COMPARE_ROWS: CompareRow[] = [
  {
    key: "type",
    label: "Bank Type",
    render: (b) => `${b.type} Sector`,
    bestStyle: "none",
  },
  {
    key: "interest",
    label: "Interest Rate",
    render: (b) => `${b.interest_min}–${b.interest_max}%`,
    bestStyle: "lower",
    bestFn: (vals) => {
      const mins = vals.map((v) => parseFloat(v));
      const min = Math.min(...mins);
      return mins.findIndex((v) => v === min);
    },
  },
  {
    key: "maxFunding",
    label: "Max Funding",
    render: (b) => formatINR(b.max_funding),
    bestStyle: "higher",
    bestFn: (vals, banks) =>
      (banks as any[]).reduce((best, b, i, arr) =>
        b.max_funding > arr[best].max_funding ? i : best, 0),
  },
  {
    key: "fee",
    label: "Processing Fee",
    render: (b) => `${b.processing_fee_percent}%`,
    bestStyle: "lower",
    bestFn: (vals, banks) =>
      (banks as any[]).reduce((best, b, i, arr) =>
        b.processing_fee_percent < arr[best].processing_fee_percent ? i : best, 0),
  },
  {
    key: "collateral",
    label: "Collateral",
    render: (b) => b.collateral_required ? "Required" : "Not Required",
    bestStyle: "none",
  },
  {
    key: "creditScore",
    label: "Min Credit Score",
    render: (b) => String(b.min_credit_score),
    bestStyle: "lower",
    bestFn: (vals, banks) =>
      (banks as any[]).reduce((best, b, i, arr) =>
        b.min_credit_score < arr[best].min_credit_score ? i : best, 0),
  },
  {
    key: "turnover",
    label: "Min Turnover",
    render: (b) => b.min_turnover ? formatINR(b.min_turnover) : "None",
    bestStyle: "lower",
    bestFn: (vals, banks) =>
      (banks as any[]).reduce((best, b, i, arr) =>
        (b.min_turnover || 0) < (arr[best].min_turnover || 0) ? i : best, 0),
  },
  {
    key: "programs",
    label: "Programs",
    render: (b) => (b.supports || []).join(" · "),
    bestStyle: "none",
  },
];

const ROW_COLORS = [
  { bg: "#FFF", border: colors.border },
  { bg: colors.surface2, border: colors.border },
];

function BestBadge({ style }: { style: "lower" | "higher" }) {
  return (
    <View style={[badgeStyles.wrap, style === "higher" ? badgeStyles.higher : badgeStyles.lower]}>
      <Text style={[badgeStyles.text, style === "higher" ? badgeStyles.textHigher : badgeStyles.textLower]}>
        {style === "higher" ? "Best" : "Lowest"}
      </Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start", marginTop: 3 },
  lower: { backgroundColor: colors.primarySoft },
  higher: { backgroundColor: "#FEF3C7" },
  text: { fontSize: 9, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.3 },
  textLower: { color: colors.primaryDark },
  textHigher: { color: "#92400E" },
});

export default function BanksCompare() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const router = useRouter();
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiPost<{ banks: any[] }>("/banks/compare", { ids: (ids || "").split(",") })
      .then((d) => { setBanks(d.banks); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ids]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]}>
        <BackBar title="Comparing Banks" onBack={() => router.back()} />
        <View style={{ padding: spacing.md, gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBox key={i} width="100%" height={56} borderRadius={radius.xl} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="banks-compare-screen">
      <BackBar title={`Comparing ${banks.length} Banks`} onBack={() => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={styles.labelCell}>
                <Text style={styles.headerCellLabel}>Feature</Text>
              </View>
              {banks.map((b) => (
                <View key={b.id} style={styles.valueCell}>
                  <View style={[styles.bankHeaderBadge, b.type === "Public" ? styles.bankPub : styles.bankPriv]}>
                    <Text style={[styles.bankHeaderType, b.type === "Public" ? styles.bankTypePub : styles.bankTypePriv]}>
                      {b.type}
                    </Text>
                  </View>
                  <Text style={styles.bankHeaderName} numberOfLines={2}>{b.short_name || b.name}</Text>
                </View>
              ))}
            </View>

            {/* Data rows */}
            {COMPARE_ROWS.map((row, rowIdx) => {
              const vals = banks.map((b) => row.render(b));
              const bestIdx =
                row.bestFn && row.bestStyle !== "none"
                  ? row.bestFn(
                      vals,
                      banks,
                    )
                  : -1;
              const { bg, border } = ROW_COLORS[rowIdx % 2];

              return (
                <View key={row.key} style={[styles.dataRow, { backgroundColor: bg, borderColor: border }]}>
                  <View style={[styles.labelCell, { backgroundColor: bg }]}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </View>
                  {banks.map((b, bi) => {
                    const isBest = bestIdx === bi;
                    const val = vals[bi];
                    const isCollateral = row.key === "collateral";

                    return (
                      <View
                        key={b.id}
                        style={[
                          styles.valueCell,
                          { backgroundColor: isBest ? colors.primarySoft : bg },
                        ]}
                      >
                        {isCollateral ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            {b.collateral_required
                              ? <XCircle size={14} color={colors.warning} strokeWidth={2} />
                              : <CheckCircle2 size={14} color={colors.primary} strokeWidth={2} />}
                            <Text style={[styles.cellValue, { color: b.collateral_required ? colors.warning : colors.primary }]}>
                              {val}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.cellValue,
                              isBest && styles.cellValueBest,
                            ]}
                            numberOfLines={3}
                          >
                            {val}
                          </Text>
                        )}
                        {isBest && row.bestStyle && row.bestStyle !== "none" && (
                          <BestBadge style={row.bestStyle} />
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primarySoft }]} />
            <Text style={styles.legendText}>Best / Lowest value highlighted</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const COL_W = 148;
const LABEL_W = 120;

const styles = StyleSheet.create({
  table: {
    margin: spacing.md,
    borderRadius: radius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: colors.text,
  },
  dataRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  labelCell: {
    width: LABEL_W,
    padding: 12,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  valueCell: {
    width: COL_W,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    justifyContent: "flex-start",
  },
  headerCellLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bankHeaderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  bankPub: { backgroundColor: "rgba(34,197,94,0.2)" },
  bankPriv: { backgroundColor: "rgba(59,130,246,0.2)" },
  bankHeaderType: {
    fontSize: 9,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bankTypePub: { color: "#4ADE80" },
  bankTypePriv: { color: "#93C5FD" },
  bankHeaderName: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    color: "#FFF",
    lineHeight: 18,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  cellValue: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
    lineHeight: 18,
  },
  cellValueBest: {
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  legend: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
  },
});
