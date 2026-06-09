import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, ChevronRight, User, Phone, MapPin, DollarSign, StickyNote } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, stageColor } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

const STAGES = ["all", "new", "contacted", "interested", "documentation", "submitted", "approved", "disbursed", "closed"];

function StagePill({ stage }: { stage: string }) {
  const { bg, text } = stageColor(stage);
  return (
    <View style={[pillStyles.wrap, { backgroundColor: bg }]}>
      <Text style={[pillStyles.text, { color: text }]}>{stage}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 10, fontFamily: fonts.bold, textTransform: "capitalize", letterSpacing: 0.3 },
});

export default function AdminLeads() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const openDetail = (lead: any) => {
    router.push(`/admin/lead/${lead.id}` as any);
  };

  const load = async (st: string) => {
    setLoading(true);
    try {
      const data = await apiGet<any[]>(`/admin/leads${st !== "all" ? `?stage=${st}` : ""}`);
      setItems(data);
    } catch (e) {
      Alert.alert("Error", "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const openEdit = (lead: any) => {
    setEditing(lead);
    setNotes(lead.notes || "");
  };

  const moveStage = async (lid: string, stage: string) => {
    await apiPost(`/admin/leads/${lid}`, { stage, notes });
    setEditing(null);
    load(filter);
  };

  const saveNotes = async () => {
    if (!editing) return;
    await apiPost(`/admin/leads/${editing.id}`, { stage: editing.stage, notes });
    setEditing(null);
    load(filter);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-leads">
      <BackBar title="CRM / Leads" onBack={() => router.back()} />

      {/* Stage filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingHorizontal: spacing.md }}
        style={{ flexGrow: 0 }}
      >
        {STAGES.map((s) => {
          const active = filter === s;
          const { bg, text } = s !== "all" ? stageColor(s) : { bg: colors.primarySoft, text: colors.primaryDark };
          return (
            <TouchableOpacity
              key={s}
              testID={`stage-filter-${s}`}
              style={[
                styles.filterChip,
                active && { backgroundColor: s === "all" ? colors.primary : bg, borderColor: "transparent" },
              ]}
              onPress={() => setFilter(s)}
            >
              <Text style={[
                styles.filterChipText,
                active && { color: s === "all" ? "#FFF" : text, fontFamily: fonts.bold },
              ]}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No leads in "{filter}" stage</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`lead-${item.id}`}
              style={styles.card}
              onPress={() => openDetail(item)}
              onLongPress={() => openEdit(item)}
              activeOpacity={0.85}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.avatarSmall}>
                  <User size={14} color={colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leadName} numberOfLines={1}>{item.full_name || "Unknown"}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Phone size={10} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.leadMobile}>+91 {item.mobile || "—"}</Text>
                  </View>
                </View>
                <StagePill stage={item.stage} />
              </View>

              {/* Details */}
              <View style={styles.detailsRow}>
                {item.state && (
                  <View style={styles.metaItem}>
                    <MapPin size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{item.state}</Text>
                  </View>
                )}
                {item.funding_required > 0 && (
                  <View style={styles.metaItem}>
                    <DollarSign size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{formatINR(item.funding_required)}</Text>
                  </View>
                )}
                {item.consultation_type && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaText}>{item.consultation_type}</Text>
                  </View>
                )}
              </View>

              {/* Notes preview */}
              {item.notes && (
                <View style={styles.notesPreview}>
                  <StickyNote size={11} color={colors.textDim} strokeWidth={2} />
                  <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
                </View>
              )}

              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} style={{ position: "absolute", right: 14, top: 20 }} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Edit modal */}
      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editing?.full_name || "Lead"}</Text>
                <Text style={styles.sheetMeta}>Current: <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{editing?.stage}</Text></Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setEditing(null)}
                testID="lead-cancel"
              >
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Notes input */}
            <Text style={styles.notesLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this lead…"
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.stagesLabel}>Move to Stage</Text>
            <View style={styles.stagesGrid}>
              {STAGES.filter((s) => s !== "all").map((s) => {
                const { bg, text: textColor } = stageColor(s);
                const isActive = editing?.stage === s;
                return (
                  <TouchableOpacity
                    key={s}
                    testID={`move-${s}`}
                    style={[styles.stageChip, { backgroundColor: isActive ? bg : "#FFF", borderColor: isActive ? textColor : colors.border }]}
                    onPress={() => moveStage(editing!.id, s)}
                  >
                    <Text style={[styles.stageChipText, { color: isActive ? textColor : colors.textMuted }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveNotes}>
              <Text style={styles.saveBtnText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterChip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textTransform: "capitalize",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingRight: 36,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  leadName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 19,
  },
  leadMobile: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  metaText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  notesPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    fontStyle: "italic",
  },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted },

  // Modal
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.text },
  sheetMeta: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 3 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  notesLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 12,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
    backgroundColor: colors.surface2,
  },
  stagesLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  stageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  stageChipText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    textTransform: "capitalize",
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
});
