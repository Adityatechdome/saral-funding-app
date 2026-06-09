import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  User, Phone, MapPin, Building2, DollarSign, StickyNote,
  Calendar, Clock, ArrowRight, CheckCircle2, AlertCircle,
  FileText, ChevronDown, X, Tag,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, stageColor } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import { SkeletonBox } from "@/src/components/SkeletonLoader";

const STAGES = ["new", "contacted", "interested", "documentation", "submitted", "approved", "disbursed", "closed"];

function StagePill({ stage }: { stage: string }) {
  const { bg, text } = stageColor(stage);
  return (
    <View style={[pill.wrap, { backgroundColor: bg }]}>
      <Text style={[pill.text, { color: text }]}>{stage}</Text>
    </View>
  );
}
const pill = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
});

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={row.wrap}>
      <View style={row.icon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={row.label}>{label}</Text>
        <Text style={row.value}>{value}</Text>
      </View>
    </View>
  );
}
const row = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 28, height: 28, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center", marginTop: 2 },
  label: { fontSize: 10, fontFamily: fonts.medium, color: colors.textDim, textTransform: "uppercase", letterSpacing: 0.4 },
  value: { fontSize: 14, fontFamily: fonts.medium, color: colors.text, marginTop: 1 },
});

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={card.wrap}>
      <Text style={card.title}>{title}</Text>
      {children}
    </View>
  );
}
const card = StyleSheet.create({
  wrap: { backgroundColor: "#FFF", borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 12 },
  title: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
});

function TimelineEvent({ item }: { item: any }) {
  const actionLabel: Record<string, { label: string; color: string }> = {
    stage_changed: { label: "Stage Changed", color: "#1D4ED8" },
    note_added: { label: "Note Added", color: "#92400E" },
    assigned: { label: "Assigned", color: "#5B21B6" },
    follow_up_set: { label: "Follow-up Set", color: "#065F46" },
    created: { label: "Lead Created", color: colors.primaryDark },
    updated: { label: "Updated", color: colors.textMuted },
  };
  const meta = actionLabel[item.action] ?? { label: item.action, color: colors.textMuted };
  const dateStr = item.ts ? new Date(item.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <View style={tl.wrap}>
      <View style={[tl.dot, { backgroundColor: meta.color }]} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[tl.action, { color: meta.color }]}>{meta.label}</Text>
          <Text style={tl.date}>{dateStr}</Text>
        </View>
        <Text style={tl.note}>{item.note}</Text>
        {item.actor && <Text style={tl.actor}>by {item.actor}</Text>}
      </View>
    </View>
  );
}
const tl = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  action: { fontSize: 12, fontFamily: fonts.bold },
  date: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim },
  note: { fontSize: 13, fontFamily: fonts.regular, color: colors.text, marginTop: 2 },
  actor: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, fontStyle: "italic", marginTop: 1 },
});

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const d = await apiGet<any>(`/admin/leads/${id}`);
      setData(d);
      setNotes(d.notes || "");
      setFollowUp(d.follow_up_date || "");
    } catch {
      Alert.alert("Error", "Could not load lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const moveStage = async (stage: string) => {
    setSaving(true);
    try {
      await apiPost(`/admin/leads/${id}`, { stage, notes });
      await load();
      setEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update stage");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await apiPost(`/admin/leads/${id}`, {
        stage: data?.stage,
        notes,
        ...(followUp ? { follow_up_date: followUp } : {}),
      });
      await load();
      setEditing(false);
    } catch {
      Alert.alert("Error", "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
        <BackBar title="Lead Detail" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: spacing.md, gap: 12 }}>
          {[120, 160, 200, 140].map((h, i) => (
            <SkeletonBox key={i} width="100%" height={h} borderRadius={radius.xxl} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!data) return null;

  const user = data.user || {};
  const bp = data.business_profile || {};
  const fa = data.assessment || {};
  const activity: any[] = data.activity_log || [];
  const consultations: any[] = data.consultations || [];
  const schemeMatches: any[] = data.scheme_matches || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="lead-detail">
      <BackBar title="Lead Detail" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Header card */}
        <View style={[card.wrap, { flexDirection: "row", alignItems: "flex-start", gap: 12 }]}>
          <View style={styles.avatar}>
            <User size={20} color={colors.primaryDark} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.leadName}>{user.full_name || data.full_name || "Unknown"}</Text>
            <Text style={styles.leadMobile}>+91 {user.mobile || data.mobile || "—"}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              <StagePill stage={data.stage} />
              {data.consultation_type && (
                <View style={styles.typeTag}>
                  <Tag size={10} color={colors.textDim} strokeWidth={2} />
                  <Text style={styles.typeText}>{data.consultation_type}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* User Profile */}
        <SectionCard title="User Profile">
          <InfoRow icon={<MapPin size={13} color={colors.textDim} />} label="State" value={user.state || "—"} />
          <InfoRow icon={<User size={13} color={colors.textDim} />} label="Category" value={user.category || "—"} />
          <InfoRow icon={<Phone size={13} color={colors.textDim} />} label="Mobile" value={user.mobile || "—"} />
          <InfoRow icon={<DollarSign size={13} color={colors.textDim} />} label="Funding Required" value={data.funding_required ? formatINR(data.funding_required) : "—"} />
        </SectionCard>

        {/* Business Profile */}
        {(bp.industry || bp.business_stage) && (
          <SectionCard title="Business Profile">
            <InfoRow icon={<Building2 size={13} color={colors.textDim} />} label="Industry" value={bp.industry || "—"} />
            <InfoRow icon={<Tag size={13} color={colors.textDim} />} label="Stage" value={bp.business_stage || "—"} />
            <InfoRow icon={<DollarSign size={13} color={colors.textDim} />} label="Annual Turnover" value={bp.annual_turnover ? formatINR(bp.annual_turnover) : "—"} />
            <InfoRow icon={<CheckCircle2 size={13} color={colors.textDim} />} label="GST" value={bp.gst_available ? "Registered" : "Not Registered"} />
            <InfoRow icon={<CheckCircle2 size={13} color={colors.textDim} />} label="Udyam" value={bp.udyam_available ? "Registered" : "Not Registered"} />
          </SectionCard>
        )}

        {/* Recommended Schemes */}
        {schemeMatches.length > 0 && (
          <SectionCard title={`Recommended Schemes (${schemeMatches.length})`}>
            {schemeMatches.slice(0, 5).map((s: any) => (
              <View key={s.scheme_id} style={styles.schemeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.schemeName}>{s.name}</Text>
                  {s.reason && <Text style={styles.schemeReason} numberOfLines={2}>{s.reason}</Text>}
                </View>
                <View style={styles.scoreChip}>
                  <Text style={styles.scoreText}>{s.score}%</Text>
                </View>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Notes + Follow-up */}
        <SectionCard title="Notes & Follow-up">
          {data.notes ? (
            <Text style={styles.notesBody}>{data.notes}</Text>
          ) : (
            <Text style={styles.emptyNote}>No notes yet</Text>
          )}
          {data.follow_up_date && (
            <View style={styles.followUpRow}>
              <Calendar size={12} color={colors.primaryDark} strokeWidth={2} />
              <Text style={styles.followUpText}>Follow-up: {data.follow_up_date}</Text>
            </View>
          )}
          {data.assigned_to && (
            <View style={styles.assignedRow}>
              <User size={12} color={colors.textDim} strokeWidth={2} />
              <Text style={styles.assignedText}>Assigned to: {data.assigned_to}</Text>
            </View>
          )}
        </SectionCard>

        {/* Consultation History */}
        {consultations.length > 0 && (
          <SectionCard title={`Consultation History (${consultations.length})`}>
            {consultations.map((c: any) => (
              <View key={c.id} style={styles.consultRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.consultType}>{c.consultation_type}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 3 }}>
                    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                      <Calendar size={10} color={colors.textDim} />
                      <Text style={styles.consultMeta}>{c.date}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                      <Clock size={10} color={colors.textDim} />
                      <Text style={styles.consultMeta}>{c.time_slot}</Text>
                    </View>
                  </View>
                </View>
                <StagePill stage={c.status || "new"} />
              </View>
            ))}
          </SectionCard>
        )}

        {/* Activity Timeline */}
        <SectionCard title={`Activity Timeline (${activity.length})`}>
          {activity.length === 0 ? (
            <Text style={styles.emptyNote}>No activity logged yet</Text>
          ) : (
            [...activity].reverse().map((a: any, i: number) => (
              <TimelineEvent key={i} item={a} />
            ))
          )}
        </SectionCard>

      </ScrollView>

      {/* Stage + Notes edit modal */}
      <Modal visible={editing} animationType="slide" transparent onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Update Lead</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setEditing(false)}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this lead…"
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={styles.fieldLabel}>Follow-up Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.notesInput, { minHeight: 44 }]}
              value={followUp}
              onChangeText={setFollowUp}
              placeholder="e.g. 2026-07-15"
              placeholderTextColor={colors.textPlaceholder}
            />

            <Text style={styles.fieldLabel}>Move to Stage</Text>
            <View style={styles.stagesGrid}>
              {STAGES.map((s) => {
                const { bg, text: tc } = stageColor(s);
                const isActive = data?.stage === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.stageChip, { backgroundColor: isActive ? bg : "#FFF", borderColor: isActive ? tc : colors.border }]}
                    onPress={() => moveStage(s)}
                    disabled={saving}
                  >
                    <Text style={[styles.stageChipText, { color: isActive ? tc : colors.textMuted }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveNotes} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  leadName: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  leadMobile: { fontSize: 13, fontFamily: fonts.regular, color: colors.textDim, marginTop: 2 },
  typeTag: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
  },
  typeText: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },
  editBtn: {
    backgroundColor: colors.primarySoft, borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  editBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },

  schemeRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  schemeName: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  schemeReason: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 2 },
  scoreChip: {
    backgroundColor: colors.primarySoft, borderRadius: radius.pill,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start",
  },
  scoreText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },

  notesBody: { fontSize: 14, fontFamily: fonts.regular, color: colors.text, lineHeight: 20 },
  emptyNote: { fontSize: 13, fontFamily: fonts.regular, color: colors.textDim, fontStyle: "italic" },
  followUpRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  followUpText: { fontSize: 12, fontFamily: fonts.medium, color: colors.primaryDark },
  assignedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  assignedText: { fontSize: 12, fontFamily: fonts.regular, color: colors.textDim },

  consultRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  consultType: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  consultMeta: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim },

  // Modal
  modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: spacing.lg, paddingBottom: 40, maxHeight: "90%",
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 14, fontFamily: fonts.regular,
    color: colors.text, minHeight: 80, backgroundColor: colors.surface2, marginBottom: 16,
  },
  stagesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  stageChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5 },
  stageChipText: { fontSize: 12, fontFamily: fonts.semiBold, textTransform: "capitalize" },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingVertical: 14, alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontFamily: fonts.displayBold, color: "#FFF" },
});
