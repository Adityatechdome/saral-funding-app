import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Building2, TrendingDown, DollarSign, BadgePercent,
  CreditCard, ShieldCheck, Factory, CheckCircle2, XCircle, Phone,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import { SkeletonBox } from "@/src/components/SkeletonLoader";
import Button from "@/src/components/ui/Button";

function BankSkeleton() {
  return (
    <View style={{ padding: spacing.md, gap: 12 }}>
      <SkeletonBox width="70%" height={14} />
      <SkeletonBox width="50%" height={30} />
      <SkeletonBox width="100%" height={60} borderRadius={16} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonBox key={i} width="48%" height={72} borderRadius={radius.xl} />
        ))}
      </View>
    </View>
  );
}

function MetricTile({
  Icon,
  label,
  value,
  valueColor,
  highlight,
}: {
  Icon: any;
  label: string;
  value: string;
  valueColor?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.tile, highlight && styles.tileHighlight]}>
      <View style={[styles.tileIconWrap, highlight && styles.tileIconWrapHL]}>
        <Icon size={14} color={highlight ? colors.primaryDark : colors.textDim} strokeWidth={2} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

export default function BankDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [bank, setBank] = useState<any>(null);

  useEffect(() => {
    apiGet<any>(`/banks/${id}`).then(setBank).catch(() => {});
  }, [id]);

  if (!bank) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
        <BackBar title="Bank Details" onBack={() => router.back()} />
        <BankSkeleton />
      </SafeAreaView>
    );
  }

  const isPublic = bank.type === "Public";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID={`bank-detail-${id}`}>
      <BackBar title="" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={[styles.bankAvatar, !isPublic && styles.bankAvatarPrivate]}>
              <Building2 size={24} color={isPublic ? colors.primaryDark : "#1D4ED8"} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <View style={[styles.typePill, isPublic ? styles.typePillPub : styles.typePillPriv]}>
                  <Text style={[styles.typePillText, isPublic ? styles.typePillTextPub : styles.typePillTextPriv]}>
                    {bank.type} Sector
                  </Text>
                </View>
              </View>
              <Text style={styles.bankName}>{bank.name}</Text>
            </View>
          </View>
          <Text style={styles.bankDesc}>{bank.description}</Text>

          {/* Key rates */}
          <View style={styles.ratesRow}>
            <View style={styles.rateBox}>
              <Text style={styles.rateLabel}>Interest Rate</Text>
              <Text style={styles.rateValue}>{bank.interest_min}% – {bank.interest_max}%</Text>
              <Text style={styles.rateUnit}>per annum</Text>
            </View>
            <View style={[styles.rateBox, styles.rateBoxBorder]}>
              <Text style={styles.rateLabel}>Max Funding</Text>
              <Text style={styles.rateValue}>{formatINR(bank.max_funding)}</Text>
              <Text style={styles.rateUnit}>loan amount</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>
          {/* Metrics grid */}
          <View style={styles.tileGrid}>
            <MetricTile
              Icon={BadgePercent}
              label="Processing Fee"
              value={`${bank.processing_fee_percent}%`}
              highlight={bank.processing_fee_percent < 1}
            />
            <MetricTile
              Icon={CreditCard}
              label="Min Credit Score"
              value={String(bank.min_credit_score)}
            />
            <MetricTile
              Icon={DollarSign}
              label="Min Turnover"
              value={bank.min_turnover ? formatINR(bank.min_turnover) : "None"}
              highlight={!bank.min_turnover}
            />
            <MetricTile
              Icon={ShieldCheck}
              label="Collateral"
              value={bank.collateral_required ? "Required" : "Not Required"}
              valueColor={bank.collateral_required ? colors.warning : colors.primary}
              highlight={!bank.collateral_required}
            />
          </View>

          {/* Supported programs */}
          {(bank.supports || []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supported Programs</Text>
              <View style={styles.pillsRow}>
                {bank.supports.map((s: string) => (
                  <View key={s} style={styles.supportPill}>
                    <CheckCircle2 size={11} color={colors.primaryDark} strokeWidth={2.5} />
                    <Text style={styles.supportPillText}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Why recommended */}
          {bank.why && (
            <View style={styles.whyCard}>
              <Text style={styles.whyTitle}>Why we recommend this bank</Text>
              <Text style={styles.whyBody}>{bank.why}</Text>
            </View>
          )}

          {/* Industries */}
          {(bank.industries || []).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Industries Served</Text>
              <View style={styles.pillsRow}>
                {bank.industries.map((ind: string) => (
                  <View key={ind} style={styles.industryPill}>
                    <Factory size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.industryPillText}>{ind}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Button
            testID="book-from-bank"
            label="Book Free Consultation"
            onPress={() => router.push("/booking")}
            size="lg"
            Icon={Phone}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#FFF",
    margin: spacing.md,
    borderRadius: radius.xxl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: spacing.sm2,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  bankAvatar: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bankAvatarPrivate: {
    backgroundColor: "#DBEAFE",
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginBottom: 4,
  },
  typePillPub: { backgroundColor: colors.primarySoft },
  typePillPriv: { backgroundColor: "#DBEAFE" },
  typePillText: { fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.4 },
  typePillTextPub: { color: colors.primaryDark },
  typePillTextPriv: { color: "#1D4ED8" },
  bankName: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 26,
  },
  bankDesc: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 19,
    marginBottom: 16,
  },
  ratesRow: {
    flexDirection: "row",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  rateBox: {
    flex: 1,
    padding: 14,
    gap: 2,
  },
  rateBoxBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.primaryMid,
  },
  rateLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  rateValue: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
    marginTop: 2,
  },
  rateUnit: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 1,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.sm2,
  },
  tile: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  tileHighlight: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMid,
  },
  tileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  tileIconWrapHL: {
    backgroundColor: colors.primaryMid,
  },
  tileLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tileValue: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.sm2,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 10,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  supportPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  supportPillText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  industryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  industryPillText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  whyCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  whyTitle: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  whyBody: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: 20,
  },
});
