import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, ScrollView, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Banknote, ChevronRight, Building2, Plus, X } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import EmptyState from "@/src/components/EmptyState";

const BANK_TYPES = ["Public", "Private", "Development", "Small Finance Bank", "NBFC", "Fintech NBFC"];

export default function AdminBanks() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", short_name: "", type: "Public",
    interest_min: "", interest_max: "", max_funding: "",
    processing_fee_percent: "", description: "", why: "",
    supports: "", industries: "", states: "All India",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [banks, me] = await Promise.all([
        apiGet<any[]>("/banks"),
        apiGet<any>("/auth/me"),
      ]);
      setItems(Array.isArray(banks) ? banks : []);
      setRole(me?.role ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert("Required", "Bank name is required.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/admin/banks", {
        name: form.name.trim(),
        short_name: form.short_name.trim(),
        type: form.type,
        interest_min: parseFloat(form.interest_min) || 0,
        interest_max: parseFloat(form.interest_max) || 0,
        max_funding: parseInt(form.max_funding) || 0,
        processing_fee_percent: parseFloat(form.processing_fee_percent) || 0,
        description: form.description.trim(),
        why: form.why.trim(),
        supports: form.supports.split(",").map((s) => s.trim()).filter(Boolean),
        industries: form.industries.split(",").map((s) => s.trim()).filter(Boolean),
        states: form.states.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setShowCreate(false);
      setForm({ name: "", short_name: "", type: "Public", interest_min: "", interest_max: "", max_funding: "", processing_fee_percent: "", description: "", why: "", supports: "", industries: "", states: "All India" });
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not create bank.");
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = role === "super_admin";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]}>
      <BackBar
        title="Banks"
        onBack={() => router.back()}
        right={isSuperAdmin ? (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <Plus size={16} color="#1D4ED8" strokeWidth={2.5} />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>{items.length} banks available</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <EmptyState Icon={Banknote} title="No banks found" subtitle="Banks will appear here after seeding." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/admin/bank/${item.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrap}>
                <Building2 size={18} color="#1D4ED8" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bankName}>{item.name}</Text>
                <Text style={styles.bankMeta}>
                  {item.interest_min}%–{item.interest_max}% interest  ·  Up to {formatINR(item.max_funding)}
                </Text>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>{item.type}</Text>
                </View>
              </View>
              <ChevronRight size={16} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Bank Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Bank</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <View style={{ gap: 10 }}>
                <Field label="Bank Name *" placeholder="e.g. State Bank of India" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
                <Field label="Short Name" placeholder="e.g. SBI" value={form.short_name} onChangeText={(v) => setForm((f) => ({ ...f, short_name: v }))} />

                {/* Type selector */}
                <View>
                  <Text style={styles.fieldLabel}>Bank Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                      {BANK_TYPES.map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.typeChip, form.type === t && styles.typeChipSelected]}
                          onPress={() => setForm((f) => ({ ...f, type: t }))}
                        >
                          <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextSelected]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Interest Min %" placeholder="e.g. 8.5" value={form.interest_min} onChangeText={(v) => setForm((f) => ({ ...f, interest_min: v }))} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Interest Max %" placeholder="e.g. 12" value={form.interest_max} onChangeText={(v) => setForm((f) => ({ ...f, interest_max: v }))} keyboardType="numeric" />
                  </View>
                </View>

                <Field label="Max Funding (₹)" placeholder="e.g. 10000000" value={form.max_funding} onChangeText={(v) => setForm((f) => ({ ...f, max_funding: v }))} keyboardType="numeric" />
                <Field label="Processing Fee %" placeholder="e.g. 0.5" value={form.processing_fee_percent} onChangeText={(v) => setForm((f) => ({ ...f, processing_fee_percent: v }))} keyboardType="numeric" />
                <Field label="Description" placeholder="Short description of the bank..." value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} multiline />
                <Field label="Why Choose (recommendation text)" placeholder="Best for MSME businesses..." value={form.why} onChangeText={(v) => setForm((f) => ({ ...f, why: v }))} multiline />
                <Field label="Supports (comma separated)" placeholder="MSME, Mudra, PMEGP" value={form.supports} onChangeText={(v) => setForm((f) => ({ ...f, supports: v }))} />
                <Field label="Industries (comma separated)" placeholder="Manufacturing, Service, Trading" value={form.industries} onChangeText={(v) => setForm((f) => ({ ...f, industries: v }))} />
                <Field label="States (comma separated)" placeholder="All India" value={form.states} onChangeText={(v) => setForm((f) => ({ ...f, states: v }))} />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.saveBtnText}>Create Bank</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string; [key: string]: any }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, props.multiline && { minHeight: 72, textAlignVertical: "top" }]}
        placeholderTextColor={colors.textPlaceholder}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar: { paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "#FFF" },
  statsText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#DBEAFE", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  createBtnText: { fontSize: 12, fontFamily: fonts.bold, color: "#1D4ED8" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: radius.xl, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  bankName: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text, marginBottom: 3 },
  bankMeta: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 6 },
  typePill: { alignSelf: "flex-start", backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  typePillText: { fontSize: 10, fontFamily: fonts.bold, color: "#1D4ED8" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 36, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  fieldLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: fonts.regular, color: colors.text, backgroundColor: "#FFF" },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface2 },
  typeChipSelected: { borderColor: "#1D4ED8", backgroundColor: "#DBEAFE" },
  typeChipText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  typeChipTextSelected: { color: "#1D4ED8", fontFamily: fonts.bold },
  saveBtn: { backgroundColor: "#1D4ED8", borderRadius: radius.xl, paddingVertical: 13, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },
});
