import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedProps,
  Easing,
} from "react-native-reanimated";

import { colors, fonts } from "@/src/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 148;
const STROKE_WIDTH = 13;
const R = (RING_SIZE - STROKE_WIDTH) / 2;
const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

function scoreColor(score: number): string {
  if (score >= 70) return "#4ADE80";
  if (score >= 40) return "#FCD34D";
  return "#FCA5A5";
}

interface ReadinessRingProps {
  score: number;
  size?: number;
}

export default function ReadinessRing({ score, size = RING_SIZE }: ReadinessRingProps) {
  const progress = useSharedValue(0);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    });
    // Count up animation using setInterval for the number
    let current = 0;
    const step = Math.ceil(score / 60);
    const timer = setInterval(() => {
      current = Math.min(current + step, score);
      setDisplayScore(current);
      if (current >= score) clearInterval(timer);
    }, 20);
    return () => clearInterval(timer);
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const ringColor = scoreColor(score);
  const scale = size / RING_SIZE;

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size, height: size }}>
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          style={StyleSheet.absoluteFillObject}
        >
          <Defs>
            <LinearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={ringColor} stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
            </LinearGradient>
          </Defs>
          {/* Track */}
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={STROKE_WIDTH}
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        </Svg>
        {/* Center content */}
        <View style={styles.center}>
          <Text style={[styles.score, { fontSize: 38 * scale }]}>{displayScore}</Text>
          <Text style={[styles.outOf, { fontSize: 13 * scale }]}>/100</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    fontSize: 38,
    fontFamily: fonts.displayBold,
    color: "#FFFFFF",
    letterSpacing: -1,
    lineHeight: 44,
  },
  outOf: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: "rgba(255,255,255,0.75)",
    marginTop: -2,
  },
});
