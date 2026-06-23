import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  User, MapPin, Phone, Landmark, ChevronRight,
  CheckCircle2, Clock, XCircle, Plus, Trash2,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet, apiPost, apiDelete } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

const STAGE_LABELS: Record<string, string> = {
  scheme_identified: "Scheme Identified",
  call_done: "Call Done",
  documents_submitted: "Docs Submitted",
  application_filed: "App Filed",
  under_review: "Under Review",
  approved: "Approved",
  disbursed: "Disbursed",
  rejected: "Rejected",
};

function StagePill({ stage }: { stage: string }) {
  const isGood = stage === "approved" || stage === "disbursed";
  const isBad = stage === "rejected";
  const bg = isGood ? colors.primarySoft : isBad ? "#FEE2E2" : "#FEF3C7";
  const text = isGood ? colors.primaryDark : isBad ? "#DC2626" : "#92400E";
  const Icon = isGood ? CheckCircle2 : isBad ? XCircle : Clock;
  return (
    <View style={[s.stagePill, { backgroundColor: bg }]}>
      <Icon size={10} color={text} strokeWidth={2.5} />
      <Text style={[s.stagePillText, { color: text }]}>{STAGE_LABELS[stage] ?? stage}</Text>
    </View>
  );
}

export default function UserDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assign scheme modal
  const [showModal, setShowModal] = useState(false);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, appsRes] = await Promise.all([
        apiGet<any>(`/admin/users/${id}`),
        apiGet<any[]>(`/admin/users/${id}/scheme-applications`),
      ]);
      setUser(userRes.user ?? userRes);
      setBusiness(userRes.business_profile ?? null);
      setApplications(Array.isArray(appsRes) ? appsRes : []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const openAssignModal = async () => {
    setSelectedScheme(null);
    setShowModal(true);
    const res = await apiGet<any[]>("/admin/schemes");
    setSchemes(Array.isArray(res) ? res.filter((sc: any) => !sc.disabled) : []);
  };

  const handleAssign = async () => {
    if (!selectedScheme) return;
    const alreadyAssigned = applications.find((a) => a.scheme_id === selectedScheme.id);
    if (alreadyAssigned) {
      Alert.alert("Already Assigned", "This scheme is already assigned to this user.");
      return;
    }
    setAssigning(true);
    try {
      await apiPost(`/admin/users/${id}/scheme-applications`, {
        scheme_id: selectedScheme.id,
        scheme_name: selectedScheme.name,
      });
      setShowModal(false);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not assign scheme.");
    } finally {
      setAssigning(false);
    }
  };

  const handleDelete = async (appId: string) => {
    const confirmed =
      typeof window !== "undefined" && typeof (window as any).confirm === "function"
        ? (window as any).confirm("Remove this scheme assignment?")
        : true;
    if (!confirmed) return;
    setDeleting(appId);
    try {
      await apiDelete(`/admin/scheme-applications/${appId}`);
      await load();
    } catch {
      Alert.alert("Error", "Could not remove assignment.");
    } finally {
      setDeleting(null);
    }
  };

  const assignedSchemeIds = new Set(applications.map((a) => a.scheme_id));

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
        <BackBar title="User Detail" onBack={() => router.back()} />
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
      <BackBar title={user?.full_name || "User Detail"} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* User Info Card */}
        <View style={s.userCard}>
          <View style={s.avatarLarge}>
            <Text style={s.avatarLargeText}>{(user?.full_name || "U").charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{user?.full_name || "Unnamed"}</Text>
            <View style={s.metaRow}>
              <Phone size={11} color={colors.textDim} strokeWidth={2} />
              <Text style={s.metaText}>+91 {user?.mobile}</Text>
            </View>
            {user?.state && (
              <View style={s.metaRow}>
                <MapPin size={11} color={colors.textDim} strokeWidth={2} />
                <Text style={s.metaText}>{user?.state}{user?.district ? `, ${user?.district}` : ""}</Text>
              </View>
            )}
            {user?.role && user.role !== "user" && (
              <View style={[s.rolePill, { marginTop: 6 }]}>
                <Text style={s.rolePillText}>{user.role.replace(/_/g, " ")}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Business Info */}
        {business && (
          <View style={s.sectionCard}>
            <Text style={s.sectionLabel}>Business</Text>
            <Text style={s.sectionValue}>{business.business_name || "—"}</Text>
            {business.business_type && (
              <Text style={s.sectionMeta}>{business.business_type} · {business.industry || "—"}</Text>
            )}
          </View>
        )}

        {/* Assigned Schemes */}
        <View style={s.sectionHeader}>
          <Landmark size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={s.sectionTitle}>Assigned Schemes ({applications.length})</Text>
          <TouchableOpacity style={s.addBtn} onPress={openAssignModal} activeOpacity={0.8}>
            <Plus size={13} color={colors.primaryDark} strokeWidth={2.5} />
            <Text style={s.addBtnText}>Assign</Text>
          </TouchableOpacity>
        </View>

        {applications.length === 0 ? (
          <View style={s.emptyBox}>
            <Landmark size={28} color={colors.textDim} strokeWidth={1.5} />
            <Text style={s.emptyText}>No schemes assigned yet</Text>
            <TouchableOpacity style={s.assignBtn} onPress={openAssignModal}>
              <Text style={s.assignBtnText}>+ Assign a Scheme</Text>
            </TouchableOpacity>
          </View>
        ) : (
          applications.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={s.appCard}
              onPress={() => router.push(`/admin/scheme/${app.scheme_id}`)}
              activeOpacity={0.8}
            >
              <View style={s.schemeIcon}>
                <Landmark size={14} color={colors.primaryDark} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.schemeName}>{app.scheme_name}</Text>
                {app.bank_name && <Text style={s.bankName}>{app.bank_name}</Text>}
                <StagePill stage={app.stage} />
              </View>
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => handleDelete(app.id)}
                disabled={deleting === app.id}
              >
                {deleting === app.id
                  ? <ActivityIndicator size="small" color="#DC2626" />
                  : <Trash2 size={14} color="#DC2626" strokeWidth={2} />}
              </TouchableOpacity>
              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Assign Scheme Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Assign Scheme</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <XCircle size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalHint}>Select a scheme to assign to {user?.full_name || "this user"}:</Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {schemes.map((sc) => {
                const already = assignedSchemeIds.has(sc.id);
                const isSelected = selectedScheme?.id === sc.id;
                return (
                  <TouchableOpacity
                    key={sc.id}
                    style={[s.schemeRow, isSelected && s.schemeRowSelected, already && { opacity: 0.4 }]}
                    onPress={() => !already && setSelectedScheme(sc)}
                    disabled={already}
                    activeOpacity={0.8}
                  >
                    <View style={[s.schemeRowCheck, isSelected && s.schemeRowCheckSelected]}>
                      {isSelected && <CheckCircle2 size={12} color="#FFF" strokeWidth={3} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.schemeRowName}>{sc.name}</Text>
                      <Text style={s.schemeRowAmt}>Up to {formatINR(sc.max_funding)}</Text>
                    </View>
                    {already && <Text style={{ fontSize: 10, color: colors.textDim }}>Assigned</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[s.assignBtn, (!selectedScheme || assigning) && { opacity: 0.5 }]}
              onPress={handleAssign}
              disabled={!selectedScheme || assigning}
            >
              {assigning
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={s.assignBtnText}>Assign {selectedScheme?.name ?? "Scheme"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  userCard: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 10, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatarLarge: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  avatarLargeText: { fontSize: 20, fontFamily: fonts.displayBold, color: colors.primaryDark },
  userName: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  metaText: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  rolePill: { alignSelf: "flex-start", backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  rolePillText: { fontSize: 10, fontFamily: fonts.bold, color: "#92400E", textTransform: "uppercase" },
  sectionCard: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 10 },
  sectionLabel: { fontSize: 10, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  sectionValue: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text },
  sectionMeta: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, marginTop: 4 },
  sectionTitle: { flex: 1, fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  addBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },
  emptyBox: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, fontFamily: fonts.medium, color: colors.textMuted },
  assignBtn: { backgroundColor: colors.primary, borderRadius: radius.xl, paddingVertical: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  assignBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },
  appCard: { backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  schemeIcon: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  schemeName: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text, marginBottom: 2 },
  bankName: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 4 },
  stagePill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  stagePillText: { fontSize: 10, fontFamily: fonts.bold },
  deleteBtn: { padding: 6 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 36, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  modalHint: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },
  schemeRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.lg, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  schemeRowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  schemeRowCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  schemeRowCheckSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  schemeRowName: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  schemeRowAmt: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
});
