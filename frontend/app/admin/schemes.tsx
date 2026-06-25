import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Modal, ScrollView, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckCircle2, XCircle, Landmark, Plus, X } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import EmptyState from "@/src/components/EmptyState";

const DOCUMENT_OPTIONS = [
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

const STATE_OPTIONS = [
  "All India",
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi (NCT)", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman & Nicobar Islands", "Dadra & Nagar Haveli", "Lakshadweep",
];

const EMPTY_FORM = {
  name: "", full_name: "", description: "",
  max_funding: "", max_subsidy_percent: "", process: "",
  eligibility: "", benefits: "", categories: "",
  documents: [] as string[],
  states: ["All India"] as string[],
};

export default function AdminSchemes() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    try {
      const [schemes, me] = await Promise.all([
        apiGet<any[]>("/admin/schemes"),
        apiGet<any>("/auth/me"),
      ]);
      setItems(schemes);
      setRole(me?.role ?? "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (s: any) => {
    setToggling(s.id);
    try {
      if (s.disabled) await apiPost(`/admin/schemes/${s.id}/enable`);
      else await apiPost(`/admin/schemes/${s.id}/disable`);
      await load();
    } finally {
      setToggling(null);
    }
  };

  const toggleDoc = (val: string) =>
    setForm((f) => ({
      ...f,
      documents: f.documents.includes(val)
        ? f.documents.filter((d) => d !== val)
        : [...f.documents, val],
    }));

  const toggleState = (val: string) => {
    setForm((f) => {
      if (val === "All India") {
        return { ...f, states: f.states.includes("All India") ? [] : ["All India"] };
      }
      const without = f.states.filter((s) => s !== "All India" && s !== val);
      const next = f.states.includes(val) ? without : [...without, val];
      return { ...f, states: next };
    });
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.description.trim()) {
      Alert.alert("Required", "Name and description are required.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/admin/schemes", {
        name: form.name.trim(),
        full_name: form.full_name.trim(),
        description: form.description.trim(),
        max_funding: parseInt(form.max_funding) || 0,
        max_subsidy_percent: parseInt(form.max_subsidy_percent) || 0,
        process: form.process.trim(),
        eligibility: form.eligibility.split("\n").map((s) => s.trim()).filter(Boolean),
        benefits: form.benefits.split("\n").map((s) => s.trim()).filter(Boolean),
        documents: form.documents,
        categories: form.categories.split(",").map((s) => s.trim()).filter(Boolean),
        states: form.states,
      });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not create scheme.");
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = role === "super_admin";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-schemes">
      <BackBar
        title="Schemes"
        onBack={() => router.back()}
        right={isSuperAdmin ? (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <Plus size={16} color={colors.primaryDark} strokeWidth={2.5} />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {items.filter((s) => !s.disabled).length} active  ·  {items.filter((s) => s.disabled).length} disabled
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <EmptyState Icon={Landmark} title="No schemes found" subtitle="Schemes will appear here after seeding." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, item.disabled && styles.cardDisabled]}
              testID={`admin-scheme-${item.id}`}
              onPress={() => router.push(`/admin/scheme/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.schemeIcon, item.disabled && styles.schemeIconDisabled]}>
                  <Landmark size={16} color={item.disabled ? colors.textDim : colors.primaryDark} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.schemeName, item.disabled && styles.schemeNameDisabled]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.schemeMeta} numberOfLines={2}>{item.description}</Text>
                  <View style={styles.schemeStats}>
                    <Text style={styles.schemeAmt}>Up to {formatINR(item.max_funding)}</Text>
                    {item.max_subsidy_percent > 0 && (
                      <Text style={styles.schemeSub}>{item.max_subsidy_percent}% subsidy</Text>
                    )}
                  </View>
                </View>
              </View>
              <TouchableOpacity
                testID={`toggle-${item.id}`}
                style={[styles.toggleBtn, item.disabled ? styles.toggleBtnOff : styles.toggleBtnOn]}
                onPress={() => toggle(item)}
                disabled={toggling === item.id}
                activeOpacity={0.8}
              >
                {item.disabled
                  ? <XCircle size={13} color={colors.danger} strokeWidth={2} />
                  : <CheckCircle2 size={13} color={colors.primaryDark} strokeWidth={2} />}
                <Text style={[styles.toggleText, item.disabled ? styles.toggleTextOff : styles.toggleTextOn]}>
                  {toggling === item.id ? "…" : item.disabled ? "Off" : "On"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Scheme Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Scheme</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <X size={20} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              <View style={{ gap: 10 }}>
                <Field label="Scheme Name *" placeholder="e.g. PMEGP" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
                <Field label="Full Name" placeholder="e.g. Prime Minister's Employment Generation..." value={form.full_name} onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))} />
                <Field label="Description *" placeholder="Short description of the scheme..." value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} multiline />
                <Field label="Max Funding (₹)" placeholder="e.g. 2500000" value={form.max_funding} onChangeText={(v) => setForm((f) => ({ ...f, max_funding: v }))} keyboardType="numeric" />
                <Field label="Max Subsidy %" placeholder="e.g. 35" value={form.max_subsidy_percent} onChangeText={(v) => setForm((f) => ({ ...f, max_subsidy_percent: v }))} keyboardType="numeric" />
                <Field label="Eligibility (one per line)" placeholder={"Must be an Indian citizen\nAge 18-45..."} value={form.eligibility} onChangeText={(v) => setForm((f) => ({ ...f, eligibility: v }))} multiline />
                <Field label="Benefits (one per line)" placeholder={"Up to 35% subsidy\nCollateral free..."} value={form.benefits} onChangeText={(v) => setForm((f) => ({ ...f, benefits: v }))} multiline />

                {/* Documents Required — multi-select chips */}
                <MultiSelect
                  label="Documents Required"
                  options={DOCUMENT_OPTIONS}
                  selected={form.documents}
                  onToggle={toggleDoc}
                />

                <Field label="Process" placeholder="Application process description..." value={form.process} onChangeText={(v) => setForm((f) => ({ ...f, process: v }))} multiline />
                <Field label="Categories (comma separated)" placeholder="MSME, Manufacturing, Startup" value={form.categories} onChangeText={(v) => setForm((f) => ({ ...f, categories: v }))} />

                {/* States — multi-select chips */}
                <MultiSelect
                  label="States"
                  options={STATE_OPTIONS}
                  selected={form.states}
                  onToggle={toggleState}
                />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.saveBtnText}>Create Scheme</Text>}
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

function MultiSelect({ label, options, selected, onToggle }: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>
        {label}
        {selected.length > 0 && (
          <Text style={{ color: colors.primaryDark, fontFamily: fonts.bold }}> · {selected.length} selected</Text>
        )}
      </Text>
      <View style={styles.chipGrid}>
        {options.map((opt) => {
          const isSel = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, isSel && styles.chipSelected]}
              onPress={() => onToggle(opt)}
              activeOpacity={0.7}
            >
              {isSel && <CheckCircle2 size={11} color={colors.primaryDark} strokeWidth={2.5} />}
              <Text style={[styles.chipText, isSel && styles.chipTextSelected]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar: { paddingHorizontal: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "#FFF" },
  statsText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  createBtnText: { fontSize: 12, fontFamily: fonts.bold, color: colors.primaryDark },
  card: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF", borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  cardDisabled: { opacity: 0.6, backgroundColor: colors.surface2 },
  cardLeft: { flex: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  schemeIcon: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  schemeIconDisabled: { backgroundColor: colors.surfaceAlt },
  schemeName: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.text, marginBottom: 3 },
  schemeNameDisabled: { color: colors.textMuted },
  schemeMeta: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, lineHeight: 17, marginBottom: 6 },
  schemeStats: { flexDirection: "row", gap: 8 },
  schemeAmt: { fontSize: 11, fontFamily: fonts.bold, color: colors.primaryDark },
  schemeSub: { fontSize: 11, fontFamily: fonts.medium, color: colors.textMuted },
  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1 },
  toggleBtnOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  toggleBtnOff: { borderColor: colors.danger, backgroundColor: "#FEE2E2" },
  toggleText: { fontSize: 12, fontFamily: fonts.bold },
  toggleTextOn: { color: colors.primaryDark },
  toggleTextOff: { color: colors.danger },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 36, gap: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 17, fontFamily: fonts.displayBold, color: colors.text },
  fieldLabel: { fontSize: 11, fontFamily: fonts.bold, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: fonts.regular, color: colors.text, backgroundColor: "#FFF" },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.xl, paddingVertical: 13, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontFamily: fonts.displayBold, color: "#FFF" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.pill, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface2,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 12, fontFamily: fonts.medium, color: colors.textMuted },
  chipTextSelected: { color: colors.primaryDark, fontFamily: fonts.bold },
});
