import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bell, Target, Building2, Zap, Info, CheckCheck } from "lucide-react-native";

import { colors, spacing, radius, fonts } from "@/src/theme";
import { apiGet, apiPost } from "@/src/api";
import { BackBar } from "@/src/components/StepBar";
import EmptyState from "@/src/components/EmptyState";

function notifIcon(type: string) {
  const cfg: Record<string, { icon: any; bg: string; color: string }> = {
    high_match: { icon: Target, bg: colors.primarySoft, color: colors.primaryDark },
    state_scheme: { icon: Building2, bg: "#DBEAFE", color: "#1D4ED8" },
    readiness: { icon: Zap, bg: "#FEF3C7", color: "#92400E" },
    consultation_reminder: { icon: Bell, bg: "#EDE9FE", color: "#5B21B6" },
    platform: { icon: Info, bg: colors.surfaceAlt, color: colors.textMuted },
    reminder: { icon: Bell, bg: "#EDE9FE", color: "#5B21B6" },
  };
  return cfg[type] ?? { icon: Info, bg: colors.surfaceAlt, color: colors.textMuted };
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<any[]>("/notifications/me")
      .then((x) => { setItems(x); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await apiPost(`/notifications/${id}/read`).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    await Promise.all(unread.map((n) => apiPost(`/notifications/${n.id}/read`).catch(() => {})));
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top", "bottom"]} testID="notifications-screen">
      <BackBar title="Notifications" onBack={() => router.back()} />

      {unreadCount > 0 && (
        <View style={styles.subheader}>
          <Text style={styles.subheaderText}>{unreadCount} unread</Text>
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <CheckCheck size={13} color={colors.primaryDark} strokeWidth={2} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <EmptyState
          Icon={Bell}
          title="No notifications yet"
          subtitle="We'll notify you about scheme matches, readiness tips, and consultation reminders."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const { icon: IconComponent, bg, color } = notifIcon(item.type);
            return (
              <TouchableOpacity
                testID={`notif-${item.id}`}
                style={[styles.card, !item.read && styles.cardUnread]}
                onPress={() => markRead(item.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                  <IconComponent size={16} color={color} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.body} numberOfLines={3}>{item.body}</Text>
                  <Text style={styles.ts}>{formatTs(item.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  subheader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFF",
  },
  subheaderText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  markAllText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnread: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMid,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
    lineHeight: 19,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  body: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 6,
  },
  ts: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.textDim,
  },
});
