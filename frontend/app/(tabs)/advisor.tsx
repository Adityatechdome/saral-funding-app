import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  useAnimatedStyle,
} from "react-native-reanimated";
import {
  ArrowUp, Trash2, ChevronRight,
  FileText, Route, CheckCircle2, Sparkles, Building2, Landmark,
  MessageSquare, Target,
} from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet, apiPost, apiDelete } from "@/src/api";
import { getLang } from "@/src/i18n";
import { useRouter } from "expo-router";
import Saathi from "@/src/components/Saathi";

type Msg = { role: "user" | "assistant"; content: string; structured?: any; ts?: number; followUps?: string[] };

const SUGGESTIONS = [
  "I need ₹25 lakh for a steel fabrication shop",
  "Best schemes for women entrepreneurs in Gujarat",
  "What loans are available for manufacturing units?",
  "How to get PMEGP subsidy for a new business?",
];

function formatRelativeTime(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Saathi thinking indicator
function TypingIndicator() {
  return (
    <View style={typStyles.wrap}>
      <Saathi expression="thinking" size={56} animate message="Analysing your question…" />
    </View>
  );
}

const typStyles = StyleSheet.create({
  wrap: { alignItems: "flex-start", paddingHorizontal: spacing.md, paddingBottom: 8 },
});

export default function Advisor() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    apiGet<{ messages: Msg[] }>("/advisor/history")
      .then((d) => setMessages((d.messages || []).map((m) => ({ ...m, ts: m.ts || Date.now() }))))
      .catch(() => {});
  }, []);

  // Auto-detect if user wants a full funding strategy
  function isStrategyQuery(msg: string): boolean {
    const lower = msg.toLowerCase();
    return (
      lower.includes("plan") || lower.includes("strategy") || lower.includes("roadmap") ||
      lower.includes("how do i") || lower.includes("step by step") || lower.includes("what should i") ||
      lower.includes("help me get") || lower.includes("full plan") || lower.includes("complete guide")
    );
  }

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    const ts = Date.now();
    setMessages((m) => [...m, { role: "user", content: msg, ts }]);
    setSending(true);
    try {
      if (isStrategyQuery(msg)) {
        const r = await apiPost<any>("/advisor/structured", { query: msg, language: getLang() });
        const followUps = [
          "What documents do I need?",
          "Which bank should I approach first?",
          "How long does approval take?",
        ];
        setMessages((m) => [...m, { role: "assistant", content: r.summary || "", structured: r, ts: Date.now(), followUps }]);
      } else {
        const r = await apiPost<{ reply: string; follow_ups?: string[] }>("/advisor/chat", { message: msg, language: getLang() });
        const followUps = r.follow_ups || deriveFollowUps(msg);
        setMessages((m) => [...m, { role: "assistant", content: r.reply, ts: Date.now(), followUps }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I couldn't process that request. Please try again.", ts: Date.now() },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  function deriveFollowUps(userMsg: string): string[] {
    const lower = userMsg.toLowerCase();
    if (lower.includes("pmegp") || lower.includes("subsidy"))
      return ["How to apply for PMEGP?", "What's the subsidy percentage?", "Eligibility criteria?"];
    if (lower.includes("mudra") || lower.includes("loan"))
      return ["What is the interest rate?", "How long does approval take?", "Do I need collateral?"];
    if (lower.includes("women") || lower.includes("female"))
      return ["Best schemes for women?", "Stand-Up India eligibility?", "Udyam registration needed?"];
    if (lower.includes("gst") || lower.includes("udyam"))
      return ["How to register for GST?", "How to get Udyam certificate?", "Does it affect loan eligibility?"];
    return ["Tell me more", "Which bank should I approach?", "What documents do I need?"];
  }

  const clearChat = async () => {
    await apiDelete("/advisor/history");
    setMessages([]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top"]} testID="advisor-screen">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Sparkles size={18} color={colors.primaryDark} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>AI Funding Advisor</Text>
          <Text style={styles.headerSub}>Ask anything about schemes & banks</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity testID="clear-chat" onPress={clearChat} style={styles.clearBtn}>
            <Trash2 size={15} color={colors.textDim} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.role === "user") {
              return (
                <View style={styles.userMsgWrap}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userBubbleText}>{item.content}</Text>
                  </View>
                  <Text style={styles.timestamp}>{formatRelativeTime(item.ts)}</Text>
                </View>
              );
            }
            if (item.structured) {
              return (
                <View>
                  <StructuredCard data={item.structured} ts={item.ts} router={router} />
                  {(item.followUps || []).length > 0 && (
                    <FollowUpChips chips={item.followUps!} onPress={send} />
                  )}
                </View>
              );
            }
            return (
              <View style={styles.aiBubbleWrap}>
                <View style={styles.aiBubble}>
                  <Text style={styles.aiBubbleText}>{item.content}</Text>
                </View>
                <Text style={styles.timestamp}>{formatRelativeTime(item.ts)}</Text>
                {(item.followUps || []).length > 0 && (
                  <FollowUpChips chips={item.followUps!} onPress={send} />
                )}
                <ActionButtons content={item.content} router={router} />
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ paddingTop: 8, alignItems: "center" }}>
              <Saathi
                expression="explaining"
                size={100}
                message="Hi! I'm Saathi. Ask me anything about funding."
              />
              <Text style={[styles.emptyLabel, { marginTop: 16 }]}>Try asking…</Text>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  testID={`suggestion-${s.slice(0, 10)}`}
                  style={styles.suggestion}
                  onPress={() => send(s)}
                >
                  <ChevronRight size={14} color={colors.primary} strokeWidth={2.5} />
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {sending && <TypingIndicator />}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            testID="advisor-input"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about schemes, subsidies, loans…"
            placeholderTextColor={colors.textPlaceholder}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            testID="advisor-send"
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!input.trim() || sending}
          >
            <ArrowUp size={18} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Follow-up chips ───────────────────────────────────────────────────────
function FollowUpChips({ chips, onPress }: { chips: string[]; onPress: (t: string) => void }) {
  return (
    <View style={fu.wrap}>
      {chips.map((c) => (
        <TouchableOpacity key={c} style={fu.chip} onPress={() => onPress(c)} activeOpacity={0.75}>
          <ChevronRight size={11} color={colors.primaryDark} strokeWidth={2.5} />
          <Text style={fu.chipText}>{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const fu = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, paddingLeft: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primarySoft, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.primaryMid,
  },
  chipText: { fontSize: 11, fontFamily: fonts.semiBold, color: colors.primaryDark },
});

// ── Action buttons (deep-link into app) ───────────────────────────────────
function ActionButtons({ content, router }: { content: string; router: any }) {
  const lower = content.toLowerCase();
  const actions: Array<{ label: string; icon: any; route: string }> = [];
  if (lower.includes("scheme") || lower.includes("pmegp") || lower.includes("mudra") || lower.includes("subsidy")) {
    actions.push({ label: "Browse Schemes", icon: Landmark, route: "/schemes" });
  }
  if (lower.includes("bank") || lower.includes("loan") || lower.includes("hdfc") || lower.includes("sbi")) {
    actions.push({ label: "View Banks", icon: Building2, route: "/banks" });
  }
  if (lower.includes("consult") || lower.includes("advisor") || lower.includes("expert")) {
    actions.push({ label: "Book Consultation", icon: MessageSquare, route: "/booking" });
  }
  if (actions.length === 0) return null;
  return (
    <View style={ab.row}>
      {actions.map((a) => (
        <TouchableOpacity key={a.route} style={ab.btn} onPress={() => router.push(a.route)} activeOpacity={0.8}>
          <a.icon size={12} color={colors.primaryDark} strokeWidth={2} />
          <Text style={ab.btnText}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const ab = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFF", borderRadius: radius.xl,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  btnText: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.primaryDark },
});

// ── Structured Roadmap Card ────────────────────────────────────────────────

function StructSection({ IconComp, title, children }: { IconComp: any; title: string; children: any }) {
  return (
    <View style={sc.section}>
      <View style={sc.sectionHead}>
        <View style={sc.sectionIcon}>
          <IconComp size={13} color={colors.primaryDark} strokeWidth={2} />
        </View>
        <Text style={sc.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StructuredCard({ data, ts, router }: { data: any; ts?: number; router: any }) {
  return (
    <View style={sc.card} testID="structured-response">
      <View style={sc.cardHeader}>
        <View style={sc.cardHeaderIcon}>
          <Target size={14} color={colors.primaryDark} strokeWidth={2} />
        </View>
        <Text style={sc.cardHeaderTitle}>Your Funding Roadmap</Text>
      </View>

      <Text style={sc.summary}>{data.summary}</Text>

      {(data.schemes || []).length > 0 && (
        <StructSection IconComp={Landmark} title="Recommended Schemes">
          {data.schemes.map((s: any, i: number) => (
            <TouchableOpacity
              key={i}
              testID={`struct-scheme-${i}`}
              style={sc.item}
              onPress={() => router.push("/(tabs)/schemes")}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={sc.itemTitle}>{s.name}</Text>
                <Text style={sc.itemBody}>{s.why}</Text>
                {s.estimated_funding > 0 && (
                  <Text style={sc.itemMeta}>
                    Up to {formatINR(s.estimated_funding)}
                    {s.estimated_subsidy > 0 ? `  •  Subsidy ${formatINR(s.estimated_subsidy)}` : ""}
                  </Text>
                )}
              </View>
              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </StructSection>
      )}

      {(data.banks || []).length > 0 && (
        <StructSection IconComp={Building2} title="Recommended Banks">
          {data.banks.map((b: any, i: number) => (
            <TouchableOpacity
              key={i}
              testID={`struct-bank-${i}`}
              style={sc.item}
              onPress={() => router.push("/banks")}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={sc.itemTitle}>{b.name}</Text>
                <Text style={sc.itemBody}>{b.why}</Text>
                <Text style={sc.itemMeta}>{b.interest_range}</Text>
              </View>
              <ChevronRight size={14} color={colors.textDim} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </StructSection>
      )}

      {(data.documents || []).length > 0 && (
        <StructSection IconComp={FileText} title="Documents Needed">
          {data.documents.map((d: string, i: number) => (
            <View key={i} style={sc.bulletRow}>
              <View style={sc.bulletDot} />
              <Text style={sc.bulletText}>{d}</Text>
            </View>
          ))}
        </StructSection>
      )}

      {(data.roadmap || []).length > 0 && (
        <StructSection IconComp={Route} title="Roadmap">
          {data.roadmap.map((d: string, i: number) => (
            <View key={i} style={sc.stepRow}>
              <View style={sc.stepNum}>
                <Text style={sc.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={sc.bulletText}>{d}</Text>
            </View>
          ))}
        </StructSection>
      )}

      {(data.next_steps || []).length > 0 && (
        <StructSection IconComp={CheckCircle2} title="Next Steps">
          {data.next_steps.map((d: string, i: number) => (
            <View key={i} style={sc.bulletRow}>
              <View style={sc.bulletDot} />
              <Text style={sc.bulletText}>{d}</Text>
            </View>
          ))}
        </StructSection>
      )}

      {data.why && (
        <View style={sc.whyBox}>
          <Text style={sc.whyTitle}>Why this plan?</Text>
          <Text style={sc.whyBody}>{data.why}</Text>
        </View>
      )}

      <Text style={sc.cardTs}>{formatRelativeTime(ts)}</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    padding: 14,
    marginVertical: 6,
    maxWidth: "96%",
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cardHeaderIcon: {
    width: 26, height: 26, borderRadius: radius.md,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
  },
  cardHeaderTitle: { fontSize: 15, fontFamily: fonts.displayBold, color: colors.text },
  summary: { fontSize: 13, fontFamily: fonts.regular, color: colors.text, lineHeight: 20, marginBottom: 4 },
  section: { marginTop: 14 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  sectionIcon: {
    width: 24, height: 24, borderRadius: radius.sm,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.text,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  item: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface2, borderRadius: radius.lg,
    padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border,
  },
  itemTitle: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text, lineHeight: 18 },
  itemBody: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 3, lineHeight: 16 },
  itemMeta: { fontSize: 11, fontFamily: fonts.bold, color: colors.primaryDark, marginTop: 4 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.text, lineHeight: 19 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  stepNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center",
  },
  stepNumText: { fontSize: 10, fontFamily: fonts.bold, color: colors.primaryDark },
  whyBox: { marginTop: 14, backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: 12 },
  whyTitle: {
    fontSize: 11, fontFamily: fonts.bold, color: colors.primaryDark,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4,
  },
  whyBody: { fontSize: 13, fontFamily: fonts.regular, color: colors.text, lineHeight: 19 },
  cardTs: { marginTop: 10, fontSize: 10, fontFamily: fonts.medium, color: colors.textDim, textAlign: "right" },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.text },
  headerSub: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 1 },
  clearBtn: {
    width: 34, height: 34, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, alignItems: "center", justifyContent: "center",
  },
  userMsgWrap: { alignItems: "flex-end", marginVertical: 4 },
  userBubble: {
    backgroundColor: colors.primary, borderRadius: radius.xl, borderBottomRightRadius: 6,
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: "82%",
  },
  userBubbleText: { fontSize: 14, fontFamily: fonts.regular, color: "#FFF", lineHeight: 20 },
  aiBubbleWrap: { alignItems: "flex-start", marginVertical: 4, maxWidth: "88%" },
  aiBubble: {
    backgroundColor: colors.surface2, borderRadius: radius.xl, borderBottomLeftRadius: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
  },
  aiBubbleText: { fontSize: 14, fontFamily: fonts.regular, color: colors.text, lineHeight: 20 },
  timestamp: { fontSize: 10, fontFamily: fonts.medium, color: colors.textDim, marginTop: 3, marginHorizontal: 4 },

  emptyLabel: { fontSize: 13, fontFamily: fonts.medium, color: colors.textMuted, marginBottom: 14, lineHeight: 18 },
  suggestion: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface2, borderRadius: radius.xl, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  suggestionText: { flex: 1, fontSize: 13, fontFamily: fonts.regular, color: colors.text, lineHeight: 18 },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    padding: spacing.sm2, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: "#FFF",
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 22,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 14, fontFamily: fonts.regular, color: colors.text,
    maxHeight: 100, minHeight: 44, backgroundColor: colors.surface2,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: colors.primaryLight, opacity: 0.5 },
});
