import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Send, CheckCircle2, Info, Star, Bell } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import Input from "@/src/components/ui/Input";
import Button from "@/src/components/ui/Button";

const NOTIFICATION_TYPES = [
  { id: "platform", label: "Platform Update", Icon: Info, color: colors.surfaceAlt, textColor: colors.textMuted },
  { id: "high_match", label: "Scheme Match", Icon: Star, color: colors.primarySoft, textColor: colors.primaryDark },
  { id: "consultation_reminder", label: "Reminder", Icon: Bell, color: "#EDE9FE", textColor: "#5B21B6" },
  { id: "recommendation", label: "Recommendation", Icon: CheckCircle2, color: "#DBEAFE", textColor: "#1D4ED8" },
];

export default function AdminNotifications() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("platform");
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const send = async () => {
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const r = await apiPost<{ sent: number }>("/admin/notifications", { title, body, type });
      setSentCount(r.sent);
      setTitle("");
      setBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface2 }} edges={["top", "bottom"]} testID="admin-notifications">
      <BackBar title="Broadcast Notification" onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success state */}
          {sentCount !== null && (
            <View style={styles.successCard}>
              <CheckCircle2 size={20} color={colors.primaryDark} strokeWidth={2} />
              <View>
                <Text style={styles.successTitle}>Notification Sent</Text>
                <Text style={styles.successSub}>Delivered to {sentCount} users</Text>
              </View>
            </View>
          )}

          {/* Type selector */}
          <Text style={styles.fieldLabel}>Notification Type</Text>
          <View style={styles.typeGrid}>
            {NOTIFICATION_TYPES.map((t) => {
              const active = type === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  testID={`type-${t.id}`}
                  style={[styles.typeCard, active && { backgroundColor: t.color, borderColor: t.textColor }]}
                  onPress={() => setType(t.id)}
                  activeOpacity={0.8}
                >
                  <t.Icon size={16} color={active ? t.textColor : colors.textDim} strokeWidth={2} />
                  <Text style={[styles.typeLabel, active && { color: t.textColor, fontFamily: fonts.semiBold }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fields */}
          <Input
            testID="notif-title"
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. New Gujarat MSME scheme available"
            maxLength={80}
            showCount
          />

          <Input
            testID="notif-body"
            label="Message Body"
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="Tell users what's new or important…"
            maxLength={300}
            showCount
          />

          {/* Preview */}
          {(title || body) && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.preview}>
                <View style={styles.previewIcon}>
                  {(() => {
                    const t = NOTIFICATION_TYPES.find((t) => t.id === type);
                    if (!t) return null;
                    return <t.Icon size={14} color={t.textColor} strokeWidth={2} />;
                  })()}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle} numberOfLines={1}>{title || "Notification title"}</Text>
                  <Text style={styles.previewBody} numberOfLines={2}>{body || "Notification message"}</Text>
                </View>
              </View>
            </View>
          )}

          <Button
            testID="send-notif"
            label={sending ? "Sending…" : "Broadcast to All Users"}
            onPress={send}
            disabled={!title.trim() || !body.trim()}
            loading={sending}
            size="lg"
            Icon={Send}
            iconPosition="right"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    padding: spacing.md,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 14,
    fontFamily: fonts.displayBold,
    color: colors.primaryDark,
  },
  successSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.primaryDark,
    opacity: 0.8,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.md,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: "#FFF",
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  previewCard: {
    marginBottom: spacing.md,
  },
  previewLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  preview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 19,
  },
  previewBody: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
});
