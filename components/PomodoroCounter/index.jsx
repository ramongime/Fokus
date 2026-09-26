import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "../../constants/theme";

// Mostra os focos do dia e quantos faltam para a pausa longa
export const PomodoroCounter = ({ count, longBreakInterval }) => {
  const filled =
    count > 0 && count % longBreakInterval === 0
      ? longBreakInterval
      : count % longBreakInterval;

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length: longBreakInterval }, (_, index) => (
          <View
            key={index}
            style={[styles.dot, index < filled && styles.dotFilled]}
          />
        ))}
      </View>
      <Text style={styles.text}>
        🍅 {count} {count === 1 ? "foco" : "focos"} hoje
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  text: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
});
