import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeIn, SlideInUp } from "react-native-reanimated";
import { CheckCircle2, Calendar, Clock, Phone, ChevronRight } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost } from "@/src/api";
import { CONSULT_TYPES, TIME_SLOTS } from "@/src/constants";
import { BackBar } from "@/src/components/StepBar";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function nextDates(n: number) {
  const out: { iso: string; label: string; day: string; month: string; isWeekend: boolean }[] = [];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: d.getDate().toString().padStart(2, "0"),
      day: DAYS[d.getDay()],
      month: MONTHS[d.getMonth()],
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }
  return out;
}

// Confirmation screen with animation
function ConfirmationView({ done, onBack }: { done: any; onBack: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="booking-confirmed">
      <BackBar title="Booking Confirmed" onBack={onBack} />
      <View style={confirmStyles.wrap}>
        <Animated.View entering={FadeIn.duration(400)} style={confirmStyles.checkCircle}>
          <CheckCircle2 size={52} color="#FFF" strokeWidth={1.5} />
        </Animated.View>

        <Animated.View entering={SlideInUp.delay(200).duration(400)} style={{ alignItems: "center" }}>
          <Text style={confirmStyles.title}>Consultation Booked!</Text>
          <Text style={confirmStyles.subtitle}>
            Our expert advisor will call you at the scheduled time.
          </Text>
        </Animated.View>

        <Animated.View entering={SlideInUp.delay(350).duration(400)} style={confirmStyles.detailCard}>
          <View style={confirmStyles.detailRow}>
            <View style={confirmStyles.detailIcon}>
              <Phone size={15} color={colors.primaryDark} strokeWidth={2} />
            </View>
            <View>
              <Text style={confirmStyles.detailLabel}>Consultation Type</Text>
              <Text style={confirmStyles.detailValue}>{done.consultation_type}</Text>
            </View>
          </View>
          <View style={confirmStyles.divider} />
          <View style={confirmStyles.detailRow}>
            <View style={confirmStyles.detailIcon}>
              <Calendar size={15} color={colors.primaryDark} strokeWidth={2} />
            </View>
            <View>
              <Text style={confirmStyles.detailLabel}>Date</Text>
              <Text style={confirmStyles.detailValue}>{done.date}</Text>
            </View>
          </View>
          <View style={confirmStyles.divider} />
          <View style={confirmStyles.detailRow}>
            <View style={confirmStyles.detailIcon}>
              <Clock size={15} color={colors.primaryDark} strokeWidth={2} />
            </View>
            <View>
              <Text style={confirmStyles.detailLabel}>Time</Text>
              <Text style={confirmStyles.detailValue}>{done.time_slot}</Text>
            </View>
          </View>
        </Animated.View>

        <TouchableOpacity
          testID="back-to-home"
          style={confirmStyles.cta}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Text style={confirmStyles.ctaText}>Back to Dashboard</Text>
          <ChevronRight size={18} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const confirmStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", padding: spacing.lg, paddingTop: 40 },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  detailCard: {
    width: "100%",
    backgroundColor: colors.surface2,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: colors.border },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 15,
    width: "100%",
  },
  ctaText: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
});

export default function Booking() {
  const router = useRouter();
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [done, setDone] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const dates = nextDates(10);

  const onConfirm = async () => {
    if (!type || !date || !slot) return;
    setLoading(true);
    try {
      const r = await apiPost("/consultations", { consultation_type: type, date, time_slot: slot, notes: "" });
      setDone(r);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return <ConfirmationView done={done} onBack={() => router.replace("/(tabs)")} />;
  }

  const canBook = type && date && slot;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="booking-screen">
      <BackBar title="Book Consultation" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Book a 30-min advisor call</Text>
        <Text style={styles.subheading}>Get personalised guidance on funding, schemes & subsidies.</Text>

        {/* Consultation type */}
        <Text style={styles.fieldLabel}>Consultation Type</Text>
        <View style={styles.typeGrid}>
          {CONSULT_TYPES.map((c) => (
            <TouchableOpacity
              key={c}
              testID={`type-${c}`}
              style={[styles.typeCard, type === c && styles.typeCardActive]}
              onPress={() => setType(c)}
              activeOpacity={0.85}
            >
              {type === c && (
                <View style={styles.typeCheck}>
                  <CheckCircle2 size={14} color={colors.primaryDark} strokeWidth={2.5} />
                </View>
              )}
              <Text style={[styles.typeText, type === c && styles.typeTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date picker */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Select Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          {dates.map((d) => {
            const active = date === d.iso;
            return (
              <TouchableOpacity
                key={d.iso}
                testID={`date-${d.iso}`}
                style={[styles.dateCard, active && styles.dateCardActive, d.isWeekend && !active && styles.dateCardWeekend]}
                onPress={() => setDate(d.iso)}
                activeOpacity={0.85}
              >
                <Text style={[styles.dateDay, active && styles.dateActiveText]}>{d.day}</Text>
                <Text style={[styles.dateNum, active && styles.dateActiveText]}>{d.label}</Text>
                <Text style={[styles.dateMon, active && styles.dateActiveText]}>{d.month}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time slot */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Select Time Slot</Text>
        <View style={styles.slotGrid}>
          {TIME_SLOTS.map((s) => (
            <TouchableOpacity
              key={s}
              testID={`slot-${s}`}
              style={[styles.slot, slot === s && styles.slotActive]}
              onPress={() => setSlot(s)}
              activeOpacity={0.85}
            >
              <Text style={[styles.slotText, slot === s && styles.slotTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        {canBook && (
          <Text style={styles.footerMeta}>
            {type} on {date} at {slot}
          </Text>
        )}
        <TouchableOpacity
          testID="confirm-booking"
          disabled={!canBook || loading}
          style={[styles.cta, !canBook && styles.ctaDisabled]}
          onPress={onConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{loading ? "Booking…" : "Confirm Booking"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Type selection
  typeGrid: {
    gap: 8,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  typeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  typeCheck: {
    // hidden until active
  },
  typeText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
    flex: 1,
  },
  typeTextActive: {
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },

  // Date cards
  dateCard: {
    width: 58,
    height: 76,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    backgroundColor: "#FFF",
  },
  dateCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  dateCardWeekend: {
    backgroundColor: colors.surface2,
  },
  dateDay: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  dateNum: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  dateMon: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  dateActiveText: {
    color: "#FFF",
  },

  // Time slots
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slot: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  slotActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  slotText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  slotTextActive: {
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },

  // Footer
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm2,
    paddingBottom: Platform.OS === "ios" ? 32 : spacing.md,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  footerMeta: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
    textAlign: "center",
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaDisabled: {
    backgroundColor: "#A7F3D0",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: fonts.displayBold,
    color: "#FFF",
  },
});
