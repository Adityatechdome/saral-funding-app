import Svg, { Circle, Ellipse, Path } from "react-native-svg";

export default function ThinkingExpression({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Body */}
      <Ellipse cx="60" cy="88" rx="28" ry="20" fill="#EDE9FE" />
      {/* Head */}
      <Circle cx="60" cy="54" r="30" fill="#FEF9C3" />
      {/* Face highlight */}
      <Ellipse cx="52" cy="46" rx="7" ry="9" fill="#FEF3C7" opacity="0.6" />
      {/* Eyes — one raised eyebrow */}
      <Ellipse cx="51" cy="53" rx="4" ry="4.5" fill="#374151" />
      <Ellipse cx="69" cy="53" rx="4" ry="4.5" fill="#374151" />
      <Circle cx="52" cy="52" r="1.5" fill="#FFF" />
      <Circle cx="70" cy="52" r="1.5" fill="#FFF" />
      {/* Raised eyebrow */}
      <Path d="M44 44 Q51 40 58 43" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M62 44 Q69 43 76 46" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Thinking mouth — slight frown / hmm */}
      <Path d="M52 65 Q60 63 68 65" stroke="#374151" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Hand on chin */}
      <Path d="M32 72 Q28 64 34 58" stroke="#FEF9C3" strokeWidth="7" fill="none" strokeLinecap="round" />
      <Ellipse cx="35" cy="58" rx="6" ry="4" fill="#FEF9C3" />
      {/* Other arm down */}
      <Path d="M88 72 Q90 80 86 86" stroke="#FEF9C3" strokeWidth="7" fill="none" strokeLinecap="round" />
      {/* Thought bubbles */}
      <Circle cx="96" cy="30" r="8" fill="#F3F4F6" opacity="0.9" />
      <Circle cx="104" cy="20" r="5" fill="#F3F4F6" opacity="0.7" />
      <Circle cx="109" cy="13" r="3" fill="#F3F4F6" opacity="0.5" />
      {/* Dots in bubble */}
      <Circle cx="92" cy="30" r="1.5" fill="#9CA3AF" />
      <Circle cx="96" cy="30" r="1.5" fill="#9CA3AF" />
      <Circle cx="100" cy="30" r="1.5" fill="#9CA3AF" />
    </Svg>
  );
}
