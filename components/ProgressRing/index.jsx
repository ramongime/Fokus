import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { colors } from "../../constants/theme";

// Anel fino que vai se completando conforme o ciclo avança.
// progress: 0 (início) a 1 (fim). O conteúdo (children) fica centralizado no anel.
export const ProgressRing = ({
  progress,
  size = 280,
  strokeWidth = 6,
  color = colors.primary,
  children,
}) => {
  const clamped = Math.min(1, Math.max(0, progress || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          // Começa no topo (12h) e anda no sentido horário
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
