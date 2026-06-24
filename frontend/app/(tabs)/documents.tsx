import { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  CheckCircle2,
  Clock,
  X,
  Upload,
  FileText,
  AlertCircle,
  Paperclip,
  ExternalLink,
  FolderOpen,
  Info,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  User as UserIcon,
} from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiGet, apiDelete, getToken, API_BASE } from "@/src/api";

const DOC_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "GST Certificate",
  "Udyam Certificate",
  "Bank Statement (6 months)",
  "ITR (Income Tax Return)",
  "Project Report",
  "Quotation / Invoice",
  "Partnership Deed",
  "Property Papers",
];

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

function statusStyle(status: string) {
  if (status === "verified") return { bg: colors.primarySoft, text: colors.primaryDark };
  if (status === "rejected") return { bg: "#FEE2E2", text: "#DC2626" };
  return { bg: "#FEF3C7", text: "#92400E" };
}

function StatusBadge({ status }: { status: string }) {
  const { bg, text } = statusStyle(status);
  const Icon = status === "verified" ? CheckCircle2 : status === "rejected" ? AlertCircle : Clock;
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      <Icon size={11} color={text} strokeWidth={2.5} />
      <Text style={[badge.text, { color: text }]}>{status}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  text: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
});

function UserDocumentsTab() {
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiGet<any[]>("/documents/me");
      setDocs(Array.isArray(res) ? res : []);
    } catch {
      setDocs([]);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPickedFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
    } catch {
      Alert.alert("Error", "Could not open file picker.");
    }
  };

  const handleUpload = async () => {
    if (!selected) {
      Alert.alert("Select a document type", "Tap a chip below to choose which document to upload.");
      return;
    }
    if (!pickedFile) {
      Alert.alert("Choose a file", "Tap 'Choose File' to select a PDF or image.");
      return;
    }
    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("doc_type", selected);

      if (Platform.OS === "web") {
        const blobRes = await fetch(pickedFile.uri);
        const blob = await blobRes.blob();
        formData.append("file", blob, pickedFile.name);
      } else {
        formData.append("file", {
          uri: pickedFile.uri,
          name: pickedFile.name,
          type: pickedFile.mimeType || "application/octet-stream",
        } as any);
      }

      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed (${response.status})`);
      }
      setSelected(null);
      setPickedFile(null);
      await load();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message || "Could not upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    Alert.alert("Delete Document", "Remove this pending document?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(docId);
          try {
            await apiDelete(`/documents/${docId}`);
            await load();
          } catch {
            Alert.alert("Error", "Could not delete document.");
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const handleView = async (docId: string) => {
    setViewingDoc(docId);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/documents/${docId}/download`, {
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

  const uploadedTypes = new Set(docs.map((d) => d.doc_type));
  const canUpload = !!selected && !!pickedFile && !uploading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="documents-tab">
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={s.headerIcon}>
          <FolderOpen size={18} color={colors.primaryDark} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Document Vault</Text>
          <Text style={s.headerSub}>{docs.length} document{docs.length !== 1 ? "s" : ""} uploaded</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Upload section */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>Upload a Document</Text>
          <Text style={s.hint}>Select the document type, choose a file, then tap Upload.</Text>

          <View style={s.chips}>
            {DOC_TYPES.map((type) => {
              const isUploaded = uploadedTypes.has(type);
              const isSelected = selected === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[s.chip, isSelected && s.chipSelected, isUploaded && s.chipUploaded]}
                  onPress={() => {
                    if (!isUploaded) {
                      setSelected(isSelected ? null : type);
                      if (isSelected) setPickedFile(null);
                    }
                  }}
                  activeOpacity={0.75}
                >
                  {isUploaded && <CheckCircle2 size={11} color={colors.primaryDark} strokeWidth={2.5} />}
                  <Text style={[s.chipText, isSelected && s.chipTextSelected, isUploaded && s.chipTextUploaded]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[s.filePickerBtn, !selected && { opacity: 0.45 }]}
            onPress={handlePickFile}
            disabled={!selected || uploading}
            activeOpacity={0.8}
          >
            <Paperclip size={14} color={colors.primaryDark} strokeWidth={2.5} />
            <Text style={s.filePickerText} numberOfLines={1}>
              {pickedFile ? pickedFile.name : "Choose File (PDF or Image)"}
            </Text>
            {pickedFile && <CheckCircle2 size={14} color={colors.primaryDark} strokeWidth={2.5} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.uploadBtn, !canUpload && { opacity: 0.5 }]}
            onPress={handleUpload}
            disabled={!canUpload}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Upload size={15} color="#FFF" strokeWidth={2.5} />
                <Text style={s.uploadBtnText}>
                  {selected && pickedFile ? `Upload "${selected}"` : selected ? "Choose a file above" : "Select a type above"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Uploaded documents list */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Uploaded Documents</Text>
          <Text style={s.sectionCount}>{docs.length} docs</Text>
        </View>

        {docs.length === 0 ? (
          <View style={s.emptyCard}>
            <FileText size={32} color={colors.textDim} strokeWidth={1.5} />
            <Text style={s.emptyText}>No documents uploaded yet</Text>
            <Text style={s.emptyHint}>
              Select a document type above, choose a file, and tap Upload to get started.
            </Text>
          </View>
        ) : (
          docs.map((doc) => (
            <View key={doc.id} style={s.docCard}>
              <View style={s.docIcon}>
                <FileText size={18} color={colors.primaryDark} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.docName}>{doc.doc_type}</Text>
                {doc.file_name && (
                  <Text style={s.docFileName} numberOfLines={1}>{doc.file_name}</Text>
                )}
                <Text style={s.docDate}>
                  {doc.created_at
                    ? new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </Text>
                <View style={{ marginTop: 5 }}>
                  <StatusBadge status={doc.status} />
                </View>
                {doc.status === "rejected" && doc.reject_reason && (
                  <View style={s.rejectReasonBox}>
                    <Info size={11} color="#DC2626" strokeWidth={2} />
                    <Text style={s.rejectReasonText}>{doc.reject_reason}</Text>
                  </View>
                )}
              </View>
              <View style={s.docActions}>
                {doc.file_name && (
                  <TouchableOpacity style={s.viewBtn} onPress={() => handleView(doc.id)} disabled={viewingDoc === doc.id}>
                    {viewingDoc === doc.id
                      ? <ActivityIndicator color={colors.primaryDark} size="small" />
                      : <ExternalLink size={13} color={colors.primaryDark} strokeWidth={2.5} />}
                  </TouchableOpacity>
                )}
                {doc.status === "pending" && (
                  <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(doc.id)} disabled={deleting === doc.id}>
                    {deleting === doc.id
                      ? <ActivityIndicator color={colors.textDim} size="small" />
                      : <X size={14} color="#DC2626" strokeWidth={2.5} />}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 1,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm2,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.sm2,
    lineHeight: 18,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipUploaded: { borderColor: colors.primaryDark + "40", backgroundColor: colors.primarySoft, opacity: 0.7 },
  chipText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  chipTextSelected: { color: colors.primaryDark, fontFamily: fonts.bold },
  chipTextUploaded: { color: colors.primaryDark },
  filePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: radius.xl,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: colors.primarySoft,
  },
  filePickerText: { flex: 1, fontSize: 13, fontFamily: fonts.medium, color: colors.primaryDark },
  uploadBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text },
  sectionCount: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.text },
  emptyHint: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center", lineHeight: 18 },
  docCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  docName: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  docFileName: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 1 },
  docDate: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 2 },
  docActions: {
    flexDirection: "column",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "center",
  },
  viewBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rejectReasonBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 5,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectReasonText: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: "#DC2626",
    flex: 1,
    lineHeight: 16,
  },
});

// ── Admin: User-first Documents View ──
const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  verified: { bg: colors.primarySoft, color: colors.primaryDark },
  rejected: { bg: "#FEE2E2", color: "#DC2626" },
  pending:  { bg: "#FEF3C7", color: "#92400E" },
};

function AdminUserDocuments() {
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; mobile: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<any>("/admin/documents");
      setAllDocs(res.items ?? []);
    } catch {
      setAllDocs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // Group documents by user
  const userMap = new Map<string, { id: string; name: string; mobile: string; docs: any[] }>();
  allDocs.forEach((doc) => {
    const uid = doc.user?.id || doc.user_id || "unknown";
    const name = doc.user?.full_name || "Unknown User";
    const mobile = doc.user?.mobile ? `+${doc.user.mobile}` : "";
    if (!userMap.has(uid)) userMap.set(uid, { id: uid, name, mobile, docs: [] });
    userMap.get(uid)!.docs.push(doc);
  });
  const userList = Array.from(userMap.values());

  // Docs for selected user
  const selectedDocs = selectedUser ? (userMap.get(selectedUser.id)?.docs ?? []) : [];

  const handleView = async (docId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/admin/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      const { url } = await response.json();
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open document.");
    }
  };

  // ── User list view ──
  if (!selectedUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]}>
        <View style={adS.header}>
          <FileSearch size={18} color={colors.primaryDark} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={adS.headerTitle}>User Documents</Text>
            <Text style={adS.headerSub}>{userList.length} users · {allDocs.length} docs total</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : userList.length === 0 ? (
          <View style={adS.emptyBox}>
            <FileSearch size={40} color={colors.textDim} strokeWidth={1.5} />
            <Text style={adS.emptyTitle}>No Documents Found</Text>
            <Text style={adS.emptySub}>Documents uploaded by users will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={userList}
            keyExtractor={(u) => u.id}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item: u }) => {
              const verified = u.docs.filter((d: any) => d.status === "verified").length;
              const pending  = u.docs.filter((d: any) => d.status === "pending").length;
              const rejected = u.docs.filter((d: any) => d.status === "rejected").length;
              return (
                <TouchableOpacity
                  style={adS.userCard}
                  onPress={() => setSelectedUser({ id: u.id, name: u.name, mobile: u.mobile })}
                  activeOpacity={0.8}
                >
                  <View style={adS.avatar}>
                    <Text style={adS.avatarText}>{u.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={adS.userName}>{u.name}</Text>
                    <Text style={adS.userMobile}>{u.mobile}</Text>
                    <View style={adS.docCountRow}>
                      {verified > 0 && (
                        <View style={[adS.miniPill, { backgroundColor: colors.primarySoft }]}>
                          <Text style={[adS.miniPillText, { color: colors.primaryDark }]}>{verified} verified</Text>
                        </View>
                      )}
                      {pending > 0 && (
                        <View style={[adS.miniPill, { backgroundColor: "#FEF3C7" }]}>
                          <Text style={[adS.miniPillText, { color: "#92400E" }]}>{pending} pending</Text>
                        </View>
                      )}
                      {rejected > 0 && (
                        <View style={[adS.miniPill, { backgroundColor: "#FEE2E2" }]}>
                          <Text style={[adS.miniPillText, { color: "#DC2626" }]}>{rejected} rejected</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={16} color={colors.textDim} strokeWidth={2} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── User documents detail view ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]}>
      <View style={adS.detailHeader}>
        <TouchableOpacity onPress={() => setSelectedUser(null)} style={adS.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={adS.headerTitle}>{selectedUser.name}</Text>
          <Text style={adS.headerSub}>{selectedUser.mobile} · {selectedDocs.length} document{selectedDocs.length !== 1 ? "s" : ""}</Text>
        </View>
      </View>

      <FlatList
        data={selectedDocs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item: doc }) => {
          const cfg = STATUS_CFG[doc.status] ?? STATUS_CFG.pending;
          return (
            <View style={adS.docCard}>
              <View style={adS.docCardHeader}>
                <View style={adS.docIcon}>
                  <FileText size={16} color={colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={adS.docType}>{doc.doc_type}</Text>
                  {doc.file_name && <Text style={adS.docFile} numberOfLines={1}>{doc.file_name}</Text>}
                </View>
                <View style={[adS.statusPill, { backgroundColor: cfg.bg }]}>
                  <Text style={[adS.statusText, { color: cfg.color }]}>{doc.status}</Text>
                </View>
              </View>
              <Text style={adS.docDate}>
                Uploaded: {doc.created_at
                  ? new Date(doc.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "—"}
              </Text>
              {doc.status === "rejected" && doc.reject_reason && (
                <View style={adS.reasonBox}>
                  <AlertCircle size={11} color="#DC2626" strokeWidth={2} />
                  <Text style={adS.reasonText}>{doc.reject_reason}</Text>
                </View>
              )}
              <TouchableOpacity style={adS.viewBtn} onPress={() => handleView(doc.id)} activeOpacity={0.8}>
                <ExternalLink size={13} color={colors.primaryDark} strokeWidth={2.5} />
                <Text style={adS.viewBtnText}>View Document</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const adS = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.md, paddingTop: 14, paddingBottom: 12,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 12,
    backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text },
  headerSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, marginTop: -60 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  emptySub: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center", lineHeight: 20 },
  userCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, padding: 14, marginBottom: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.primaryDark },
  userName: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  userMobile: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  docCountRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  miniPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  miniPillText: { fontSize: 10, fontFamily: fonts.bold },
  docCard: {
    backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, gap: 8,
  },
  docCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  docIcon: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  docType: { fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  docFile: { fontSize: 11, fontFamily: fonts.regular, color: colors.textDim, marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, flexShrink: 0 },
  statusText: { fontSize: 11, fontFamily: fonts.bold, textTransform: "capitalize" },
  docDate: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  reasonBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "#FEF2F2", borderRadius: radius.lg, padding: 10,
    borderWidth: 1, borderColor: "#FECACA",
  },
  reasonText: { fontSize: 12, fontFamily: fonts.medium, color: "#DC2626", flex: 1, lineHeight: 17 },
  viewBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface2,
  },
  viewBtnText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primaryDark },
});

export default function DocumentsTab() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    apiGet<any>("/auth/me")
      .then((me: any) => setIsAdmin(me?.role && me.role !== "user"))
      .catch(() => setIsAdmin(false));
  }, []);

  if (isAdmin === null) return null;
  if (isAdmin) return <AdminUserDocuments />;
  return <UserDocumentsTab />;
}
