import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Settings, Bell, Phone, ShieldCheck, LogOut, ChevronRight, Pencil, X, Check, Shield } from "lucide-react-native";

import { colors, spacing, radius, fonts, elevation } from "@/src/theme";
import { apiGet, apiPost, apiLogout } from "@/src/api";

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [bp, setBp] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "info" | "error" } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: "info" | "error" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToast(null));
    }, 3000);
  }, [toastAnim]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editAge, setEditAge] = useState("");

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        apiGet<any>("/auth/me"),
        apiGet<any>("/business-profile").catch(() => ({})),
      ]).then(([u, b]) => {
        setMe(u);
        setBp(b);
        setEditName(u.full_name || "");
        setEditDistrict(u.district || "");
        setEditAge(u.age?.toString() || "");
      });
    }, [])
  );

  const logout = async () => {
    const doLogout = async () => {
      await apiLogout();
      if (Platform.OS === "web") {
        window.location.href = "/login";
      } else {
        router.replace("/login");
      }
    };

    if (Platform.OS === "web") {
      // Alert.alert on web maps to window.confirm which only has OK/Cancel
      if (window.confirm("Are you sure you want to logout?")) {
        await doLogout();
      }
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const saveEdits = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await apiPost("/profile", {
        full_name: editName.trim(),
        state: me.state,
        district: editDistrict.trim() || me.district,
        gender: me.gender,
        age: Number(editAge) || me.age,
        category: me.category,
      });
      const updated = await apiGet<any>("/auth/me");
      setMe(updated);
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const initials = (me?.full_name || "U")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join("");

  const bootstrapAdmin = async () => {
    setBootstrapping(true);
    try {
      const res = await apiPost<{ message: string }>("/auth/bootstrap-admin", {});
      const updated = await apiGet<any>("/auth/me");
      setMe(updated);
      Alert.alert("Success ✓", res.message, [
        { text: "Go to Admin", onPress: () => router.push("/admin") },
      ]);
    } catch (e: any) {
      const msg: string = e.message || "";
      if (msg.toLowerCase().includes("super_admin already exists")) {
        showToast("A Super Admin is already set up", "info");
      } else {
        Alert.alert("Failed", msg || "Could not promote to admin. Make sure the server is running.");
      }
    } finally {
      setBootstrapping(false);
    }
  };

  const actions = [
    ...(me?.role && me.role !== "user"
      ? [{ id: "admin", label: "Admin Console", Icon: Shield, onPress: () => router.push("/admin"), primary: true }]
      : []),
    { id: "book", label: "Book Consultation", Icon: Phone, onPress: () => router.push("/booking") },
    { id: "notif", label: "Notifications", Icon: Bell, onPress: () => router.push("/notifications") },
    { id: "settings", label: "Settings", Icon: Settings, onPress: () => router.push("/settings") },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top"]} testID="profile-tab">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar header */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarOuter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {!editing && (
              <TouchableOpacity
                style={styles.editFab}
                onPress={() => setEditing(true)}
                testID="edit-profile-btn"
              >
                <Pencil size={12} color={colors.primaryDark} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.editNameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
                placeholderTextColor={colors.textPlaceholder}
                autoFocus
              />
              <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditing(false)}>
                <X size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editIconBtn, { backgroundColor: colors.primary }]}
                onPress={saveEdits}
                disabled={saving}
                testID="save-profile-btn"
              >
                <Check size={16} color="#FFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.name}>{me?.full_name || "—"}</Text>
          )}
          <Text style={styles.mobile}>{me?.mobile?.startsWith("+") ? me.mobile : `+91 ${me?.mobile}`}</Text>
          <View style={styles.rolePill}>
            <ShieldCheck size={11} color={colors.primaryDark} strokeWidth={2} />
            <Text style={styles.roleText}>{me?.role === "user" ? "User" : me?.role?.replace(/_/g, " ") || "User"}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>

          {/* Personal info */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionLabel}>Personal</Text>
            <View style={styles.infoCard}>
              {editing ? (
                <>
                  <EditRow
                    label="District"
                    value={editDistrict}
                    onChangeText={setEditDistrict}
                    placeholder={me?.district || "District"}
                  />
                  <EditRow
                    label="Age"
                    value={editAge}
                    onChangeText={(v: string) => setEditAge(v.replace(/\D/g, "").slice(0, 2))}
                    placeholder={me?.age?.toString() || "Age"}
                    keyboardType="number-pad"
                  />
                </>
              ) : (
                <>
                  <InfoRow label="State" value={me?.state} />
                  <InfoRow label="District" value={me?.district} />
                  <InfoRow label="Gender" value={me?.gender} />
                  <InfoRow label="Age" value={me?.age?.toString()} />
                  <InfoRow label="Category" value={me?.category} last />
                </>
              )}
            </View>
          </View>

          {/* Business info */}
          {bp?.industry && (
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>Business</Text>
              <View style={styles.infoCard}>
                <InfoRow label="Stage" value={bp?.business_stage} />
                <InfoRow label="Industry" value={bp?.industry} />
                <InfoRow label="GST" value={bp?.gst_available ? "Registered" : "Not registered"} />
                <InfoRow label="Udyam" value={bp?.udyam_available ? "Registered" : "Not registered"} last />
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsWrap}>
            {actions.map((a) => (
              <TouchableOpacity
                key={a.id}
                testID={`goto-${a.id}`}
                style={[styles.actionRow, a.primary && styles.actionRowPrimary]}
                onPress={a.onPress}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, a.primary && styles.actionIconPrimary]}>
                  <a.Icon size={16} color={a.primary ? colors.primaryDark : colors.textMuted} strokeWidth={2} />
                </View>
                <Text style={[styles.actionLabel, a.primary && styles.actionLabelPrimary]}>
                  {a.label}
                </Text>
                <ChevronRight size={16} color={a.primary ? colors.primaryDark : colors.textDim} strokeWidth={2} />
              </TouchableOpacity>
            ))}

            {(!me?.role || me.role === "user") && (
              <TouchableOpacity
                testID="bootstrap-admin-btn"
                style={[styles.actionRow, { borderColor: "#FEF3C7", backgroundColor: "#FFFBEB", opacity: bootstrapping ? 0.6 : 1 }]}
                onPress={bootstrapAdmin}
                disabled={bootstrapping}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
                  {bootstrapping
                    ? <ActivityIndicator size="small" color="#92400E" />
                    : <Shield size={16} color="#92400E" strokeWidth={2} />}
                </View>
                <Text style={[styles.actionLabel, { color: "#92400E" }]}>
                  {bootstrapping ? "Connecting to server…" : "Become Admin (Dev)"}
                </Text>
                {!bootstrapping && <ChevronRight size={16} color="#92400E" strokeWidth={2} />}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              testID="logout-btn"
              style={[styles.actionRow, styles.logoutRow]}
              onPress={logout}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, styles.logoutIcon]}>
                <LogOut size={16} color={colors.danger} strokeWidth={2} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.danger }]}>Logout</Text>
              <ChevronRight size={16} color={colors.danger} strokeWidth={2} />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
      {/* Toast */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === "error" ? styles.toastError : styles.toastInfo,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value?: string; last?: boolean }) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.rowBorder]}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value || "—"}</Text>
    </View>
  );
}

function EditRow({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <View style={infoStyles.editRow}>
      <Text style={infoStyles.label}>{label}</Text>
      <TextInput
        style={infoStyles.editInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textPlaceholder}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
  },
  value: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    maxWidth: "55%",
    textAlign: "right",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editInput: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    textAlign: "right",
    minWidth: 120,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primarySoft,
  },
});

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  avatarOuter: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
  editFab: {
    position: "absolute",
    bottom: 0,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 4,
  },
  mobile: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: 8,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  roleText: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
    textTransform: "capitalize",
  },
  editNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  editNameInput: {
    fontSize: 18,
    fontFamily: fonts.displayBold,
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    minWidth: 160,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionWrap: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...elevation.l1,
  },
  actionsWrap: {
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    ...elevation.l1,
  },
  actionRowPrimary: {
    borderColor: colors.primarySoft,
    backgroundColor: colors.primarySoft,
  },
  logoutRow: {
    borderColor: "#FEE2E2",
    backgroundColor: "#FFF",
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconPrimary: {
    backgroundColor: colors.primaryMid,
  },
  logoutIcon: {
    backgroundColor: "#FEE2E2",
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  actionLabelPrimary: {
    color: colors.primaryDark,
  },
  toast: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastInfo: {
    backgroundColor: "#1C1C1E",
  },
  toastError: {
    backgroundColor: "#DC2626",
  },
  toastText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: "#FFF",
    textAlign: "center",
  },
});
