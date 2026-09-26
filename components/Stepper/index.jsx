import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

export const Stepper = ({ value, onChange, min, max, suffix = "" }) => {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, value <= min && styles.disabled]}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        accessibilityLabel="Diminuir"
      >
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <Text style={styles.value}>
        {value}
        {suffix}
      </Text>
      <Pressable
        style={[styles.button, value >= max && styles.disabled]}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        accessibilityLabel="Aumentar"
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "bold",
  },
  value: {
    color: colors.text,
    fontSize: fontSizes.md,
    minWidth: 64,
    textAlign: "center",
  },
});
