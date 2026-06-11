import { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  Easing,
} from "react-native-reanimated";

import { colors, radius } from "@/src/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = "100%", height = 16, borderRadius = radius.md, style }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.surfaceAlt },
        animStyle,
        style,
      ]}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <View style={skStyles.wrap}>
      {/* Hero card skeleton */}
      <View style={skStyles.heroCard}>
        <SkeletonBox width={120} height={13} borderRadius={6} style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
        <SkeletonBox width={80} height={52} borderRadius={8} style={{ marginTop: 12, backgroundColor: "rgba(255,255,255,0.3)" }} />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <SkeletonBox width="45%" height={56} borderRadius={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
          <SkeletonBox width="45%" height={56} borderRadius={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
        </View>
      </View>

      {/* Card skeletons */}
      {[0, 1, 2].map((i) => (
        <View key={i} style={skStyles.card}>
          <SkeletonBox width={160} height={13} />
          <SkeletonBox width="90%" height={11} style={{ marginTop: 8 }} />
          <SkeletonBox width="70%" height={11} style={{ marginTop: 6 }} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <SkeletonBox width={80} height={11} />
            <SkeletonBox width={60} height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function SchemesSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={skStyles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <SkeletonBox width="60%" height={14} />
            <SkeletonBox width={60} height={22} borderRadius={6} />
          </View>
          <SkeletonBox width="95%" height={11} style={{ marginTop: 10 }} />
          <SkeletonBox width="80%" height={11} style={{ marginTop: 6 }} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <SkeletonBox width={80} height={11} />
            <SkeletonBox width={60} height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function FundingCaseSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      <SkeletonBox width={180} height={22} borderRadius={8} style={{ marginBottom: 4 }} />
      <SkeletonBox width={140} height={13} borderRadius={6} style={{ marginBottom: 16 }} />
      <View style={skStyles.heroCard}>
        <SkeletonBox width="45%" height={52} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <SkeletonBox width="45%" height={40} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
          <SkeletonBox width="45%" height={40} borderRadius={8} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
        </View>
      </View>
      {[0, 1, 2].map((i) => (
        <View key={i} style={skStyles.card}>
          <SkeletonBox width={140} height={14} />
          <SkeletonBox width="85%" height={11} style={{ marginTop: 8 }} />
          <SkeletonBox width="65%" height={11} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  );
}

export function BankSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[skStyles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
          <SkeletonBox width={40} height={40} borderRadius={12} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width="60%" height={14} />
            <SkeletonBox width="80%" height={11} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  wrap: { padding: 16 },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    minHeight: 160,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
});
