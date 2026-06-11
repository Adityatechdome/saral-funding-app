import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  User, Phone, MapPin, Building2, DollarSign, StickyNote,
  Calendar, Clock, ArrowRight, CheckCircle2, AlertCircle,
  FileText, ChevronDown, X, Tag, Upload, Star, ExternalLink,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR, stageColor } from "@/src/theme";
import { apiGet, apiPost, getToken, API_BASE } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import { SkeletonBox } from "@/src/components/SkeletonLoader";

const RECOMMENDED_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Axis Bank",
];

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

  // Documents
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  // Admin Recommendations
  const [existingRec, setExistingRec] = useState<any>(null);
  const [selectedSchemes, setSelectedSchemes] = useState<string[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [recNote, setRecNote] = useState("");
  const [savingRec, setSavingRec] = useState(false);

  const load = async () => {
    try {
      const d = await apiGet<any>(`/admin/leads/${id}`);
      setData(d);
      setNotes(d.notes || "");
      setFollowUp(d.follow_up_date || "");
      // Load docs and existing recommendation in parallel
      const userId = d.user?.id || d.user_id;
      if (userId) {
        const [docs, rec] = await Promise.all([
          apiGet<any[]>(`/admin/users/${userId}/documents`).catch(() => []),
          apiGet<any>(`/admin/users/${userId}/recommendations`).catch(() => null),
        ]);
        setUserDocs(Array.isArray(docs) ? docs : []);
        if (rec) {
          setExistingRec(rec);
          setSelectedSchemes(rec.schemes || []);
          setSelectedBanks(rec.banks || []);
          setRecNote(rec.note || "");
        }
      }
    } catch {
      Alert.alert("Error", "Could not load lead");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDocStatus = async (docId: string, status: "verified" | "rejected") => {
    setDocActionLoading(docId + status);
    try {
      await apiPost(`/admin/documents/${docId}/status`, { status });
      const userId = data?.user?.id || data?.user_id;
      if (userId) {
        const docs = await apiGet<any[]>(`/admin/users/${userId}/documents`).catch(() => []);
        setUserDocs(Array.isArray(docs) ? docs : []);
      }
    } catch {
      Alert.alert("Error", "Could not update document status.");
    } finally {
      setDocActionLoading(null);
    }
  };

  const handleAdminViewDoc = async (docId: string) => {
    setViewingDoc(docId);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/admin/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Could not get download link");
      const { url } = await response.json();
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open document. Please try again.");
    } finally {
      setViewingDoc(null);
    }
  };

  const saveRecommendations = async () => {
    setSavingRec(true);
    try {
      const userId = data?.user?.id || data?.user_id;
      await apiPost(`/admin/users/${userId}/recommendations`, {
        schemes: selectedSchemes,
        banks: selectedBanks,
        note: recNote,
      });
      Alert.alert("Saved", "Recommendations sent to user.");
      const rec = await apiGet<any>(`/admin/users/${userId}/recommendations`).catch(() => null);
      setExistingRec(rec);
    } catch {
      Alert.alert("Error", "Could not save recommendations.");
    } finally {
      setSavingRec(false);
    }
  };

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

        {/* Uploaded Documents */}
        <SectionCard title={`Uploaded Documents (${userDocs.length})`}>
          {userDocs.length === 0 ? (
            <Text style={styles.emptyNote}>No documents uploaded by this user yet.</Text>
          ) : (
            userDocs.map((doc: any) => {
              const statusBg = doc.status === "verified" ? colors.primarySoft : doc.status === "rejected" ? "#FEE2E2" : "#FEF3C7";
              const statusColor = doc.status === "verified" ? colors.primaryDark : doc.status === "rejected" ? "#DC2626" : "#92400E";
              return (
                <View key={doc.id} style={styles.docRow}>
                  <FileText size={14} color={colors.textDim} strokeWidth={2} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.doc_type}</Text>
                    <Text style={styles.docDate}>
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </Text>
                  </View>
                  <View style={[styles.docStatusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.docStatusText, { color: statusColor }]}>{doc.status}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                    {/* View button — available for all docs that have a file */}
                    {doc.file_name && (
                      <TouchableOpacity
                        style={[styles.docActionBtn, { backgroundColor: colors.surfaceAlt }]}
                        onPress={() => handleAdminViewDoc(doc.id)}
                        disabled={viewingDoc === doc.id}
                      >
                        {viewingDoc === doc.id
                          ? <ActivityIndicator size="small" color={colors.textDim} />
                          : <ExternalLink size={12} color={colors.textDim} strokeWidth={2} />
                        }
                      </TouchableOpacity>
                    )}
                    {doc.status === "pending" && (
                      <>
                        <TouchableOpacity
                          style={[styles.docActionBtn, { backgroundColor: colors.primarySoft }]}
                          onPress={() => handleDocStatus(doc.id, "verified")}
                          disabled={!!docActionLoading}
                        >
                          {docActionLoading === doc.id + "verified"
                            ? <ActivityIndicator size="small" color={colors.primaryDark} />
                            : <Text style={[styles.docActionText, { color: colors.primaryDark }]}>Verify</Text>
                          }
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.docActionBtn, { backgroundColor: "#FEE2E2" }]}
                          onPress={() => handleDocStatus(doc.id, "rejected")}
                          disabled={!!docActionLoading}
                        >
                          {docActionLoading === doc.id + "rejected"
                            ? <ActivityIndicator size="small" color="#DC2626" />
                            : <Text style={[styles.docActionText, { color: "#DC2626" }]}>Reject</Text>
                          }
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </SectionCard>

        {/* Admin Recommendations */}
        <SectionCard title="Admin Recommendations">
          {existingRec && (
            <View style={styles.existingRecBanner}>
              <Star size={12} color="#065F46" strokeWidth={2.5} />
              <Text style={styles.existingRecText}>
                Last saved on{" "}
                {existingRec.created_at
                  ? new Date(existingRec.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </Text>
            </View>
          )}

          <Text style={styles.recSubLabel}>Recommended Schemes</Text>
          <View style={styles.recChipsWrap}>
            {schemeMatches.map((s: any) => {
              const active = selectedSchemes.includes(s.name);
              return (
                <TouchableOpacity
                  key={s.scheme_id}
                  style={[styles.recChip, active && styles.recChipActive]}
                  onPress={() => setSelectedSchemes((prev) =>
                    active ? prev.filter((x) => x !== s.name) : [...prev, s.name]
                  )}
                >
                  <Text style={[styles.recChipText, active && styles.recChipTextActive]}>{s.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.recSubLabel, { marginTop: 10 }]}>Recommended Banks</Text>
          <View style={styles.recChipsWrap}>
            {RECOMMENDED_BANKS.map((bank) => {
              const active = selectedBanks.includes(bank);
              return (
                <TouchableOpacity
                  key={bank}
                  style={[styles.recChip, active && styles.recChipActive]}
                  onPress={() => setSelectedBanks((prev) =>
                    active ? prev.filter((x) => x !== bank) : [...prev, bank]
                  )}
                >
                  <Text style={[styles.recChipText, active && styles.recChipTextActive]}>{bank}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.recSubLabel, { marginTop: 10 }]}>Note to User (optional)</Text>
          <TextInput
            style={styles.recNoteInput}
            value={recNote}
            onChangeText={setRecNote}
            placeholder="Add a personal note for this user…"
            placeholderTextColor={colors.textPlaceholder}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.recSaveBtn, savingRec && { opacity: 0.6 }]}
            onPress={saveRecommendations}
            disabled={savingRec}
          >
            {savingRec
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text style={styles.recSaveBtnText}>Save Recommendations</Text>
            }
          </TouchableOpacity>
        </SectionCard>

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

  // Document rows
  docRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: "wrap",
  },
  docName: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  docDate: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 1 },
  docStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  docStatusText: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
  docActionBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  docActionText: { fontSize: 11, fontFamily: fonts.bold },

  // Recommendations
  existingRecBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#D1FAE5", borderRadius: radius.lg,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 12, alignSelf: "flex-start",
  },
  existingRecText: { fontSize: 11, fontFamily: fonts.medium, color: "#065F46" },
  recSubLabel: {
    fontSize: 10, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6,
  },
  recChipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  recChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2,
  },
  recChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  recChipText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  recChipTextActive: { color: colors.primaryDark, fontFamily: fonts.bold },
  recNoteInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 13, fontFamily: fonts.regular, color: colors.text,
    minHeight: 60, backgroundColor: colors.surface2, marginBottom: 12,
  },
  recSaveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingVertical: 12, alignItems: "center",
  },
  recSaveBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },

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
