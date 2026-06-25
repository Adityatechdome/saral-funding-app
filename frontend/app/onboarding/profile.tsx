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
import { User, MapPin, Users } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost } from "@/src/api";
import { INDIAN_STATES, CATEGORIES, GENDERS } from "@/src/constants";
import Picker from "@/src/components/Picker";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";
import StepBar, { BackBar } from "@/src/components/StepBar";

export default function ProfileScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = fullName.trim() && state && district.trim() && gender && age && category;

  const onSave = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      await apiPost("/profile", {
        full_name: fullName.trim(),
        state,
        district: district.trim(),
        gender,
        age: Number(age),
        category,
      });
      router.replace("/onboarding/business");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="profile-onboarding">
      <BackBar title="Personal Profile" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepBar step={1} total={2} labels={["Your Profile", "Business Details"]} />

          <Text style={styles.heading}>Tell us about you</Text>
          <Text style={styles.subheading}>
            This helps us match the right government schemes and subsidies to your profile.
          </Text>

          <Input
            testID="full-name"
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Rajesh Kumar"
            Icon={User}
            autoCapitalize="words"
          />
          <Picker
            label="State"
            testID="state"
            value={state}
            options={INDIAN_STATES}
            onChange={setState}
            placeholder="Select your state"
          />
          <Input
            testID="district"
            label="District"
            value={district}
            onChangeText={setDistrict}
            placeholder="e.g. Surat"
            Icon={MapPin}
          />
          <Picker label="Gender" testID="gender" value={gender} options={GENDERS} onChange={setGender} />
          <Input
            testID="age"
            label="Age"
            value={age}
            onChangeText={(v) => setAge(v.replace(/\D/g, "").slice(0, 2))}
            keyboardType="number-pad"
            placeholder="e.g. 28"
            helper="Must be 18+ to apply for most schemes"
          />
          <Picker
            label="Social Category"
            testID="category"
            value={category}
            options={CATEGORIES}
            onChange={setCategory}
            placeholder="Select category"
          />
          <Text style={styles.privacyNote}>
            Your personal data is encrypted and used only for scheme matching.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            testID="profile-save"
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
  privacyNote: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textDim,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: Platform.OS === "ios" ? 28 : spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: "#FFF",
  },
});
