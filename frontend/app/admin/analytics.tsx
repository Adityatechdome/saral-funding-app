import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TrendingUp, MapPin, Target, Phone } from "lucide-react-native";

import { colors, spacing, radius, fonts, stageColor } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

function SectionHeader({ Icon, title }: { Icon: any; title: string }) {
  return (
    <View style={secStyles.wrap}>
      <View style={secStyles.icon}>
        <Icon size={14} color={colors.primaryDark} strokeWidth={2} />
      </View>
      <Text style={secStyles.title}>{title}</Text>
    </View>
  );
}
const secStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  icon: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13, fontFamily: fonts.bold, color: colors.text, textTransform: "uppercase", letterSpacing: 0.5 },
});

function BarRow({ label, value, max, color = colors.primary }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={barStyles.row}>
      <Text style={barStyles.label} numberOfLines={1}>{label}</Text>
      <View style={barStyles.trackWrap}>
        <View style={barStyles.track}>
          <View style={[barStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={barStyles.count}>{value}</Text>
      </View>
    </View>
  );
}
const barStyles = StyleSheet.create({
  row: { marginBottom: 10 },
  label: { fontSize: 12, fontFamily: fonts.medium, color: colors.text, marginBottom: 5 },
  trackWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  track: { flex: 1, height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  count: { fontSize: 12, fontFamily: fonts.bold, color: colors.text, width: 30, textAlign: "right" },
});

function PipelineBox({ label, value, stage }: { label: string; value: number; stage: string }) {
  const { bg, text } = stageColor(stage);
  return (
    <View style={[pipeStyles.box, { backgroundColor: bg, borderColor: bg }]}>
      <Text style={[pipeStyles.value, { color: text }]}>{value}</Text>
      <Text style={[pipeStyles.label, { color: text }]}>{label}</Text>
    </View>
  );
}
const pipeStyles = StyleSheet.create({
  box: { width: "30%", padding: 10, borderRadius: radius.lg, borderWidth: 1, marginBottom: 8, alignItems: "center" },
  value: { fontSize: 22, fontFamily: fonts.displayBold },
  label: { fontSize: 10, fontFamily: fonts.semiBold, marginTop: 2, textTransform: "capitalize", textAlign: "center" },
});

export default function AdminAnalytics() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiGet<any>("/admin/analytics").then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]}>
        <BackBar title="Analytics" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const maxPop = Math.max(1, ...(data.popular_schemes || []).map((p: any) => p.matches));
  const maxState = Math.max(1, ...(data.state_distribution || []).map((s: any) => s.count));

  // Colour palette for state bars
  const stateColors = ["#22C55E", "#16A34A", "#4ADE80", "#86EFAC", "#BBF7D0"];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-analytics">
      <BackBar title="Analytics" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Popular schemes */}
        <View style={styles.section}>
          <SectionHeader Icon={TrendingUp} title="Popular Schemes" />
          {(data.popular_schemes || []).length === 0 ? (
            <Text style={styles.empty}>No match data yet</Text>
          ) : (
            (data.popular_schemes || []).map((p: any) => (
              <BarRow
                key={p.scheme_id}
                label={p.name}
                value={p.matches}
                max={maxPop}
                color={colors.primary}
              />
            ))
          )}
        </View>

        {/* State distribution */}
        <View style={styles.section}>
          <SectionHeader Icon={MapPin} title="State Distribution" />
          {(data.state_distribution || []).length === 0 ? (
            <Text style={styles.empty}>No users yet</Text>
          ) : (
            (data.state_distribution || []).map((s: any, i: number) => (
              <BarRow
                key={s.state}
                label={s.state}
                value={s.count}
                max={maxState}
                color={stateColors[i % stateColors.length]}
              />
            ))
          )}
        </View>

        {/* Lead pipeline */}
        <View style={styles.section}>
          <SectionHeader Icon={Target} title="Lead Pipeline" />
          <View style={styles.pipelineGrid}>
            {Object.keys(data.lead_pipeline || {}).length === 0 ? (
              <Text style={styles.empty}>No leads yet</Text>
            ) : (
              Object.entries(data.lead_pipeline || {}).map(([k, v]) => (
                <PipelineBox key={k} label={k} value={Number(v)} stage={k} />
              ))
            )}
          </View>
        </View>

        {/* Consultation status */}
        <View style={styles.section}>
          <SectionHeader Icon={Phone} title="Consultation Status" />
          <View style={styles.pipelineGrid}>
            {(data.consultation_status || []).map((s: any) => (
              <PipelineBox key={s.status} label={s.status} value={s.count} stage={s.status} />
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pipelineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  empty: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    paddingVertical: 8,
  },
});
