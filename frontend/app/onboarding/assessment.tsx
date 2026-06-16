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
import { ThumbsUp, ThumbsDown } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost } from "@/src/api";
import { INDUSTRIES, INDIAN_STATES } from "@/src/constants";
import Picker from "@/src/components/Picker";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import StepBar, { BackBar } from "@/src/components/StepBar";

const QUESTIONS = [
  {
    key: "existing",
    label: "Is your business already running?",
    yes: "Existing business",
    no: "Starting new",
  },
  {
    key: "woman",
    label: "Are you a woman entrepreneur?",
    yes: "Yes, I am",
    no: "No",
    hint: "Women entrepreneurs get additional subsidies of 10-15% on most schemes.",
  },
  {
    key: "gst",
    label: "Is your business GST registered?",
    yes: "Yes, registered",
    no: "Not yet",
    hint: "GST registration unlocks ECLGS loans and higher PMEGP subsidies.",
  },
  {
    key: "udyam",
    label: "Do you have Udyam registration?",
    yes: "Yes, registered",
    no: "Not yet",
    hint: "Udyam certificate is required for most MSME-specific government loans.",
  },
  {
    key: "loans",
    label: "Do you have any existing loans?",
    yes: "Yes",
    no: "No existing loans",
  },
];

function YesNoField({
  q,
  value,
  onChange,
  testID,
}: {
  q: (typeof QUESTIONS)[0];
  value: boolean;
  onChange: (v: boolean) => void;
  testID: string;
}) {
  return (
    <View style={styles.questionCard}>
      <Text style={styles.questionText}>{q.label}</Text>
      {q.hint && <Text style={styles.questionHint}>{q.hint}</Text>}
      <View style={styles.yesNoRow}>
        <TouchableOpacity
          testID={`${testID}-yes`}
          style={[styles.yesNoBtn, styles.yesBtn, value === true && styles.yesBtnActive]}
          onPress={() => onChange(true)}
          activeOpacity={0.8}
        >
          <ThumbsUp size={14} color={value === true ? colors.primaryDark : colors.textDim} strokeWidth={2} />
          <Text style={[styles.yesNoText, value === true && styles.yesTextActive]}>{q.yes}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID={`${testID}-no`}
          style={[styles.yesNoBtn, value === false && styles.noBtnActive]}
          onPress={() => onChange(false)}
          activeOpacity={0.8}
        >
          <ThumbsDown size={14} color={value === false ? colors.textMuted : colors.textDim} strokeWidth={2} />
          <Text style={[styles.yesNoText, value === false && styles.noTextActive]}>{q.no}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AssessmentScreen() {
  const router = useRouter();
  const [businessType, setBusinessType] = useState("");
  const [funding, setFunding] = useState("");
  const [location, setLocation] = useState("");
  const [existing, setExisting] = useState(false);
  const [woman, setWoman] = useState(false);
  const [gst, setGst] = useState(false);
  const [udyam, setUdyam] = useState(false);
  const [loans, setLoans] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = businessType && funding && location;

  const values: Record<string, boolean> = { existing, woman, gst, udyam, loans };
  const setters: Record<string, (v: boolean) => void> = {
    existing: setExisting,
    woman: setWoman,
    gst: setGst,
    udyam: setUdyam,
    loans: setLoans,
  };

  const onSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await apiPost("/funding-assessment", {
        business_type: businessType,
        funding_requirement: Number(funding || 0),
        business_location: location,
        existing_business: existing,
        woman_entrepreneur: woman,
        gst_registration: gst,
        udyam_registration: udyam,
        existing_loans: loans,
      });
      router.replace("/documents");
    } finally {
      setLoading(false);
    }
  };

  const fundingLakh = funding
    ? `≈ ₹${(Number(funding) / 100000).toFixed(1)} Lakhs required`
    : "";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="assessment-onboarding">
      <BackBar title="Funding Assessment" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepBar step={3} total={3} labels={["Your Profile", "Business Details", "Quick Assessment"]} />

          <Text style={styles.heading}>Final eligibility check</Text>
          <Text style={styles.subheading}>
            5 quick questions to compute your personalised funding score and match you to schemes worth up to ₹5 crore.
          </Text>

          <Picker
            label="Business Type"
            testID="biz-type"
            value={businessType}
            options={INDUSTRIES}
            onChange={setBusinessType}
          />

          <Input
            testID="fund-req"
            label="Funding Requirement (₹)"
            value={funding}
            onChangeText={(v) => setFunding(v.replace(/\D/g, ""))}
            keyboardType="number-pad"
            placeholder="e.g. 1500000"
            hint={fundingLakh}
          />

          <Picker
            label="Business Location (State)"
            testID="biz-state"
            value={location}
            options={INDIAN_STATES}
            onChange={setLocation}
          />

          <View style={styles.questionsSection}>
            <Text style={styles.sectionLabel}>A few more details</Text>
            {QUESTIONS.map((q) => (
              <YesNoField
                key={q.key}
                q={q}
                value={values[q.key]}
                onChange={setters[q.key]}
                testID={`q-${q.key}`}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            testID="assessment-submit"
            label={loading ? "Computing your score…" : "See My Recommendations →"}
            onPress={onSubmit}
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
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  questionsSection: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  questionCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  questionHint: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textDim,
    lineHeight: 17,
    marginBottom: 10,
  },
  yesNoRow: {
    flexDirection: "row",
    gap: 8,
  },
  yesNoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  yesBtn: {},
  yesBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  noBtnActive: {
    borderColor: colors.borderDark,
    backgroundColor: colors.surfaceAlt,
  },
  yesNoText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  yesTextActive: {
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  noTextActive: {
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: Platform.OS === "ios" ? 28 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#FFF",
  },
});
