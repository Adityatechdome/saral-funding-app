import { View, Text, StyleSheet } from "react-native";
import Animated, { useSharedValue, withSpring, useAnimatedStyle, withRepeat, withSequence } from "react-native-reanimated";
import { useEffect } from "react";

import { colors, fonts, radius } from "@/src/theme";
import HappyExpression from "./expressions/happy";
import ThinkingExpression from "./expressions/thinking";
import ExplainingExpression from "./expressions/explaining";
import CelebratingExpression from "./expressions/celebrating";
import ReviewingDocumentsExpression from "./expressions/reviewing_documents";

export type SaathiExpression = "happy" | "thinking" | "explaining" | "celebrating" | "reviewing_documents";

const EXPRESSIONS: Record<SaathiExpression, React.ComponentType<{ size?: number }>> = {
  happy: HappyExpression,
  thinking: ThinkingExpression,
  explaining: ExplainingExpression,
  celebrating: CelebratingExpression,
  reviewing_documents: ReviewingDocumentsExpression,
};

const BUBBLE_COLORS: Record<SaathiExpression, string> = {
  happy: "#DCFCE7",
  thinking: "#EDE9FE",
  explaining: "#DBEAFE",
  celebrating: "#FEF9C3",
  reviewing_documents: "#F3F4F6",
};

const BUBBLE_BORDER: Record<SaathiExpression, string> = {
  happy: "#BBF7D0",
  thinking: "#C4B5FD",
  explaining: "#BFDBFE",
  celebrating: "#FDE68A",
  reviewing_documents: "#E5E7EB",
};

interface SaathiProps {
  expression?: SaathiExpression;
  message?: string;
  size?: number;
  animate?: boolean;
}

export default function Saathi({
  expression = "happy",
  message,
  size = 120,
  animate = true,
}: SaathiProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    if (expression === "thinking") {
      translateY.value = withRepeat(
        withSequence(
          withSpring(-4, { duration: 800 }),
          withSpring(0, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else if (expression === "celebrating") {
      scale.value = withRepeat(
        withSequence(
          withSpring(1.08, { duration: 300 }),
          withSpring(1.0, { duration: 300 }),
        ),
        3,
        true,
      );
    } else {
      translateY.value = withRepeat(
        withSequence(
          withSpring(-3, { duration: 1200 }),
          withSpring(0, { duration: 1200 }),
        ),
        -1,
        true,
      );
    }
  }, [expression, animate]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const ExpressionComponent = EXPRESSIONS[expression];

  return (
    <View style={styles.wrapper}>
      <Animated.View style={animStyle}>
        <ExpressionComponent size={size} />
      </Animated.View>
      {message && (
        <View style={[
          styles.bubble,
          { backgroundColor: BUBBLE_COLORS[expression], borderColor: BUBBLE_BORDER[expression] },
        ]}>
          <View style={[styles.bubbleTail, { borderBottomColor: BUBBLE_COLORS[expression] }]} />
          <Text style={styles.bubbleText}>{message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 0,
  },
  bubble: {
    marginTop: 6,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: 260,
    position: "relative",
  },
  bubbleTail: {
    position: "absolute",
    top: -8,
    left: "50%",
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  bubbleText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: colors.text,
    textAlign: "center",
    lineHeight: 18,
  },
});
