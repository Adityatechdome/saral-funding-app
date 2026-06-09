import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

export default function ExplainingExpression({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Body */}
      <Ellipse cx="60" cy="88" rx="28" ry="20" fill="#DBEAFE" />
      {/* Head */}
      <Circle cx="60" cy="54" r="30" fill="#FEF9C3" />
      {/* Face highlight */}
      <Ellipse cx="52" cy="46" rx="7" ry="9" fill="#FEF3C7" opacity="0.6" />
      {/* Eyes — engaged / open */}
      <Ellipse cx="51" cy="53" rx="4.5" ry="5" fill="#374151" />
      <Ellipse cx="69" cy="53" rx="4.5" ry="5" fill="#374151" />
      <Circle cx="52.5" cy="51.5" r="1.5" fill="#FFF" />
      <Circle cx="70.5" cy="51.5" r="1.5" fill="#FFF" />
      {/* Friendly eyebrows */}
      <Path d="M45 45 Q51 42 57 45" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M63 45 Q69 42 75 45" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Open talking mouth */}
      <Ellipse cx="60" cy="65" rx="8" ry="5" fill="#374151" />
      <Ellipse cx="60" cy="66" rx="6" ry="3" fill="#F87171" />
      {/* Pointing arm */}
      <Path d="M32 68 Q24 58 30 48" stroke="#FEF9C3" strokeWidth="7" fill="none" strokeLinecap="round" />
      <Path d="M30 48 L22 42" stroke="#FEF9C3" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Clipboard / document held */}
      <Rect x="84" y="54" width="22" height="28" rx="3" fill="#FFF" stroke="#93C5FD" strokeWidth="1.5" />
      <Path d="M88 62 L102 62" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M88 67 L102 67" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M88 72 L98 72" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
      {/* Other arm holding clipboard */}
      <Path d="M88 70 Q90 62 86 56" stroke="#FEF9C3" strokeWidth="7" fill="none" strokeLinecap="round" />
    </Svg>
  );
}
