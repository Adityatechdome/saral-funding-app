import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, ScrollView, Modal, TextInput, Alert, Linking, Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, User, Calendar, Clock, StickyNote, Phone, Video, Copy } from "lucide-react-native";

import { colors, spacing, radius, fonts, stageColor } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import EmptyState from "@/src/components/EmptyState";

const STATUSES = ["all", "new", "called", "follow_up", "interested", "submitted", "approved", "closed"];

function StatusPill({ status }: { status: string }) {
  const { bg, text } = stageColor(status);
  return (
    <View style={[pillStyles.wrap, { backgroundColor: bg }]}>
      <Text style={[pillStyles.text, { color: text }]}>{status.replace("_", " ")}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  text: { fontSize: 10, fontFamily: fonts.bold, textTransform: "capitalize", letterSpacing: 0.3 },
});

export default function AdminConsultations() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const load = async (st: string) => {
    setLoading(true);
    try {
      const res = await apiGet<any[]>(`/admin/consultations${st !== "all" ? `?status=${st}` : ""}`);
      setItems(res);
    } catch {
      Alert.alert("Error", "Failed to load consultations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(filter); }, [filter]);

  const updateStatus = async (cid: string, status: string) => {
    await apiPost(`/admin/consultations/${cid}`, { status, notes });
    setEditing(null);
    setNotes("");
    load(filter);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-consultations">
      <BackBar title="Consultations" onBack={() => router.back()} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingVertical: 8, paddingHorizontal: spacing.md }}
        style={{ flexGrow: 0 }}
      >
        {STATUSES.map((s) => {
          const active = filter === s;
          const { bg, text: textColor } = s !== "all" ? stageColor(s) : { bg: colors.primarySoft, text: colors.primaryDark };
          return (
            <TouchableOpacity
              key={s}
              testID={`status-filter-${s}`}
              style={[
                styles.filterChip,
                active && { backgroundColor: s === "all" ? colors.primary : bg, borderColor: "transparent" },
              ]}
              onPress={() => setFilter(s)}
            >
              <Text style={[
                styles.filterChipText,
                active && { color: s === "all" ? "#FFF" : textColor, fontFamily: fonts.bold },
              ]}>
                {s.replace("_", " ")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <EmptyState Icon={Phone} title="No consultations" subtitle={`No "${filter}" consultations`} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`consult-${item.id}`}
              style={styles.card}
              onPress={() => { setEditing(item); setNotes(item.notes || ""); }}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <User size={14} color={colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.user?.full_name || "—"}</Text>
                  <Text style={styles.userMobile}>+91 {item.user?.mobile || ""}</Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.consultType}>{item.consultation_type}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{item.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.metaText}>{item.time_slot}</Text>
                  </View>
                  {item.user?.state && (
                    <Text style={styles.metaText}>{item.user.state}</Text>
                  )}
                </View>
                {item.notes && (
                  <View style={styles.notesPreview}>
                    <StickyNote size={11} color={colors.textDim} strokeWidth={2} />
                    <Text style={styles.notesText} numberOfLines={1}>{item.notes}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBg}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{editing?.user?.full_name || "Consultation"}</Text>
                <Text style={styles.sheetMeta}>
                  {editing?.consultation_type}  ·  {editing?.date}  {editing?.time_slot}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setEditing(null)}
                testID="cancel-update"
              >
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              testID="consult-notes"
              style={styles.notesInput}
              placeholder="Add consultation notes…"
              placeholderTextColor={colors.textPlaceholder}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />

            {editing?.meet_link && (
              <View style={styles.meetBox}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Video size={15} color={colors.primaryDark} strokeWidth={2} />
                  <Text style={styles.fieldLabel}>Meeting Link</Text>
                </View>
                <Text style={styles.meetLinkText} numberOfLines={1}>{editing.meet_link}</Text>
                <View style={styles.meetActions}>
                  <TouchableOpacity
                    style={styles.meetBtn}
                    onPress={() => Share.share({ message: editing.meet_link, title: "Meeting Link" })}
                    activeOpacity={0.8}
                  >
                    <Copy size={13} color={colors.primaryDark} strokeWidth={2.5} />
                    <Text style={styles.meetBtnText}>Copy Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.meetBtn, styles.meetBtnJoin]}
                    onPress={() => Linking.openURL(editing.meet_link)}
                    activeOpacity={0.8}
                  >
                    <Video size={13} color="#FFF" strokeWidth={2.5} />
                    <Text style={[styles.meetBtnText, { color: "#FFF" }]}>Join Meeting</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.fieldLabel}>Update Status</Text>
            <View style={styles.statusGrid}>
              {STATUSES.filter((s) => s !== "all").map((s) => {
                const { bg, text: textColor } = stageColor(s);
                const isActive = editing?.status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    testID={`upd-status-${s}`}
                    style={[styles.statusChip, { backgroundColor: isActive ? bg : "#FFF", borderColor: isActive ? textColor : colors.border }]}
                    onPress={() => updateStatus(editing!.id, s)}
                  >
                    <Text style={[styles.statusChipText, { color: isActive ? textColor : colors.textMuted }]}>
                      {s.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
    marginBottom: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  userMobile: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 1,
  },
  cardBody: {},
  consultType: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
    marginTop: 6,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    fontStyle: "italic",
  },
  modalBg: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  sheetMeta: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
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
    backgroundColor: colors.surface2,
    marginBottom: 16,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    textTransform: "capitalize",
  },
  meetBox: {
    backgroundColor: colors.primarySoft, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.primary, padding: 14, marginBottom: 16,
  },
  meetLinkText: {
    fontSize: 11, fontFamily: fonts.medium, color: colors.primaryDark,
    opacity: 0.8, marginBottom: 10,
  },
  meetActions: { flexDirection: "row", gap: 8 },
  meetBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: "#FFF",
  },
  meetBtnJoin: { backgroundColor: colors.primary, borderColor: colors.primary },
  meetBtnText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primaryDark },
});
