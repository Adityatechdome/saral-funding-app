import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  X,
  Check,
  XCircle,
} from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiGet, apiPost, getToken, API_BASE } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

const FILTERS = ["all", "pending", "verified", "rejected"] as const;
type Filter = typeof FILTERS[number];

function statusCfg(status: string) {
  if (status === "verified") return { bg: colors.primarySoft, text: colors.primaryDark, Icon: CheckCircle2 };
  if (status === "rejected")  return { bg: "#FEE2E2",         text: "#DC2626",           Icon: XCircle };
  return                             { bg: "#FEF3C7",         text: "#92400E",           Icon: Clock };
}

function StatusBadge({ status }: { status: string }) {
  const { bg, text, Icon } = statusCfg(status);
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Icon size={11} color={text} strokeWidth={2.5} />
      <Text style={[s.badgeText, { color: text }]}>{status}</Text>
    </View>
  );
}

export default function AdminDocuments() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  // Reject modal state
  const [rejectDoc, setRejectDoc] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  const load = useCallback(async (f: Filter = filter) => {
    setLoading(true);
    try {
      const params = f !== "all" ? `?status=${f}` : "";
      const res = await apiGet<any>(`/admin/documents${params}`);
      setDocs(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(filter); }, [filter]));

  const changeFilter = (f: Filter) => {
    setFilter(f);
    load(f);
  };

  const handleApprove = async (doc: any) => {
    Alert.alert(
      "Verify Document",
      `Mark "${doc.doc_type}" as verified?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Verify",
          onPress: async () => {
            setActioning(doc.id);
            try {
              await apiPost(`/admin/documents/${doc.id}/status`, { status: "verified" });
              await load(filter);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Could not verify document");
            } finally {
              setActioning(null);
            }
          },
        },
      ]
    );
  };

  const openRejectModal = (doc: any) => {
    setRejectDoc(doc);
    setRejectReason("");
  };

  const handleReject = async () => {
    if (!rejectDoc) return;
    if (!rejectReason.trim()) {
      Alert.alert("Reason required", "Please enter a reason for rejection.");
      return;
    }
    setActioning(rejectDoc.id);
    try {
      await apiPost(`/admin/documents/${rejectDoc.id}/status`, {
        status: "rejected",
        reject_reason: rejectReason.trim(),
      });
      setRejectDoc(null);
      setRejectReason("");
      await load(filter);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not reject document");
    } finally {
      setActioning(null);
    }
  };

  const handleView = async (docId: string) => {
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
      Alert.alert("Error", "Could not open document.");
    } finally {
      setViewingDoc(null);
    }
  };

  const renderDoc = ({ item }: { item: any }) => {
    const isPending = item.status === "pending";
    const isActioning = actioning === item.id;

    return (
      <View style={s.card}>
        {/* Top row: type + status */}
        <View style={s.cardHeader}>
          <View style={s.docIconWrap}>
            <FileText size={16} color={colors.primaryDark} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.docType}>{item.doc_type}</Text>
            {item.file_name && (
              <Text style={s.docFile} numberOfLines={1}>{item.file_name}</Text>
            )}
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* User info */}
        <View style={s.userRow}>
          <Text style={s.userLabel}>User:</Text>
          <Text style={s.userValue}>
            {item.user?.full_name || "—"}
            {item.user?.mobile ? `  ·  ${item.user.mobile}` : ""}
          </Text>
        </View>

        {/* Date */}
        <View style={s.userRow}>
          <Text style={s.userLabel}>Uploaded:</Text>
          <Text style={s.userValue}>
            {item.created_at
              ? new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "—"}
          </Text>
        </View>

        {/* Reject reason */}
        {item.status === "rejected" && item.reject_reason && (
          <View style={s.reasonBox}>
            <AlertCircle size={11} color="#DC2626" strokeWidth={2} />
            <Text style={s.reasonText}>{item.reject_reason}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={s.actions}>
          {/* View */}
          <TouchableOpacity
            style={s.viewBtn}
            onPress={() => handleView(item.id)}
            disabled={viewingDoc === item.id}
          >
            {viewingDoc === item.id
              ? <ActivityIndicator size="small" color={colors.primaryDark} />
              : <ExternalLink size={13} color={colors.primaryDark} strokeWidth={2.5} />}
            <Text style={s.viewBtnText}>View</Text>
          </TouchableOpacity>

          {isPending && (
            <>
              <TouchableOpacity
                style={[s.approveBtn, isActioning && { opacity: 0.5 }]}
                onPress={() => handleApprove(item)}
                disabled={isActioning}
              >
                {isActioning
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Check size={13} color="#FFF" strokeWidth={2.5} />}
                <Text style={s.approveBtnText}>Verify</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.rejectBtn, isActioning && { opacity: 0.5 }]}
                onPress={() => openRejectModal(item)}
                disabled={isActioning}
              >
                <X size={13} color="#DC2626" strokeWidth={2.5} />
                <Text style={s.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
      <BackBar title={`Documents (${total})`} onBack={() => router.back()} />

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterBarContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => changeFilter(f)}
          >
            <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : docs.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 8 }}>
          <FileText size={36} color={colors.textDim} strokeWidth={1.5} />
          <Text style={{ fontSize: 15, fontFamily: fonts.displayBold, color: colors.text }}>No documents</Text>
          <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted }}>
            {filter !== "all" ? `No ${filter} documents` : "No documents uploaded yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(item) => item.id}
          renderItem={renderDoc}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Reject modal */}
      <Modal visible={!!rejectDoc} transparent animationType="slide" onRequestClose={() => setRejectDoc(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Reject Document</Text>
              <TouchableOpacity onPress={() => setRejectDoc(null)}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalDoc}>{rejectDoc?.doc_type}</Text>
            <Text style={s.modalUser}>{rejectDoc?.user?.full_name || "—"}</Text>

            <Text style={s.reasonLabel}>Reason for rejection *</Text>
            <TextInput
              style={s.reasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Document is blurry, wrong document uploaded..."
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
              autoFocus
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setRejectDoc(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmRejectBtn, (!rejectReason.trim() || actioning === rejectDoc?.id) && { opacity: 0.5 }]}
                onPress={handleReject}
                disabled={!rejectReason.trim() || actioning === rejectDoc?.id}
              >
                {actioning === rejectDoc?.id
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={s.confirmRejectBtnText}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
  filterBar: { maxHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "#FFF" },
  filterBarContent: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2 },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  filterChipText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  filterChipTextActive: { color: colors.primaryDark, fontFamily: fonts.bold },
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docType: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  docFile: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 1 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userLabel: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted, width: 64 },
  userValue: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.text, flex: 1 },
  reasonBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  reasonText: { fontSize: 12, fontFamily: fonts.medium, color: "#DC2626", flex: 1, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  viewBtnText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primaryDark },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  approveBtnText: { fontSize: 12, fontFamily: fonts.bold, color: "#FFF" },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    backgroundColor: "#FFF5F5",
  },
  rejectBtnText: { fontSize: 12, fontFamily: fonts.bold, color: "#DC2626" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: 36,
    gap: 12,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  modalDoc: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.text },
  modalUser: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, marginTop: -6 },
  reasonLabel: { fontSize: 12, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  reasonInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.textMuted },
  confirmRejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: radius.xl,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  confirmRejectBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },
});
