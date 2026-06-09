import Svg, { Circle, Ellipse, Path, Polygon, Rect } from "react-native-svg";

export default function CelebratingExpression({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Confetti */}
      <Rect x="12" y="20" width="6" height="6" rx="1" fill="#FCD34D" transform="rotate(20 12 20)" />
      <Rect x="100" y="18" width="5" height="5" rx="1" fill="#F87171" transform="rotate(-15 100 18)" />
      <Rect x="22" y="14" width="4" height="4" rx="1" fill="#60A5FA" transform="rotate(35 22 14)" />
      <Rect x="88" y="26" width="4" height="8" rx="2" fill="#34D399" transform="rotate(-20 88 26)" />
      <Circle cx="18" cy="35" r="3" fill="#A78BFA" />
      <Circle cx="102" cy="36" r="3" fill="#FCA5A5" />
      {/* Body */}
      <Ellipse cx="60" cy="88" rx="28" ry="20" fill="#FEF3C7" />
      {/* Head */}
      <Circle cx="60" cy="54" r="30" fill="#FEF9C3" />
      {/* Face highlight */}
      <Ellipse cx="52" cy="46" rx="7" ry="9" fill="#FEF3C7" opacity="0.6" />
      {/* Eyes — star eyes / excited */}
      <Path d="M51 50 L53 53 L50 55 L53 55 L51 58 L54 56 L56 59 L56 56 L59 55 L56 55 L58 52 L55 54 Z" fill="#374151" />
      <Path d="M61 50 L63 53 L60 55 L63 55 L61 58 L64 56 L66 59 L66 56 L69 55 L66 55 L68 52 L65 54 Z" fill="#374151" />
      {/* Huge smile with teeth */}
      <Path d="M47 64 Q60 76 73 64" stroke="#374151" strokeWidth="2.5" fill="#374151" />
      <Path d="M50 66 Q60 72 70 66" fill="#FFF" />
      {/* Cheeks */}
      <Ellipse cx="44" cy="64" rx="6" ry="3.5" fill="#FCA5A5" opacity="0.7" />
      <Ellipse cx="76" cy="64" rx="6" ry="3.5" fill="#FCA5A5" opacity="0.7" />
      {/* Both arms up in victory */}
      <Path d="M32 72 Q18 60 20 44" stroke="#FEF9C3" strokeWidth="8" fill="none" strokeLinecap="round" />
      <Path d="M88 72 Q102 60 100 44" stroke="#FEF9C3" strokeWidth="8" fill="none" strokeLinecap="round" />
      {/* Stars at fist tips */}
      <Circle cx="20" cy="42" r="5" fill="#FCD34D" />
      <Circle cx="100" cy="42" r="5" fill="#FCD34D" />
    </Svg>
  );
}

