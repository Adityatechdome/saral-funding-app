import { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  UserPlus, Users, ChevronDown, X, Check, Trash2, Shield,
} from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiGet, apiPost, apiDelete } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";

const ROLES = [
  { value: "super_admin",       label: "Super Admin",       desc: "Full access including team & config",      color: "#FEF3C7", text: "#92400E" },
  { value: "manager",           label: "Manager",           desc: "Full access except super admin actions",  color: "#DBEAFE", text: "#1D4ED8" },
  { value: "expert",            label: "Expert",            desc: "View leads, add notes, recommend schemes", color: "#EDE9FE", text: "#5B21B6" },
  { value: "sales_executive",   label: "Sales Executive",   desc: "Manage leads and consultations",           color: colors.primarySoft, text: colors.primaryDark },
  { value: "support_executive", label: "Support Executive", desc: "View users, handle support queries",       color: "#FEE2E2", text: "#DC2626" },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.value === role);
  if (!r) return null;
  return (
    <View style={[badge.wrap, { backgroundColor: r.color }]}>
      <Text style={[badge.text, { color: r.text }]}>{r.label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill },
  text: { fontSize: 10, fontFamily: fonts.bold, textTransform: "uppercase", letterSpacing: 0.3 },
});

export default function AdminTeam() {
  const router = useRouter();
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false);
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState("sales_executive");
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, me] = await Promise.all([
        apiGet<any[]>("/admin/team"),
        apiGet<any>("/auth/me"),
      ]);
      setTeam(Array.isArray(res) ? res : []);
      setCurrentUserRole(me?.role || "");
    } catch {
      setTeam([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleInvite = async () => {
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Name required", "Enter the team member's name.");
      return;
    }
    setInviting(true);
    try {
      await apiPost("/admin/team/invite", {
        mobile: cleanMobile,
        full_name: name.trim(),
        role: selectedRole,
      });
      setShowInvite(false);
      setMobile("");
      setName("");
      setSelectedRole("sales_executive");
      await load();
      Alert.alert("Done", "Team member added. They can now log in with their mobile number.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not add team member.");
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      await apiPost(`/admin/users/${userId}/role`, { role: newRole });
      setTeam((prev) => prev.map((m) => m.id === userId ? { ...m, role: newRole } : m));
    } catch {
      Alert.alert("Error", "Could not update role.");
    } finally {
      setChangingRole(null);
    }
  };

  const handleRemove = (member: any) => {
    Alert.alert(
      "Remove Team Member",
      `Remove ${member.full_name || member.mobile} from the team? They will lose admin access.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await apiPost(`/admin/users/${member.id}/role`, { role: "user" });
              await load();
            } catch {
              Alert.alert("Error", "Could not remove team member.");
            }
          },
        },
      ]
    );
  };

  const isSuperAdmin = currentUserRole === "super_admin";
  const visibleRoles = isSuperAdmin ? ROLES : ROLES.filter((r) => r.value !== "super_admin");
  const selectedRoleObj = ROLES.find((r) => r.value === selectedRole) ?? ROLES[1];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
      <BackBar title="Team Members" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Header row */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Users size={14} color={colors.primaryDark} strokeWidth={2} />
            <Text style={s.headerText}>{team.length} team member{team.length !== 1 ? "s" : ""}</Text>
          </View>
          <TouchableOpacity style={s.inviteBtn} onPress={() => setShowInvite(true)} activeOpacity={0.85}>
            <UserPlus size={14} color="#FFF" strokeWidth={2.5} />
            <Text style={s.inviteBtnText}>Add Member</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : team.length === 0 ? (
          <View style={s.emptyCard}>
            <Shield size={32} color={colors.textDim} strokeWidth={1.5} />
            <Text style={s.emptyTitle}>No team members yet</Text>
            <Text style={s.emptyHint}>Tap "Add Member" to invite your first team member.</Text>
          </View>
        ) : (
          team.map((member) => (
            <View key={member.id} style={s.memberCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(member.full_name || "U").charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={s.memberName} numberOfLines={1}>{member.full_name || "Unnamed"}</Text>
                  {member.role === "super_admin" && (
                    <View style={[badge.wrap, { backgroundColor: "#FEF3C7" }]}>
                      <Text style={[badge.text, { color: "#92400E" }]}>Super Admin</Text>
                    </View>
                  )}
                  {member.role !== "super_admin" && <RoleBadge role={member.role} />}
                </View>
                <Text style={s.memberMobile}>+91 {member.mobile}</Text>

                {/* Role change — only for non super_admin members, or if current user is super_admin */}
                {(member.role !== "super_admin" || isSuperAdmin) && member.role !== "super_admin" && (
                  <View style={s.roleRow}>
                    {visibleRoles.map((r) => (
                      <TouchableOpacity
                        key={r.value}
                        style={[s.roleChip, member.role === r.value && { backgroundColor: r.color, borderColor: r.text + "40" }]}
                        onPress={() => handleChangeRole(member.id, r.value)}
                        disabled={changingRole === member.id || member.role === r.value}
                        activeOpacity={0.75}
                      >
                        {changingRole === member.id && member.role !== r.value ? (
                          <ActivityIndicator size={10} color={colors.textDim} />
                        ) : member.role === r.value ? (
                          <Check size={10} color={r.text} strokeWidth={2.5} />
                        ) : null}
                        <Text style={[s.roleChipText, member.role === r.value && { color: r.text, fontFamily: fonts.bold }]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Remove button */}
              {member.role !== "super_admin" && (
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemove(member)} activeOpacity={0.75}>
                  <Trash2 size={14} color="#DC2626" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.header}>
              <Text style={modal.title}>Add Team Member</Text>
              <TouchableOpacity onPress={() => setShowInvite(false)}>
                <X size={20} color={colors.textDim} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <Text style={modal.label}>Full Name</Text>
            <TextInput
              style={modal.input}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.textPlaceholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Text style={modal.label}>Mobile Number</Text>
            <TextInput
              style={modal.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.textPlaceholder}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text style={modal.label}>Role</Text>
            <TouchableOpacity style={modal.rolePicker} onPress={() => setShowRolePicker(!showRolePicker)} activeOpacity={0.8}>
              <View style={[badge.wrap, { backgroundColor: selectedRoleObj.color }]}>
                <Text style={[badge.text, { color: selectedRoleObj.text }]}>{selectedRoleObj.label}</Text>
              </View>
              <Text style={modal.roleDesc}>{selectedRoleObj.desc}</Text>
              <ChevronDown size={16} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>

            {showRolePicker && (
              <View style={modal.roleList}>
                {visibleRoles.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[modal.roleOption, selectedRole === r.value && { backgroundColor: r.color + "40" }]}
                    onPress={() => { setSelectedRole(r.value); setShowRolePicker(false); }}
                    activeOpacity={0.8}
                  >
                    <View style={[badge.wrap, { backgroundColor: r.color }]}>
                      <Text style={[badge.text, { color: r.text }]}>{r.label}</Text>
                    </View>
                    <Text style={modal.roleOptionDesc}>{r.desc}</Text>
                    {selectedRole === r.value && <Check size={14} color={colors.primaryDark} strokeWidth={2.5} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[modal.addBtn, inviting && { opacity: 0.7 }]}
              onPress={handleInvite}
              disabled={inviting}
              activeOpacity={0.85}
            >
              {inviting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <UserPlus size={16} color="#FFF" strokeWidth={2.5} />
                  <Text style={modal.addBtnText}>Add Team Member</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerText: { fontSize: 13, fontFamily: fonts.medium, color: colors.textMuted },
  inviteBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  inviteBtnText: { fontSize: 13, fontFamily: fonts.displayBold, color: "#FFF" },
  emptyCard: {
    backgroundColor: "#FFF", borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, alignItems: "center", gap: 8,
  },
  emptyTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.text },
  emptyHint: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: "center", lineHeight: 18 },
  memberCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#FFF", borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: 10,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.primaryDark },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  memberName: { flex: 1, fontSize: 14, fontFamily: fonts.displayBold, color: colors.text },
  memberMobile: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 8 },
  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  roleChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  roleChipText: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center",
    flexShrink: 0, alignSelf: "center",
  },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.md, paddingBottom: 40,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 18, fontFamily: fonts.displayBold, color: colors.text },
  label: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, fontSize: 14, fontFamily: fonts.regular,
    color: colors.text, backgroundColor: colors.surface2, marginBottom: 16,
  },
  rolePicker: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    padding: 12, backgroundColor: colors.surface2, marginBottom: 8,
  },
  roleDesc: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  roleList: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    overflow: "hidden", marginBottom: 16,
  },
  roleOption: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  roleOptionDesc: { flex: 1, fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingVertical: 14, marginTop: 8,
  },
  addBtnText: { fontSize: 15, fontFamily: fonts.displayBold, color: "#FFF" },
});
