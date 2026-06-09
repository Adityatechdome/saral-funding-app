import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckCircle2, Circle, Building2, Sprout } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost } from "@/src/api";
import { INDUSTRIES } from "@/src/constants";
import Picker from "@/src/components/Picker";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import StepBar, { BackBar } from "@/src/components/StepBar";

function ToggleCard({
  label,
  sublabel,
  value,
  onChange,
  testID,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.toggleCard, value && styles.toggleCardOn]}
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
    >
      <View style={styles.toggleLeft}>
        <View style={[styles.toggleIcon, value && styles.toggleIconOn]}>
          {value
            ? <CheckCircle2 size={16} color={colors.primaryDark} strokeWidth={2.5} />
            : <Circle size={16} color={colors.textDim} strokeWidth={2} />
          }
        </View>
        <View>
          <Text style={[styles.toggleLabel, value && styles.toggleLabelOn]}>{label}</Text>
          {sublabel && <Text style={styles.toggleSub}>{sublabel}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function BusinessScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<"existing" | "new">("new");
  const [industry, setIndustry] = useState("");
  const [funding, setFunding] = useState("");
  const [turnover, setTurnover] = useState("");
  const [employees, setEmployees] = useState("");
  const [gst, setGst] = useState(false);
  const [udyam, setUdyam] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = industry && funding;

  const fundingLakh = funding
    ? `≈ ₹${(Number(funding) / 100000).toFixed(1)} Lakhs`
    : "";

  const onSave = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await apiPost("/business-profile", {
        business_stage: stage,
        industry,
        funding_required: Number(funding || 0),
        annual_turnover: Number(turnover || 0),
        employees: Number(employees || 0),
        gst_available: gst,
        udyam_available: udyam,
      });
      router.replace("/onboarding/assessment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="business-onboarding">
      <BackBar title="Business Profile" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepBar step={2} total={3} labels={["Your Profile", "Business Details", "Quick Assessment"]} />

          <Text style={styles.heading}>About your business</Text>
          <Text style={styles.subheading}>
            This helps us find subsidies, loans, and sector-specific schemes for you.
          </Text>

          {/* Business Stage */}
          <Text style={styles.fieldLabel}>Business Stage</Text>
          <View style={styles.segmentRow}>
            {(["new", "existing"] as const).map((s) => {
              const active = stage === s;
              const Icon = s === "new" ? Sprout : Building2;
              return (
                <TouchableOpacity
                  key={s}
                  testID={`stage-${s}`}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => setStage(s)}
                  activeOpacity={0.8}
                >
                  <Icon size={18} color={active ? colors.primaryDark : colors.textDim} strokeWidth={2} />
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {s === "new" ? "New Business" : "Existing Business"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Picker label="Industry / Sector" testID="industry" value={industry} options={INDUSTRIES} onChange={setIndustry} />

          <Input
            testID="funding"
            label="Funding Required (₹)"
            value={funding}
            onChangeText={(v) => setFunding(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder="e.g. 1500000"
            hint={fundingLakh}
            helper="Enter the total amount you need"
          />

          <Input
            testID="turnover"
            label="Annual Turnover (₹)"
            value={turnover}
            onChangeText={(v) => setTurnover(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder="0 if not yet started"
          />

          <Input
            testID="employees"
            label="Number of Employees"
            value={employees}
            onChangeText={(v) => setEmployees(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder="e.g. 5"
            helper="Including yourself"
          />

          {/* Registration status */}
          <Text style={styles.fieldLabel}>Registration Status</Text>
          <View style={styles.toggleGrid}>
            <ToggleCard
              testID="gst"
              label="GST Registered"
              sublabel="GSTIN available"
              value={gst}
              onChange={setGst}
            />
            <ToggleCard
              testID="udyam"
              label="Udyam Registered"
              sublabel="MSME certificate"
              value={udyam}
              onChange={setUdyam}
            />
          </View>
          <Text style={styles.hintNote}>
            Registered businesses get access to more schemes and higher subsidy amounts.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            testID="business-save"
            label={loading ? "Saving…" : "Save & Continue"}
            onPress={onSave}
            disabled={!valid}
            loading={loading}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  heading: {
    fontSize: 24,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginTop: 4,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  segmentActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  segmentTextActive: {
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  toggleGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  toggleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 14,
    backgroundColor: colors.surface2,
  },
  toggleCardOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  toggleIcon: {
    marginTop: 1,
  },
  toggleIconOn: {},
  toggleLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 18,
  },
  toggleLabelOn: {
    color: colors.primaryDark,
  },
  toggleSub: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textDim,
    marginTop: 2,
  },
  hintNote: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: Platform.OS === "ios" ? 28 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#FFF",
  },
});
