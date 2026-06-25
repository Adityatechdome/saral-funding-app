import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  CheckCircle2, Circle, Clock, XCircle,
  ChevronRight, FileText, Building2,
} from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiGet } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

const STAGES = [
  "call_done",
  "documents_submitted",
  "scheme_identified",
  "application_filed",
  "under_review",
  "approved",
  "disbursed",
];

const STAGE_LABELS: Record<string, string> = {
  documents_submitted: "Documents Submitted",
  call_done:           "Call Done",
  scheme_identified:   "Scheme Identified",
  application_filed:   "Application Filed",
  under_review:        "Under Review",
  approved:            "Approved",
  disbursed:           "Disbursed",
  rejected:            "Rejected",
};

const STAGE_COLORS: Record<string, string> = {
  approved:  "#16a34a",
  disbursed: "#15803d",
  rejected:  "#dc2626",
};

type SchemeApp = {
  id: string;
  scheme_name: string;
  bank_name?: string;
  stage: string;
  stage_label: string;
  stage_index: number;
  stage_history: { stage: string; note: string; updated_by: string; updated_at: string }[];
  created_at: string;
};

export default function MyApplications() {
  const router = useRouter();
  const [apps, setApps] = useState<SchemeApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await apiGet<SchemeApp[]>("/my/scheme-applications");
      setApps(data);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={s.root}>
        <BackBar title="My Applications" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <BackBar title="My Applications" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {apps.length === 0 ? (
          <EmptyState />
        ) : (
          apps.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              expanded={expanded === app.id}
              onToggle={() => setExpanded(expanded === app.id ? null : app.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AppCard({ app, expanded, onToggle }: {
  app: SchemeApp;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isRejected = app.stage === "rejected";
  const isDisbursed = app.stage === "disbursed";
  const activeStageIdx = STAGES.indexOf(app.stage);

  return (
    <View style={s.card}>
      {/* Header */}
      <TouchableOpacity style={s.cardHeader} onPress={onToggle} activeOpacity={0.8}>
        <View style={[s.schemeIcon, isDisbursed && s.schemeIconGreen, isRejected && s.schemeIconRed]}>
          <FileText size={18} color={isRejected ? "#dc2626" : isDisbursed ? "#15803d" : colors.primary} strokeWidth={2} />
        </View>
        <View style={s.cardHeaderText}>
          <Text style={s.schemeName} numberOfLines={1}>{app.scheme_name}</Text>
          {app.bank_name ? (
            <View style={s.bankRow}>
              <Building2 size={11} color={colors.textDim} strokeWidth={2} />
              <Text style={s.bankName}>{app.bank_name}</Text>
            </View>
          ) : null}
          <StagePill stage={app.stage} label={app.stage_label} />
        </View>
        <ChevronRight
          size={18}
          color={colors.textDim}
          style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
          strokeWidth={2}
        />
      </TouchableOpacity>

      {/* Progress tracker */}
      {!isRejected && (
        <View style={s.progressRow}>
          {STAGES.map((st, i) => {
            const done = i <= activeStageIdx;
            const active = i === activeStageIdx;
            return (
              <View key={st} style={s.progressStep}>
                <View style={[
                  s.progressDot,
                  done && s.progressDotDone,
                  active && s.progressDotActive,
                ]}>
                  {done && !active
                    ? <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />
                    : active
                    ? <Clock size={12} color="#fff" strokeWidth={2.5} />
                    : <Circle size={14} color={colors.border} strokeWidth={2} />
                  }
                </View>
                {i < STAGES.length - 1 && (
                  <View style={[s.progressLine, done && i < activeStageIdx && s.progressLineDone]} />
                )}
              </View>
            );
          })}
        </View>
      )}

      {isRejected && (
        <View style={s.rejectedBanner}>
          <XCircle size={14} color="#dc2626" strokeWidth={2} />
          <Text style={s.rejectedText}>Application not proceeded. Contact our team for details.</Text>
        </View>
      )}

      {/* Stage labels row */}
      {!isRejected && (
        <View style={s.stageLabelRow}>
          {STAGES.map((st, i) => (
            <Text key={st} style={[
              s.stageLabelText,
              i === activeStageIdx && s.stageLabelActive,
            ]} numberOfLines={2}>
              {STAGE_LABELS[st]}
            </Text>
          ))}
        </View>
      )}

      {/* History (expanded) */}
      {expanded && app.stage_history.length > 0 && (
        <View style={s.history}>
          <Text style={s.historyTitle}>Activity</Text>
          {[...app.stage_history].reverse().map((h, i) => (
            <View key={i} style={s.historyRow}>
              <View style={s.historyDot} />
              <View style={s.historyContent}>
                <Text style={s.historyStage}>{STAGE_LABELS[h.stage] ?? h.stage}</Text>
                {h.note ? <Text style={s.historyNote}>{h.note}</Text> : null}
                <Text style={s.historyMeta}>
                  {h.updated_by} · {new Date(h.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function StagePill({ stage, label }: { stage: string; label: string }) {
  const bg = stage === "approved" || stage === "disbursed"
    ? "#dcfce7" : stage === "rejected"
    ? "#fee2e2" : "#eff6ff";
  const fg = STAGE_COLORS[stage] ?? colors.primary;
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={s.empty}>
      <FileText size={48} color={colors.border} strokeWidth={1.5} />
      <Text style={s.emptyTitle}>No applications yet</Text>
      <Text style={s.emptyBody}>
        After your consultation call, our team will assign the schemes you qualify for and track them here.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: colors.surface2 },
  content:         { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },

  card:            { backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.md,
                     shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                     shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader:      { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.md },
  schemeIcon:      { width: 40, height: 40, borderRadius: radius.md, backgroundColor: "#eff6ff",
                     alignItems: "center", justifyContent: "center" },
  schemeIconGreen: { backgroundColor: "#dcfce7" },
  schemeIconRed:   { backgroundColor: "#fee2e2" },
  cardHeaderText:  { flex: 1, gap: 4 },
  schemeName:      { fontSize: 15, fontFamily: fonts.semiBold, color: colors.text },
  bankRow:         { flexDirection: "row", alignItems: "center", gap: 4 },
  bankName:        { fontSize: 12, fontFamily: fonts.regular, color: colors.textDim },
  pill:            { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  pillText:        { fontSize: 11, fontFamily: fonts.semiBold },

  progressRow:     { flexDirection: "row", alignItems: "center", marginBottom: 6, paddingHorizontal: 2 },
  progressStep:    { flex: 1, flexDirection: "row", alignItems: "center" },
  progressDot:     { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface2,
                     alignItems: "center", justifyContent: "center", zIndex: 1 },
  progressDotDone: { backgroundColor: colors.primary },
  progressDotActive:{ backgroundColor: colors.primaryDark },
  progressLine:    { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: -1 },
  progressLineDone:{ backgroundColor: colors.primary },

  stageLabelRow:   { flexDirection: "row", marginBottom: 4 },
  stageLabelText:  { flex: 1, fontSize: 9, fontFamily: fonts.regular, color: colors.textDim,
                     textAlign: "center" },
  stageLabelActive:{ fontFamily: fonts.semiBold, color: colors.primaryDark },

  rejectedBanner:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fee2e2",
                     borderRadius: radius.md, padding: spacing.sm, marginBottom: 4 },
  rejectedText:    { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: "#dc2626" },

  history:         { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm,
                     paddingTop: spacing.sm, gap: 10 },
  historyTitle:    { fontSize: 12, fontFamily: fonts.semiBold, color: colors.textDim,
                     marginBottom: 4 },
  historyRow:      { flexDirection: "row", gap: 10 },
  historyDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 },
  historyContent:  { flex: 1, gap: 2 },
  historyStage:    { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  historyNote:     { fontSize: 12, fontFamily: fonts.regular, color: colors.textDim },
  historyMeta:     { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim },

  empty:           { alignItems: "center", paddingTop: 80, gap: spacing.md, paddingHorizontal: 32 },
  emptyTitle:      { fontSize: 18, fontFamily: fonts.semiBold, color: colors.text },
  emptyBody:       { fontSize: 14, fontFamily: fonts.regular, color: colors.textDim, textAlign: "center", lineHeight: 22 },
});
