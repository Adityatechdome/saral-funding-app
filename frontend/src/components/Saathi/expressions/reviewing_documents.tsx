import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";

export default function ReviewingDocumentsExpression({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Body */}
      <Ellipse cx="60" cy="88" rx="28" ry="20" fill="#F3F4F6" />
      {/* Head */}
      <Circle cx="60" cy="54" r="30" fill="#FEF9C3" />
      {/* Face highlight */}
      <Ellipse cx="52" cy="46" rx="7" ry="9" fill="#FEF3C7" opacity="0.6" />
      {/* Glasses */}
      <Rect x="42" y="49" width="14" height="11" rx="5" fill="none" stroke="#374151" strokeWidth="2" />
      <Rect x="64" y="49" width="14" height="11" rx="5" fill="none" stroke="#374151" strokeWidth="2" />
      <Path d="M56 54 L64 54" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
      <Path d="M42 54 L36 54" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
      <Path d="M78 54 L84 54" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
      {/* Eyes inside glasses — focused look */}
      <Ellipse cx="49" cy="54" rx="3" ry="3.5" fill="#374151" />
      <Ellipse cx="71" cy="54" rx="3" ry="3.5" fill="#374151" />
      <Circle cx="50" cy="53" r="1" fill="#FFF" />
      <Circle cx="72" cy="53" r="1" fill="#FFF" />
      {/* Concentrated mouth */}
      <Path d="M53 66 Q60 64 67 66" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Document stack */}
      <Rect x="74" y="52" width="24" height="30" rx="3" fill="#FFF" stroke="#D1D5DB" strokeWidth="1.5" />
      <Rect x="72" y="50" width="24" height="30" rx="3" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="1.5" />
      <Rect x="70" y="48" width="24" height="30" rx="3" fill="#FFF" stroke="#9CA3AF" strokeWidth="1.5" />
      {/* Lines on top document */}
      <Path d="M74 56 L90 56" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M74 61 L90 61" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M74 66 L85 66" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
      {/* Checkmark on doc */}
      <Path d="M74 72 L77 75 L84 68" stroke="#22C55E" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Arms holding document */}
      <Path d="M32 70 Q28 62 36 54" stroke="#FEF9C3" strokeWidth="7" fill="none" strokeLinecap="round" />
      <Path d="M88 70 Q84 60 70 54" stroke="#FEF9C3" strokeWidth="7" fill="none" strokeLinecap="round" />
    </Svg>
  );
}
