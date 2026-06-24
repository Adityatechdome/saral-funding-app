import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, X, Landmark, ChevronLeft } from "lucide-react-native";

import { colors, spacing, radius, fonts, formatINR } from "@/src/theme";
import { apiGet } from "@/src/api";
import { SCHEME_CATEGORIES } from "@/src/constants";
import { SchemesSkeleton } from "@/src/components/SkeletonLoader";
import EmptyState from "@/src/components/EmptyState";

export default function Schemes() {
  const router = useRouter();
  const [allAssigned, setAllAssigned] = useState<any[]>([]); // full assigned scheme list
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [cat, setCat] = useState("All");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input — 320ms
  const onSearch = useCallback((text: string) => {
    setQ(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(text), 320);
  }, []);

  // Initial load: fetch assigned scheme IDs + all schemes, filter to assigned only
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [myApps, allSchemes] = await Promise.all([
        apiGet<any[]>("/my/scheme-applications").catch(() => []),
        apiGet<any[]>("/schemes"),
      ]);
      const assignedIds = new Set((myApps || []).map((a: any) => a.scheme_id));
      const assigned = assignedIds.size > 0
        ? (allSchemes || []).filter((s: any) => assignedIds.has(s.id))
        : [];
      setAllAssigned(assigned);
      setItems(assigned);
    } finally {
      setLoading(false);
    }
  }, []);

  // Client-side filter when search/category changes
  useEffect(() => {
    let filtered = allAssigned;
    if (cat && cat !== "All") {
      filtered = filtered.filter((s) =>
        (s.categories || []).some((c: string) => c.toLowerCase().includes(cat.toLowerCase()))
      );
    }
    if (debouncedQ) {
      const lq = debouncedQ.toLowerCase();
      filtered = filtered.filter((s) =>
        (s.name || "").toLowerCase().includes(lq) || (s.description || "").toLowerCase().includes(lq)
      );
    }
    setItems(filtered);
  }, [cat, debouncedQ, allAssigned]);

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }} edges={["top"]} testID="schemes-screen">
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>Government Schemes</Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color={colors.textDim} strokeWidth={2} />
            <TextInput
              testID="schemes-search"
              style={styles.searchInput}
              placeholder="Search schemes…"
              placeholderTextColor={colors.textPlaceholder}
              value={q}
              onChangeText={onSearch}
              returnKeyType="search"
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => { onSearch(""); }}>
                <X size={14} color={colors.textDim} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 10, paddingHorizontal: 2 }}
        >
          {SCHEME_CATEGORIES.map((c) => {
            const active = c === cat;
            return (
              <TouchableOpacity
                key={c}
                testID={`chip-${c}`}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCat(c)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <SchemesSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          Icon={Landmark}
          title="No schemes assigned"
          subtitle={debouncedQ || cat !== "All" ? "Try clearing your filters" : "Your advisor will assign schemes after your consultation."}
          ctaLabel={debouncedQ || cat !== "All" ? "Clear filters" : undefined}
          onCta={debouncedQ || cat !== "All" ? () => { onSearch(""); setCat("All"); } : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <SchemeCard item={item} onPress={() => router.push({ pathname: "/scheme/[id]", params: { id: item.id } })} />}
        />
      )}
    </SafeAreaView>
  );
}

function SchemeCard({ item, onPress }: { item: any; onPress: () => void }) {
  const statesLabel = (item.states || []).includes("All India")
    ? "All India"
    : (item.states || [])[0] || "All India";

  return (
    <TouchableOpacity
      testID={`scheme-${item.id}`}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <Text style={styles.schemeName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.statePill}>
          <Text style={styles.statePillText}>{statesLabel}</Text>
        </View>
      </View>

      <Text style={styles.schemeDesc} numberOfLines={2}>{item.description}</Text>

      <View style={styles.cardBottom}>
        <View style={styles.metaRow}>
          <Text style={styles.metaAmt}>Up to {formatINR(item.max_funding)}</Text>
          {item.max_subsidy_percent > 0 && (
            <View style={styles.subsidyPill}>
              <Text style={styles.subsidyText}>{item.max_subsidy_percent}% subsidy</Text>
            </View>
          )}
        </View>
        {(item.categories || []).slice(0, 2).map((c: string) => (
          <View key={c} style={styles.catChip}>
            <Text style={styles.catChipText}>{c}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#FFF",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
  },
  searchRow: {
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.text,
    padding: 0,
  },
  chip: {
    flexShrink: 0,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  chipTextActive: {
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },

  // Scheme card
  card: {
    backgroundColor: "#FFF",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  schemeName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.displayBold,
    color: colors.text,
    lineHeight: 21,
  },
  statePill: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statePillText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  schemeDesc: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 18,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaAmt: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  subsidyPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  subsidyText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.primaryDark,
  },
  catChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  catChipText: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
});
