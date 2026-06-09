import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

export default function HappyExpression({ size = 120 }: { size?: number }) {
  const s = size / 120;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Body */}
      <Ellipse cx="60" cy="88" rx="28" ry="20" fill="#DCFCE7" />
      {/* Head */}
      <Circle cx="60" cy="54" r="30" fill="#FEF9C3" />
      {/* Face highlight */}
      <Ellipse cx="52" cy="46" rx="7" ry="9" fill="#FEF3C7" opacity="0.6" />
      {/* Eyes — happy arcs */}
      <Path d="M48 52 Q51 48 54 52" stroke="#374151" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M66 52 Q69 48 72 52" stroke="#374151" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Big smile */}
      <Path d="M49 62 Q60 72 71 62" stroke="#374151" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Cheeks */}
      <Ellipse cx="46" cy="63" rx="5" ry="3" fill="#FCA5A5" opacity="0.6" />
      <Ellipse cx="74" cy="63" rx="5" ry="3" fill="#FCA5A5" opacity="0.6" />
      {/* Arms up (celebrating gesture) */}
      <Path d="M32 70 Q22 56 26 44" stroke="#FEF9C3" strokeWidth="7" fill="none" strokeLinecap="round" />
      <Path d="M88 70 Q98 56 94 44" stroke="#FEF9C3" strokeWidth="7" fill="none" strokeLinecap="round" />
      {/* Sparkles */}
      <Path d="M18 38 L20 34 L22 38 L26 40 L22 42 L20 46 L18 42 L14 40 Z" fill="#FCD34D" />
      <Path d="M94 28 L95.5 25 L97 28 L100 29.5 L97 31 L95.5 34 L94 31 L91 29.5 Z" fill="#FCD34D" />
    </Svg>
  );
}
